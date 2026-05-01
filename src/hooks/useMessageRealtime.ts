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
import { useNotificationStore } from '../store/notificationStore';
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

// Realtime constants
const RECONNECT_BASE_DELAY_MS = 500;
const RECONNECT_MAX_DELAY_MS = 5000;
const PRESENCE_REFRESH_MS = 20000;

// Presence-aware push suppression (TICKET-017). Module-scoped so screens can
// declare focus without prop-drilling the WebSocket. The latest open socket
// is registered on connect / cleared on close, so setPresenceFocus() can
// always reach it. Server-side TTL is 30s, so we refresh every 20s.
let currentSocket: WebSocket | null = null;
let currentFocusKey: string | null = null;
let focusRefreshTimer: ReturnType<typeof setInterval> | null = null;

function sendFocusFrame(key: string | null) {
  const ws = currentSocket;
  if (!ws || ws.readyState !== WebSocket.OPEN) return;
  try {
    ws.send(JSON.stringify({ action: 'focus', key }));
  } catch {
    // Ignore send failures; the next open replay will recover.
  }
}

export function setPresenceFocus(key: string | null) {
  currentFocusKey = key;
  if (focusRefreshTimer) {
    clearInterval(focusRefreshTimer);
    focusRefreshTimer = null;
  }
  sendFocusFrame(key);
  if (key) {
    focusRefreshTimer = setInterval(() => sendFocusFrame(key), PRESENCE_REFRESH_MS);
  }
}

