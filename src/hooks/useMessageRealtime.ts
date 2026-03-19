import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQueryClient } from '@tanstack/react-query';
import { API_BASE } from '../api/client';
import {
  buildChatMessageFromPersistedMessage,
  mapConversationSummaryToContact,
  type ConversationSummary,
  type PersistedDirectMessage,
} from '../api/services/message.service';
import { useAuthStore } from '../store/authStore';
import { useMessageStore } from '../store/messageStore';
import { useMessageRealtimeStore } from '../store/messageRealtimeStore';
import {
  appendMessageToHistory,
  markMessageAsReadInHistory,
  markMessageAsRecalledInHistory,
  replaceMessageInHistory,
  patchChatQueries,
  patchContactsQueries,
  upsertContact,
} from '../utils/messageCache';
import { recordMessageMetric } from '../utils/messageMetrics';

const TOKEN_KEY = 'buhub-token';
const RECONNECT_BASE_DELAY_MS = 500;
const RECONNECT_MAX_DELAY_MS = 5000;

type RealtimeEvent = {
  type: 'message:new' | 'message:read' | 'message:recalled' | 'typing:update' | 'notification:new';
  fromUserId?: string;
  isTyping?: boolean;
  conversationUserId?: string;
  messageId?: string;
  readerUserId?: string;
  message?: PersistedDirectMessage;
  conversation?: ConversationSummary | null;
  notificationType?: 'like' | 'follow' | 'comment';
  createdAt?: number;
};

type RealtimePayload = {
  events?: RealtimeEvent[];
  now?: number;
};

function buildRealtimeWsUrl(token: string, since: number) {
  const origin = API_BASE.replace(/\/api\/?$/i, '');
  const wsOrigin = origin.replace(/^http/i, 'ws');
  const params = new URLSearchParams({
    token,
    since: String(since),
  });
  return `${wsOrigin}/ws/messages?${params.toString()}`;
}

function parsePayload(raw: unknown): RealtimePayload | null {
  if (typeof raw !== 'string') return null;
  try {
    const parsed = JSON.parse(raw) as RealtimePayload;
    return parsed ?? null;
  } catch {
    return null;
  }
}

