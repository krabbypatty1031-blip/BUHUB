import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import type { NavigationContainerRef } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
import { notificationService } from '../api/services/notification.service';
import { useAuthStore } from '../store/authStore';
import { useNotificationStore } from '../store/notificationStore';
import type { MainTabParamList } from '../types/navigation';

const PUSH_REGISTRATION_CACHE_KEY = 'buhub-expo-push-registration';

type PushNavigationRef = NavigationContainerRef<MainTabParamList>;
type PushNavigationTarget =
  | { tab: 'ForumTab'; screen: 'PostDetail'; params: { postId: string; commentId?: string } }
  | { tab: 'FunctionsTab'; screen: 'PartnerDetail'; params: { id: string } }
  | { tab: 'FunctionsTab'; screen: 'ErrandDetail'; params: { id: string } }
  | { tab: 'FunctionsTab'; screen: 'SecondhandDetail'; params: { id: string } }
  | { tab: 'MessagesTab'; screen: 'NotifyLikes' }
  | { tab: 'MessagesTab'; screen: 'NotifyComments' }
  | { tab: 'MessagesTab'; screen: 'NotifyFollowers' }
  | { tab: 'MessagesTab'; screen: 'Chat'; params: { contactId: string; contactName: string; contactAvatar: string } }
  | { tab: 'MeTab'; screen: 'UserProfile'; params: { userName: string } };

let pendingPushNavigationTarget: PushNavigationTarget | null = null;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

type CachedPushRegistration = {
  userId: string;
  pushToken: string;
};

function decodePushSegment(value: string | undefined): string | undefined {
  if (!value) return undefined;
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function readPushDataString(data: Record<string, unknown>, key: string): string | undefined {
  const value = data[key];
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function buildPushNavigationTarget(data: Record<string, unknown>): PushNavigationTarget | null {
  const path = readPushDataString(data, 'path');
  if (!path) return null;

  const [rawRoot, rawId] = path.split('/').filter(Boolean);
  const root = decodePushSegment(rawRoot);
  const id = decodePushSegment(rawId);

  switch (root) {
    case 'post':
      return id
        ? {
            tab: 'ForumTab',
            screen: 'PostDetail',
            params: {
              postId: id,
              commentId: readPushDataString(data, 'commentId'),
            },
          }
        : null;
    case 'partner':
      return id ? { tab: 'FunctionsTab', screen: 'PartnerDetail', params: { id } } : null;
    case 'errand':
      return id ? { tab: 'FunctionsTab', screen: 'ErrandDetail', params: { id } } : null;
    case 'secondhand':
      return id ? { tab: 'FunctionsTab', screen: 'SecondhandDetail', params: { id } } : null;
    case 'profile':
      return id ? { tab: 'MeTab', screen: 'UserProfile', params: { userName: id } } : null;
    case 'notifications': {
      switch (id) {
        case 'likes':
          return { tab: 'MessagesTab', screen: 'NotifyLikes' };
        case 'comments':
          return { tab: 'MessagesTab', screen: 'NotifyComments' };
        case 'followers':
          return { tab: 'MessagesTab', screen: 'NotifyFollowers' };
        default:
          return null;
      }
    }
    case 'chat':
      return id
        ? {
            tab: 'MessagesTab',
            screen: 'Chat',
            params: {
              contactId: id,
              contactName: readPushDataString(data, 'contactName') || readPushDataString(data, 'senderName') || 'User',
              contactAvatar: readPushDataString(data, 'contactAvatar') ?? '',
            },
          }
        : null;
    default:
      return null;
  }
}

function navigateToPushTarget(navigationRef: PushNavigationRef, target: PushNavigationTarget) {
  switch (target.tab) {
    case 'ForumTab':
      navigationRef.navigate('ForumTab', {
        screen: target.screen,
        params: target.params,
      });
      return;
    case 'FunctionsTab':
      navigationRef.navigate('FunctionsTab', {
        screen: target.screen,
        params: target.params,
      });
      return;
    case 'MessagesTab':
      if (target.screen === 'Chat') {
        navigationRef.navigate('MessagesTab', {
          screen: 'Chat',
          params: target.params,
        });
        return;
      }
      navigationRef.navigate('MessagesTab', {
        screen: target.screen,
      });
      return;
    case 'MeTab':
      navigationRef.navigate('MeTab', {
        screen: target.screen,
        params: target.params,
      });
      return;
  }
}

function queuePushNavigationTarget(navigationRef: PushNavigationRef, data: Record<string, unknown>) {
  const target = buildPushNavigationTarget(data);
  if (!target) return false;

  if (navigationRef.isReady()) {
    navigateToPushTarget(navigationRef, target);
  } else {
    pendingPushNavigationTarget = target;
  }

  return true;
}

export function flushPendingPushNavigation(navigationRef: PushNavigationRef) {
  if (!pendingPushNavigationTarget || !navigationRef.isReady()) {
    return;
  }

  navigateToPushTarget(navigationRef, pendingPushNavigationTarget);
  pendingPushNavigationTarget = null;
}

function getProjectId(): string | undefined {
  const easProjectId = (Constants.expoConfig?.extra?.eas?.projectId as string | undefined) ?? undefined;
  if (easProjectId) return easProjectId;

  const legacyEasProjectId = (Constants as { easConfig?: { projectId?: string } }).easConfig?.projectId;
  return legacyEasProjectId;
}

async function ensurePushPermissions() {
  const existing = await Notifications.getPermissionsAsync();
  if (existing.status === 'granted') {
    return true;
  }

  const requested = await Notifications.requestPermissionsAsync();
  return requested.status === 'granted';
}

async function getExpoPushToken() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'General',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#6750A4',
    });
  }

  const hasPermission = await ensurePushPermissions();
  if (!hasPermission) {
    return null;
  }

  const projectId = getProjectId();
  if (!projectId) {
    throw new Error('Missing Expo EAS projectId for push registration');
  }

  const token = await Notifications.getExpoPushTokenAsync({ projectId });
  return token.data ?? null;
}

