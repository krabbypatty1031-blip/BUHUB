import { useEffect, useRef, useCallback } from 'react';
import { AppState } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';
import { useMessageRealtimeStore } from '../store/messageRealtimeStore';
import { messageService } from '../api/services/message.service';
import type { MessageEvent } from '../api/services/message.service';
import { appendMessageToHistory, markMessageAsReadInHistory } from '../utils/messageCache';
import { normalizeLanguage } from '../i18n';
import type { ChatHistory } from '../types';

const RETRY_DELAY_MS = 3000;
const MAX_RETRY_DELAY_MS = 30000;
const FALLBACK_POLL_MS = 30000; // Fallback polling interval if long-poll fails repeatedly

/**
 * Long-poll hook for real-time message updates.
 * Uses a single loop controlled by a generation counter to prevent duplicate loops.
 * On new events: invalidates React Query cache, updates typing state.
 * On error: retries with exponential backoff, falls back to interval polling.
 * Pauses when app backgrounds, resumes on foreground.
 */
export function useMessageUpdates(contactId: string, enabled: boolean) {
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id);
  const language = useAuthStore((s) => s.language);
  const normalizedLanguage = normalizeLanguage(language) ?? 'tc';
  const abortRef = useRef<AbortController | null>(null);
  const retryCountRef = useRef(0);
  const sinceRef = useRef(Date.now());
  const isMountedRef = useRef(true);
  // Generation counter: each new loop gets a unique generation.
  // If a loop's generation doesn't match the current, it must exit.
  const generationRef = useRef(0);
  const fallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Use refs for values that change between renders so the running loop always reads the latest
  const contactIdRef = useRef(contactId);
  contactIdRef.current = contactId;
  const normalizedLanguageRef = useRef(normalizedLanguage);
  normalizedLanguageRef.current = normalizedLanguage;
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  const getResumeSince = useCallback(() => {
    const lastEventTimestamp = useMessageRealtimeStore.getState().lastEventTimestamp;
    const safeTimestamp =
      typeof lastEventTimestamp === 'number' && Number.isFinite(lastEventTimestamp)
        ? lastEventTimestamp
        : Date.now();
    return Math.max(0, safeTimestamp - 1000);
  }, []);

  const processEvents = useCallback((events: MessageEvent[]) => {
    if (!events || events.length === 0) return;

    const store = useMessageRealtimeStore.getState();
    const cId = contactIdRef.current;
    const lang = normalizedLanguageRef.current;
    let latestEventTimestamp = store.lastEventTimestamp;

    for (const event of events) {
      latestEventTimestamp = Math.max(latestEventTimestamp, Number(event.timestamp || 0));
      if (event.type === 'typing' && event.contactId) {
        store.setTyping(event.contactId, event.isTyping ?? false, event.timestamp);
      } else if (event.type === 'message' && event.message) {
        const msgId = event.message.id || (event.message as { clientKey?: string }).clientKey;
        if (msgId && event.contactId) {
          const pending = store.pendingClientKeysByContact[event.contactId];
          if (pending?.has(msgId)) continue;
        }
        queryClient.invalidateQueries({ queryKey: ['contacts'] });
        if (event.contactId === cId) {
          // Insert message directly into cache instead of full refetch to avoid flicker
          queryClient.setQueryData<ChatHistory[]>(
            ['chat', cId, lang],
            (old) => appendMessageToHistory(old, event.message!, lang)
          );
          queryClient.invalidateQueries({ queryKey: ['chat-can-send', cId] });
        }
      } else if (event.type === 'read') {
        // Update read status directly in cache — no network refetch needed
        if (event.contactId === cId) {
          queryClient.setQueryData<ChatHistory[]>(
            ['chat', cId, lang],
            (old) => markMessageAsReadInHistory(old, event.messageId)
          );
        }
      } else if (event.type === 'recall') {
        // Recall requires full data refresh to get updated message content
        if (event.contactId === cId) {
          queryClient.invalidateQueries({ queryKey: ['chat', cId, lang] });
        }
      }
    }
    store.setLastEventTimestamp(latestEventTimestamp);
  }, [queryClient]);

  // Start a poll loop with a specific generation.
  // The loop exits if the generation doesn't match (another loop superseded it).
  const startPoll = useCallback((generation: number) => {
    const poll = async () => {
      while (isMountedRef.current && enabledRef.current && generationRef.current === generation) {
        const controller = new AbortController();
        abortRef.current = controller;

        try {
          const result = await messageService.getUpdates(sinceRef.current, controller.signal);
          if (!isMountedRef.current || generationRef.current !== generation) break;

          const latestEventTimestamp = result.events.reduce(
            (max: number, event: MessageEvent) => Math.max(max, Number(event.timestamp || 0)),
            0
          );
          const nextSince = Math.max(
            sinceRef.current,
            Number(result.now || 0),
            latestEventTimestamp
          );
          sinceRef.current = nextSince;
          useMessageRealtimeStore.getState().setLastEventTimestamp(nextSince);
          retryCountRef.current = 0;
          processEvents(result.events);
        } catch (error: unknown) {
          if (!isMountedRef.current || generationRef.current !== generation) break;
          const errName = (error as { name?: string })?.name;
          if (errName === 'AbortError' || errName === 'CanceledError') break;

          retryCountRef.current++;

          // After 3 consecutive failures, switch to fallback interval polling
          if (retryCountRef.current >= 3) {
            // Fallback: invalidate chat query on a timer instead of long-poll
            if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current);
            fallbackTimerRef.current = setTimeout(() => {
              if (isMountedRef.current && generationRef.current === generation) {
                queryClient.invalidateQueries({ queryKey: ['chat', contactIdRef.current, normalizedLanguageRef.current] });
                // Retry the long-poll loop
                retryCountRef.current = 0;
                void poll();
              }
            }, FALLBACK_POLL_MS);
            return; // Exit the while loop; fallback timer will restart
          }

          // Exponential backoff with jitter to prevent thundering herd on server restart
          const baseDelay = Math.min(
            RETRY_DELAY_MS * Math.pow(2, retryCountRef.current - 1),
            MAX_RETRY_DELAY_MS
          );
          const delay = baseDelay * (0.5 + Math.random() * 0.5);
          // Cancellable delay: check generation after waking
          await new Promise<void>((resolve) => {
            const timer = setTimeout(resolve, delay);
            // Store timer so it can be conceptually cancelled via generation check
            void timer;
          });
          // After delay, re-check generation before continuing
          if (generationRef.current !== generation) break;
        }
      }
    };

    void poll();
  }, [processEvents, queryClient]);

  // Restart loop: bump generation (kills any existing loop) and start new one
  const restartLoop = useCallback(() => {
    generationRef.current++;
    abortRef.current?.abort();
    if (fallbackTimerRef.current) {
      clearTimeout(fallbackTimerRef.current);
      fallbackTimerRef.current = null;
    }
    sinceRef.current = getResumeSince();
    retryCountRef.current = 0;
    startPoll(generationRef.current);
  }, [getResumeSince, startPoll]);

  useEffect(() => {
    if (!enabled || !userId || !contactId) return;

    isMountedRef.current = true;
    restartLoop();

    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active' && enabledRef.current && isMountedRef.current) {
        // Delay 300ms to let network radio wake up after background
        setTimeout(() => {
          if (isMountedRef.current && enabledRef.current) restartLoop();
        }, 300);
      } else if (state === 'background') {
        // Kill current loop
        generationRef.current++;
        abortRef.current?.abort();
        if (fallbackTimerRef.current) {
          clearTimeout(fallbackTimerRef.current);
          fallbackTimerRef.current = null;
        }
      }
    });

    return () => {
      isMountedRef.current = false;
      generationRef.current++;
      abortRef.current?.abort();
      if (fallbackTimerRef.current) {
        clearTimeout(fallbackTimerRef.current);
        fallbackTimerRef.current = null;
      }
      subscription.remove();
    };
  }, [contactId, enabled, userId, restartLoop]);
}
