import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { CommonActions } from '@react-navigation/native';
import type { NavigationState, PartialState, Route } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { MainTabParamList } from './types';
import { colors } from '../theme';
import { layout } from '../theme/spacing';
import { TabHomeIcon, TabCampusIcon, TabMessagesIcon, TabMeIcon } from '../components/common/TabBarIcons';
import { TabBarAnimationProvider, hideTabBar, showTabBar } from '../hooks/TabBarAnimationContext';
import AnimatedTabBar from '../components/common/AnimatedTabBar';
import { useUnreadCount } from '../hooks/useNotifications';
import { useNotificationStore } from '../store/notificationStore';
import { useAuthStore } from '../store/authStore';
import { useMessageRealtime } from '../hooks/useMessageRealtime';
import { usePresenceHeartbeat } from '../hooks/usePresenceHeartbeat';
import { canPublishCommunityContent } from '../utils/publishPermission';
import { promptHkbuVerification } from '../utils/hkbuPrompt';
import { useTranslation } from 'react-i18next';

import ForumStackNavigator from './ForumStackNavigator';
import FunctionsStackNavigator from './FunctionsStackNavigator';
import MessagesStackNavigator from './MessagesStackNavigator';
import MeStackNavigator from './MeStackNavigator';

const Tab = createBottomTabNavigator<MainTabParamList>();
const TAB_ROOT_ROUTES = new Set(['ForumHome', 'FunctionsHub', 'MessagesList', 'MeHome']);

type NavigationStateLike = NavigationState | PartialState<NavigationState>;
type RouteWithState = Route<string> & { state?: NavigationStateLike };

function getFocusedLeafRouteName(route: { state?: NavigationStateLike } | undefined): string | undefined {
  let state = route?.state;
  while (state?.routes?.length) {
    const current = state.routes[state.index ?? 0] as RouteWithState | undefined;
    if (!current) return undefined;
    if (!current.state) return current.name;
    state = current.state;
  }
  return undefined;
}