export function usePushRegistration(navigationRef: PushNavigationRef) {
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const hasHydrated = useAuthStore((s) => s._hasHydrated);
  const userId = useAuthStore((s) => s.user?.id ?? null);
  const queryClient = useQueryClient();
  const inFlightRef = useRef(false);
  const handledNotificationIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!hasHydrated || !isLoggedIn || !userId) {
      return;
    }

    if (Platform.OS !== 'ios' && Platform.OS !== 'android') {
      return;
    }

    let cancelled = false;

    const registerPushToken = async () => {
      if (inFlightRef.current) {
        return;
      }

      inFlightRef.current = true;
      try {
        const pushToken = await getExpoPushToken();
        if (!pushToken || cancelled) {
          return;
        }

        const cachedRaw = await AsyncStorage.getItem(PUSH_REGISTRATION_CACHE_KEY);
        const cached = cachedRaw ? (JSON.parse(cachedRaw) as CachedPushRegistration) : null;
        if (cached?.userId === userId && cached.pushToken === pushToken) {
          return;
        }

        await notificationService.registerDevice(
          pushToken,
          Platform.OS === 'ios' ? 'ios' : 'android'
        );

        await AsyncStorage.setItem(
          PUSH_REGISTRATION_CACHE_KEY,
          JSON.stringify({
            userId,
            pushToken,
          } satisfies CachedPushRegistration)
        );
      } catch (error) {
        if (__DEV__) {
          console.log('[Push] registration skipped', error);
        }
      } finally {
        inFlightRef.current = false;
      }
    };

    void registerPushToken();

    return () => {
      cancelled = true;
    };
  }, [hasHydrated, isLoggedIn, userId]);

  useEffect(() => {
    if (!hasHydrated || !isLoggedIn) {
      return;
    }

    if (Platform.OS !== 'ios' && Platform.OS !== 'android') {
      return;
    }

    let active = true;

    const handleNotificationResponse = (response: Notifications.NotificationResponse | null) => {
      if (!response) return;

      const notificationId = response.notification.request.identifier;
      if (handledNotificationIdsRef.current.has(notificationId)) {
        return;
      }

      const data = response.notification.request.content.data;
      if (!data || Array.isArray(data)) {
        return;
      }

      handledNotificationIdsRef.current.add(notificationId);
      queuePushNavigationTarget(navigationRef, data as Record<string, unknown>);
    };

    void Notifications.getLastNotificationResponseAsync().then((response) => {
      if (active) {
        handleNotificationResponse(response);
      }
    });

    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      if (!active) return;
      handleNotificationResponse(response);
    });

    return () => {
      active = false;
      subscription.remove();
    };
  }, [hasHydrated, isLoggedIn, navigationRef]);

  useEffect(() => {
    if (!hasHydrated || !isLoggedIn) {
      return;
    }

    flushPendingPushNavigation(navigationRef);
  }, [hasHydrated, isLoggedIn, navigationRef]);

  // #4: Refresh unread count immediately when a push arrives in the foreground
  useEffect(() => {
    if (!hasHydrated || !isLoggedIn) {
      return;
    }

    if (Platform.OS !== 'ios' && Platform.OS !== 'android') {
      return;
    }

    const subscription = Notifications.addNotificationReceivedListener((notification) => {
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unreadCount'] });

      // Immediately increment the badge so the UI updates without waiting for refetch
      const data = notification.request.content.data as Record<string, unknown> | undefined;
      const type = typeof data?.type === 'string' ? data.type : '';
      const store = useNotificationStore.getState();
      switch (type) {
        case 'like':
          store.setUnreadLikes(store.unreadLikes + 1);
          break;
        case 'follow':
          store.setUnreadFollowers(store.unreadFollowers + 1);
          break;
        case 'comment':
        case 'reply':
        case 'mention':
          store.setUnreadComments(store.unreadComments + 1);
          break;
      }
    });

    return () => {
      subscription.remove();
    };
  }, [hasHydrated, isLoggedIn, queryClient]);
}
