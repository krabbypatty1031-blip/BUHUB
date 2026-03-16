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
import { TabHomeIcon, TabCompassIcon, TabChatIcon, TabProfileIcon } from '../components/common/icons';
import { TabBarAnimationProvider, hideTabBar, showTabBar } from '../hooks/TabBarAnimationContext';
import AnimatedTabBar from '../components/common/AnimatedTabBar';
import { useUnreadCount } from '../hooks/useNotifications';
import { useNotificationStore } from '../store/notificationStore';
import { useMessageRealtime } from '../hooks/useMessageRealtime';
import { usePresenceHeartbeat } from '../hooks/usePresenceHeartbeat';

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
  useMessageRealtime();
  usePresenceHeartbeat();
  const { data: unreadData } = useUnreadCount();
  const unreadMessages = useNotificationStore((s) => s.unreadMessages);
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
        },
      })}
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarHideOnKeyboard: true,
        tabBarActiveTintColor: colors.black,
        tabBarInactiveTintColor: colors.black,
        tabBarIconStyle: {
          width: 28,
          height: 28,
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
          tabBarIcon: ({ color, focused }) => <TabHomeIcon size={28} color={color} fill={focused ? color : undefined} />,
        }}
      />
      <Tab.Screen
        name="FunctionsTab"
        component={FunctionsStackNavigator}
        options={{
          tabBarIcon: ({ color, focused }) => <TabCompassIcon size={28} color={color} fill={focused ? color : undefined} />,
        }}
      />
      <Tab.Screen
        name="MessagesTab"
        component={MessagesStackNavigator}
        options={{
          tabBarIcon: ({ color, focused }) => <TabChatIcon size={28} color={color} fill={focused ? color : undefined} />,
          tabBarBadge: unreadMessages > 0 ? (unreadMessages > 99 ? '99+' : unreadMessages) : undefined,
        }}
      />
      <Tab.Screen
        name="MeTab"
        component={MeStackNavigator}
        options={{
          tabBarIcon: ({ color, focused }) => <TabProfileIcon size={28} color={color} fill={focused ? color : undefined} />,
        }}
      />
    </Tab.Navigator>
    </TabBarAnimationProvider>
  );
}