type RealtimeEvent = {
  type:
    | 'message:new'
    | 'message:read'
    | 'message:recalled'
    | 'typing:update'
    | 'notification:new'
    | 'post:new';
  fromUserId?: string;
  isTyping?: boolean;
  conversationUserId?: string;
  messageId?: string;
  readerUserId?: string;
  message?: PersistedDirectMessage;
  conversation?: ConversationSummary | null;
  notificationType?: 'like' | 'follow' | 'comment';
  // post:new fields (global broadcast for new forum posts)
  postId?: string;
  authorId?: string;
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
  const setLastEventTimestamp = useMessageRealtimeStore((s) => s.setLastEventTimestamp);
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

      // Global new-post broadcast: skip self-authored events (we already
      // optimistically rendered our own post). For posts from other users,
      // invalidate the forum / user-posts caches so the new entry slides
      // in without waiting for the 15s polling tick. refetchType:'active'
      // means only mounted feeds refetch — when the user isn't on Forum,
      // the cache just gets marked stale for the next mount.
      const newPostEvents = events.filter((event) => event.type === 'post:new');
      if (newPostEvents.length > 0) {
        const fromOthers = newPostEvents.filter(
          (event) => event.authorId && event.authorId !== currentUserId
        );
        if (fromOthers.length > 0) {
          queryClient.invalidateQueries({ queryKey: ['posts'], refetchType: 'active' });
          queryClient.invalidateQueries({ queryKey: ['userPosts'], refetchType: 'active' });
        }
      }

      if (messageEvents.length > 0 || notificationEvents.length > 0) {
        queryClient.invalidateQueries({ queryKey: ['notifications', 'unreadCount'] });
      }

      // Optimistically bump notification counters in real time so the tab
      // badge / chatscreen card badges update instantly. The server-authoritative
      // refetch above will reconcile the values.
      if (notificationEvents.length > 0) {
        const store = useNotificationStore.getState();
        let likeDelta = 0;
        let followDelta = 0;
        let commentDelta = 0;
        for (const event of notificationEvents) {
          switch (event.notificationType) {
            case 'like':
              likeDelta += 1;
              break;
            case 'follow':
              followDelta += 1;
              break;
            case 'comment':
              commentDelta += 1;
              break;
          }
        }
        if (likeDelta > 0) store.setUnreadLikes(store.unreadLikes + likeDelta);
        if (followDelta > 0) store.setUnreadFollowers(store.unreadFollowers + followDelta);
        if (commentDelta > 0) store.setUnreadComments(store.unreadComments + commentDelta);

        // Refresh post-content caches so like/comment counts update live on
        // ForumScreen, PostDetailScreen, MeScreen, profile pages, and search.
        // refetchType defaults to 'active' — only mounted queries refetch,
        // so this is cheap when the user isn't on those screens.
        if (likeDelta > 0 || commentDelta > 0) {
          queryClient.invalidateQueries({ queryKey: ['posts'] });
          queryClient.invalidateQueries({ queryKey: ['userPosts'] });
          queryClient.invalidateQueries({ queryKey: ['post'] });
          queryClient.invalidateQueries({ queryKey: ['myContent'] });
          queryClient.invalidateQueries({ queryKey: ['search'] });
          if (commentDelta > 0) {
            queryClient.invalidateQueries({ queryKey: ['comments'] });
          }
        }
      }

      // Optimistically bump unreadMessages on incoming peer messages so the tab
      // badge updates instantly even when MessagesScreen is not mounted.
      if (messageEvents.length > 0) {
        const incomingPeerMessages = messageEvents.filter(
          (event) =>
            event.type === 'message:new' &&
            (!currentUserId || event.fromUserId !== currentUserId)
        ).length;
        if (incomingPeerMessages > 0) {
          const store = useNotificationStore.getState();
          store.setUnreadMessages(store.unreadMessages + incomingPeerMessages);
        }
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
            queryClient.invalidateQueries({ queryKey: ['chat-can-send', contactId] });
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
                  // Incoming message from the other party — append in-place
                  // ONLY if a chat cache already exists for this contact.
                  // Otherwise leave it empty and let the next observation
                  // fetch fresh history from the server. Skipping the write
                  // avoids overwriting the persisted full archive with a
                  // single-message snapshot when current is undefined
                  // (e.g. unobserved language variant or in-flight first fetch).
                  patchChatQueries(queryClient, currentUserId, contactId, (current, language) =>
                    Array.isArray(current) && current.length > 0
                      ? appendMessageToHistory(current, nextMessage, language)
                      : undefined
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
      setLastEventTimestamp(sinceRef.current);
    };

    const connectSocket = async () => {
      if (canceled) return;

      const token = useAuthStore.getState().token;
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
          currentSocket = ws;
          if (currentFocusKey) sendFocusFrame(currentFocusKey);
          const wasReconnect = reconnectAttemptRef.current > 0;
          reconnectAttemptRef.current = 0;
          recordMessageMetric('message_ws_connected');
          if (wasReconnect) {
            // After reconnect, refresh the active chat unless it still has a
            // local optimistic send that the server has not acknowledged yet.
            const activeChatContactId = useMessageStore.getState().activeChatContactId;
            if (
              activeChatContactId &&
              !useMessageRealtimeStore.getState().hasPendingForContact(activeChatContactId)
            ) {
              queryClient.invalidateQueries({
                queryKey: ['chat', activeChatContactId],
                refetchType: 'active',
              });
            }
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
          if (currentSocket === ws) {
            currentSocket = null;
          }
          if (canceled) return;
          // Auth-related close codes: do not reconnect, trigger logout
          const AUTH_CLOSE_CODES = [4001, 4003, 4010, 1008];
          if (AUTH_CLOSE_CODES.includes(event.code)) {
            recordMessageMetric('message_ws_auth_rejected', { code: event.code });
            // Let authStore handle the logout
            useAuthStore.getState().logout();
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
        if (
          activeChatContactId &&
          !useMessageRealtimeStore.getState().hasPendingForContact(activeChatContactId)
        ) {
          queryClient.invalidateQueries({
            queryKey: ['chat', activeChatContactId],
            refetchType: 'active',
          });
          queryClient.invalidateQueries({
            queryKey: ['chat-can-send', activeChatContactId],
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
  }, [handleIncomingMessage, hasHydrated, isLoggedIn, queryClient, setLastEventTimestamp, setTyping]);
}