export default function MainTabNavigator() {
  const insets = useSafeAreaInsets();
  const hiddenTabBarOffset = layout.bottomNavHeight + insets.bottom;
  const { t } = useTranslation();
  const authUser = useAuthStore((s) => s.user);
  const canUseHkbuFeatures = canPublishCommunityContent(authUser);
  useMessageRealtime();
  usePresenceHeartbeat();
  const { data: unreadData } = useUnreadCount();
  const unreadLikes = useNotificationStore((s) => s.unreadLikes);
  const unreadFollowers = useNotificationStore((s) => s.unreadFollowers);
  const unreadComments = useNotificationStore((s) => s.unreadComments);
  const unreadMessages = useNotificationStore((s) => s.unreadMessages);
  const seenAtChatLikes = useNotificationStore((s) => s.seenAtChatLikes);
  const seenAtChatFollowers = useNotificationStore((s) => s.seenAtChatFollowers);
  const seenAtChatComments = useNotificationStore((s) => s.seenAtChatComments);
  const seenAtChatMessages = useNotificationStore((s) => s.seenAtChatMessages);
  const setUnreadLikes = useNotificationStore((s) => s.setUnreadLikes);
  const setUnreadFollowers = useNotificationStore((s) => s.setUnreadFollowers);
  const setUnreadComments = useNotificationStore((s) => s.setUnreadComments);
  const setUnreadMessages = useNotificationStore((s) => s.setUnreadMessages);

  useEffect(() => {
    if (!unreadData) return;
    setUnreadLikes(unreadData.likes ?? 0);
    setUnreadFollowers(unreadData.followers ?? 0);
    setUnreadComments(unreadData.comments ?? 0);
    setUnreadMessages(unreadData.messages ?? 0);

    // Sync iOS/Android home screen app badge with total unread count
    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      const total = (unreadData.likes ?? 0) + (unreadData.followers ?? 0)
        + (unreadData.comments ?? 0) + (unreadData.messages ?? 0);
      Notifications.setBadgeCountAsync(total).catch(() => {});
    }
  }, [unreadData, setUnreadLikes, setUnreadFollowers, setUnreadComments, setUnreadMessages]);

  const tabBadgeCount =
    Math.max(0, unreadLikes - seenAtChatLikes) +
    Math.max(0, unreadFollowers - seenAtChatFollowers) +
    Math.max(0, unreadComments - seenAtChatComments) +
    Math.max(0, unreadMessages - seenAtChatMessages);

  return (
    <TabBarAnimationProvider>
    <Tab.Navigator
      backBehavior="history"
      tabBar={(props) => <AnimatedTabBar {...props} />}
      screenListeners={({ navigation, route }) => ({
        state: () => {
          const state = navigation.getState();
          const activeRoute = state.routes[state.index] as RouteWithState | undefined;
          if (activeRoute?.name !== route.name) {
            return;
          }
          const focusedLeafRouteName = getFocusedLeafRouteName(activeRoute);
          if (!focusedLeafRouteName || TAB_ROOT_ROUTES.has(focusedLeafRouteName)) {
            showTabBar();
            return;
          }
          hideTabBar(hiddenTabBarOffset);
        },
        focus: () => {
          const tabRoute = navigation
            .getState()
            .routes.find((stateRoute) => stateRoute.key === route.key) as RouteWithState | undefined;
          const focusedLeafRouteName = getFocusedLeafRouteName(tabRoute);
          if (!focusedLeafRouteName || TAB_ROOT_ROUTES.has(focusedLeafRouteName)) {
            showTabBar();
            return;
          }
          hideTabBar(hiddenTabBarOffset);
        },
        tabPress: (e) => {
          // Block non-HKBU users from opening the Messages tab and prompt
          // them to bind a verified HKBU email instead.
          if (route.name === 'MessagesTab' && !canUseHkbuFeatures) {
            e.preventDefault();
            promptHkbuVerification(t, () => {
              // initial:false keeps MeHome under ManageEmails so back-press and
              // the tab-press reset both behave naturally.
              navigation.navigate('MeTab', { screen: 'ManageEmails', initial: false } as never);
            });
            return;
          }
          const state = navigation.getState();
          const targetIndex = state.routes.findIndex(
            (r) => r.name === route.name,
          );
          const isCurrentTab = state.index === targetIndex;
          if (!isCurrentTab) {
            // Switching from another tab — if the target tab has a nested
            // stack (e.g. Chat pushed via cross-tab navigation), reset it
            // to its root screen so the user sees the list, not a stale
            // deep screen.
            const targetRoute = state.routes[targetIndex] as RouteWithState | undefined;
            const nestedState = targetRoute?.state;
            const isNested = nestedState && (nestedState.index ?? 0) > 0;
            if (isNested) {
              e.preventDefault();
              showTabBar();
              navigation.dispatch(
                CommonActions.reset({
                  ...state,
                  index: targetIndex,
                  routes: state.routes.map((r) =>
                    r.name === route.name
                      ? { ...r, state: undefined }
                      : r,
                  ),
                }),
              );
              return;
            }
            showTabBar();
            return;
          }
          // Only reset if the stack has depth > 0
          const nestedState = state.routes.find(r => r.key === route.key)?.state;
          if ((nestedState?.index ?? 0) > 0) {
            e.preventDefault();
            showTabBar();
            navigation.dispatch(
              CommonActions.reset({
                ...state,
                index: targetIndex,
                routes: state.routes.map((r) =>
                  r.name === route.name
                    ? { ...r, state: undefined }
                    : r,
                ),
              }),
            );
          }
        },
      })}
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarHideOnKeyboard: true,
        tabBarActiveTintColor: colors.black,
        tabBarInactiveTintColor: colors.black,
        tabBarIconStyle: {
          width: 36,
          height: 36,
        },
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.outlineVariant,
          height: layout.bottomNavHeight + insets.bottom,
          paddingBottom: insets.bottom,
          paddingTop: 16,
        },
      }}
    >
      <Tab.Screen
        name="ForumTab"
        component={ForumStackNavigator}
        options={{
          tabBarIcon: ({ focused }) => <TabHomeIcon size={36} focused={focused} />,
        }}
      />
      <Tab.Screen
        name="FunctionsTab"
        component={FunctionsStackNavigator}
        options={{
          tabBarIcon: ({ focused }) => <TabCampusIcon size={36} focused={focused} />,
        }}
      />
      <Tab.Screen
        name="MessagesTab"
        component={MessagesStackNavigator}
        options={{
          tabBarIcon: ({ focused }) => <TabMessagesIcon size={36} focused={focused} />,
          tabBarBadge: tabBadgeCount > 0 ? (tabBadgeCount > 99 ? '99+' : tabBadgeCount) : undefined,
        }}
      />
      <Tab.Screen
        name="MeTab"
        component={MeStackNavigator}
        options={{
          tabBarIcon: ({ focused }) => <TabMeIcon size={36} focused={focused} />,
        }}
      />
    </Tab.Navigator>
    </TabBarAnimationProvider>
  );
}