export function useMessageRealtime() {
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const hasHydrated = useAuthStore((s) => s._hasHydrated);
  const queryClient = useQueryClient();
  const setTyping = useMessageRealtimeStore((s: any) => s.setTyping);
  const handleIncomingMessage = useMessageStore((s) => s.handleIncomingMessage);
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptRef = useRef(0);
  const sinceRef = useRef(Date.now() - 1000);

  useEffect(() => {
    if (!hasHydrated || !isLoggedIn) return;

    let canceled = false;

    const clearReconnectTimer = () => {
      if (!reconnectTimerRef.current) return;
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    };

    const scheduleReconnect = () => {
      if (canceled) return;
      clearReconnectTimer();
      const delayMs = Math.min(
        RECONNECT_MAX_DELAY_MS,
        RECONNECT_BASE_DELAY_MS * Math.max(1, 2 ** reconnectAttemptRef.current)
      );
      reconnectAttemptRef.current += 1;
      recordMessageMetric('message_ws_reconnect_scheduled', { delayMs, attempt: reconnectAttemptRef.current });
      reconnectTimerRef.current = setTimeout(() => {
        void connectSocket();
      }, delayMs);
    };

    const applyEvents = (events: RealtimeEvent[], now?: number) => {
      const currentUserId = useAuthStore.getState().user?.id;

      if (events.length > 0) {
        events.forEach((event) => {
          if (event.type !== 'typing:update') return;
          const contactId = event.conversationUserId;
          if (!contactId) return;
          setTyping(contactId, Boolean(event.isTyping), Number(event.createdAt || Date.now()));
        });
      }

      const messageEvents = events.filter(
        (event) =>
          event.type === 'message:new' ||
          event.type === 'message:read' ||
          event.type === 'message:recalled'
      );
      const notificationEvents = events.filter((event) => event.type === 'notification:new');

      if (messageEvents.length > 0 || notificationEvents.length > 0) {
        queryClient.invalidateQueries({ queryKey: ['notifications', 'unreadCount'] });
      }

      if (messageEvents.length > 0) {
        const activeChatContactId = useMessageStore.getState().activeChatContactId;
        messageEvents.forEach((event) => {
          if (event.type === 'message:new' && event.conversationUserId) {
            handleIncomingMessage(event.conversationUserId);
          }
        });

        messageEvents.forEach((event) => {
          const contactId = event.conversationUserId;
          if (!contactId) return;

          if (event.conversation) {
            patchContactsQueries(queryClient, currentUserId, (current) =>
              upsertContact(current, mapConversationSummaryToContact(event.conversation!))
            );
          }

          if (event.type === 'message:new') {
            if (event.message && currentUserId) {
              const nextMessage = buildChatMessageFromPersistedMessage(event.message, currentUserId);
              if (nextMessage) {
                const isSenderEcho = event.fromUserId === currentUserId;
                if (isSenderEcho) {
                  // If we have local pending sends for this contact, prefer
                  // to avoid appending the server echo (it would duplicate the
                  // local optimistic UI). If server provides a clientKey, try
                  // to replace by that key; otherwise skip append so the
                  // local pending flow can resolve and reconcile the cache.
                  const hasPending = useMessageRealtimeStore.getState().hasPendingForContact(contactId);
                  const serverClientKey = (event.message && ((event.message as any).clientKey as string | undefined)) || undefined;
                  if (hasPending) {
                    if (serverClientKey) {
                      patchChatQueries(queryClient, currentUserId, contactId, (current, language) =>
                        replaceMessageInHistory(current, serverClientKey, nextMessage) ?? appendMessageToHistory(current, nextMessage, language)
                      );
                    } else {
                      // Skip append when a local pending send exists to avoid
                      // a brief duplicate flash; the local flow will resolve
                      // and update cache when server response arrives.
                    }
                  } else {
                    // No local pending — safe to append server echo normally
                    patchChatQueries(queryClient, currentUserId, contactId, (current, language) =>
                      appendMessageToHistory(current, nextMessage, language)
                    );
                  }
                } else {
                  // Incoming message from the other party — always append
                  patchChatQueries(queryClient, currentUserId, contactId, (current, language) =>
                    appendMessageToHistory(current, nextMessage, language)
                  );
                }
              }
            } else {
              queryClient.invalidateQueries({
                queryKey: ['chat', contactId],
                refetchType: contactId === activeChatContactId ? 'active' : 'inactive',
              });
            }
          }

          if (event.type === 'message:read') {
            patchChatQueries(queryClient, currentUserId, contactId, (current) =>
              markMessageAsReadInHistory(current, event.messageId)
            );
          }

          if (event.type === 'message:recalled' && event.messageId) {
            patchChatQueries(queryClient, currentUserId, contactId, (current) =>
              markMessageAsRecalledInHistory(current, event.messageId!)
            );
          }
        });

        const conversationIds = new Set(
          messageEvents
            .map((event) => event.conversationUserId)
            .filter((id): id is string => typeof id === 'string' && id.length > 0)
        );
        conversationIds.forEach((id) => {
          const eventsForConversation = messageEvents.filter((event) => event.conversationUserId === id);
          const hasIncomingPeerMessage = eventsForConversation.some(
            (event) =>
              event.type === 'message:new' &&
              (!event.fromUserId || !currentUserId || event.fromUserId !== currentUserId)
          );
          const shouldRefetchConversation = eventsForConversation.some(
            (event) =>
              (event.type === 'message:new' && !event.message) ||
              (event.type === 'message:recalled' && !event.messageId)
          );
          if (shouldRefetchConversation) {
            queryClient.invalidateQueries({
              queryKey: ['chat', id],
              refetchType: id === activeChatContactId || hasIncomingPeerMessage ? 'active' : 'inactive',
            });
          }
          if (hasIncomingPeerMessage) {
            setTyping(id, false);
          }
        });
        recordMessageMetric('message_realtime_events_applied', {
          count: messageEvents.length,
          conversations: conversationIds.size,
        });
      }

      const maxEventTs = events.reduce(
        (max, event) => Math.max(max, Number(event.createdAt || 0)),
        0
      );
      sinceRef.current = Math.max(
        sinceRef.current,
        Number(now || 0),
        maxEventTs,
        Date.now() - 1000
      );
    };

    const connectSocket = async () => {
      if (canceled) return;

      const token = await AsyncStorage.getItem(TOKEN_KEY);
      if (!token) {
        scheduleReconnect();
        return;
      }

      try {
        const wsUrl = buildRealtimeWsUrl(token, sinceRef.current);
        if (__DEV__) {
          console.log('[WS] Connecting to:', wsUrl);
        }
        const ws = new WebSocket(wsUrl);
        socketRef.current = ws;

        ws.onopen = () => {
          if (socketRef.current !== ws) return;
          const wasReconnect = reconnectAttemptRef.current > 0;
          reconnectAttemptRef.current = 0;
          recordMessageMetric('message_ws_connected');
          if (wasReconnect) {
            // After reconnect, refresh all active chats and contacts to catch missed messages
            queryClient.invalidateQueries({
              queryKey: ['chat'],
              refetchType: 'active',
            });
            queryClient.invalidateQueries({
              queryKey: ['contacts'],
              refetchType: 'active',
            });
          }
        };

        ws.onmessage = (event) => {
          if (socketRef.current !== ws) return;
          const payload = parsePayload(event.data);
          if (!payload) return;
          const events = Array.isArray(payload.events) ? payload.events : [];
          applyEvents(events, payload.now);
        };

        ws.onerror = (error) => {
          if (socketRef.current !== ws) return;
          if (__DEV__) {
            console.log('[WS] Error:', error);
          }
          try {
            ws.close();
          } catch {
            // Ignore close failures on broken sockets.
          }
        };

        ws.onclose = (event) => {
          if (__DEV__) {
            console.log('[WS] Closed:', event.code, event.reason);
          }
          if (socketRef.current === ws) {
            socketRef.current = null;
          }
          if (canceled) return;
          // Auth-related close codes: do not reconnect, trigger logout
          const AUTH_CLOSE_CODES = [4001, 4003, 4010, 1008];
          if (AUTH_CLOSE_CODES.includes(event.code)) {
            recordMessageMetric('message_ws_auth_rejected', { code: event.code });
            // Clear stale token and let authStore handle re-auth
            void AsyncStorage.removeItem(TOKEN_KEY);
            return;
          }
          scheduleReconnect();
        };
      } catch {
        recordMessageMetric('message_ws_connect_failed');
        scheduleReconnect();
      }
    };

    void connectSocket();

    // When the app returns from background, reconnect immediately if socket is dead
    const appStateSubscription = AppState.addEventListener('change', (nextState) => {
      if (canceled) return;
      if (nextState === 'active') {
        const ws = socketRef.current;
        if (!ws || ws.readyState === WebSocket.CLOSED || ws.readyState === WebSocket.CLOSING) {
          socketRef.current = null;
          clearReconnectTimer();
          reconnectAttemptRef.current = 0;
          void connectSocket();
        }
        // Refresh active queries on foreground to catch missed messages
        queryClient.invalidateQueries({ queryKey: ['contacts'], refetchType: 'active' });
        const activeChatContactId = useMessageStore.getState().activeChatContactId;
        if (activeChatContactId) {
          queryClient.invalidateQueries({
            queryKey: ['chat', activeChatContactId],
            refetchType: 'active',
          });
        }
      }
    });

    return () => {
      canceled = true;
      appStateSubscription.remove();
      clearReconnectTimer();
      reconnectAttemptRef.current = 0;
      const ws = socketRef.current;
      socketRef.current = null;
      if (ws) {
        try {
          ws.close();
        } catch {
          // Ignore cleanup close failures.
        }
      }
    };
  }, [handleIncomingMessage, hasHydrated, isLoggedIn, queryClient, setTyping]);
}
