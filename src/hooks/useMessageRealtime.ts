import { useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQueryClient } from '@tanstack/react-query';
import { API_BASE } from '../api/client';
import { useAuthStore } from '../store/authStore';
import { useMessageStore } from '../store/messageStore';
import { useMessageRealtimeStore } from '../store/messageRealtimeStore';

const TOKEN_KEY = 'buhub-token';
const RECONNECT_BASE_DELAY_MS = 1000;
const RECONNECT_MAX_DELAY_MS = 10000;

type RealtimeEvent = {
  type: 'message:new' | 'message:read' | 'message:recalled' | 'typing:update' | 'notification:new';
  fromUserId?: string;
  isTyping?: boolean;
  conversationUserId?: string;
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
  const setTyping = useMessageRealtimeStore((s) => s.setTyping);
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
      reconnectTimerRef.current = setTimeout(() => {
        void connectSocket();
      }, delayMs);
    };

    const applyEvents = (events: RealtimeEvent[], now?: number) => {
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
        messageEvents.forEach((event) => {
          if (event.type === 'message:new' && event.conversationUserId) {
            handleIncomingMessage(event.conversationUserId);
          }
        });
        queryClient.invalidateQueries({ queryKey: ['contacts'] });
        const conversationIds = new Set(
          messageEvents
            .map((event) => event.conversationUserId)
            .filter((id): id is string => typeof id === 'string' && id.length > 0)
        );
        conversationIds.forEach((id) => {
          queryClient.invalidateQueries({ queryKey: ['chat', id] });
          const hasIncomingMessage = messageEvents.some(
            (event) => event.type === 'message:new' && event.conversationUserId === id
          );
          if (hasIncomingMessage) {
            setTyping(id, false);
          }
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
        const ws = new WebSocket(wsUrl);
        socketRef.current = ws;

        ws.onopen = () => {
          if (socketRef.current !== ws) return;
          reconnectAttemptRef.current = 0;
        };

        ws.onmessage = (event) => {
          if (socketRef.current !== ws) return;
          const payload = parsePayload(event.data);
          if (!payload) return;
          const events = Array.isArray(payload.events) ? payload.events : [];
          applyEvents(events, payload.now);
        };

        ws.onerror = () => {
          if (socketRef.current !== ws) return;
          try {
            ws.close();
          } catch {
            // Ignore close failures on broken sockets.
          }
        };

        ws.onclose = () => {
          if (socketRef.current === ws) {
            socketRef.current = null;
          }
          if (!canceled) {
            scheduleReconnect();
          }
        };
      } catch {
        scheduleReconnect();
      }
    };

    void connectSocket();

    return () => {
      canceled = true;
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
