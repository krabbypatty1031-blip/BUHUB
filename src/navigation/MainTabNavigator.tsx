import React, { useEffect } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { CommonActions } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { MainTabParamList } from './types';
import { colors } from '../theme';
import { layout } from '../theme/spacing';
import { TabHomeIcon, TabCompassIcon, TabChatIcon, TabProfileIcon } from '../components/common/icons';
import { TabBarAnimationProvider, hideTabBar, showTabBar } from '../hooks/TabBarAnimationContext';
import AnimatedTabBar from '../components/common/AnimatedTabBar';
import { useUnreadCount } from '../hooks/useNotifications';
import { useContacts } from '../hooks/useMessages';
import { useNotificationStore } from '../store/notificationStore';
import { useMessageStore } from '../store/messageStore';
import { useMessageRealtime } from '../hooks/useMessageRealtime';
import { usePresenceHeartbeat } from '../hooks/usePresenceHeartbeat';

import ForumStackNavigator from './ForumStackNavigator';
import FunctionsStackNavigator from './FunctionsStackNavigator';
import MessagesStackNavigator from './MessagesStackNavigator';
import MeStackNavigator from './MeStackNavigator';

const Tab = createBottomTabNavigator<MainTabParamList>();
const MANUAL_TAB_BAR_ROUTES = new Set(['Chat', 'RatingForm']);

function getFocusedLeafRouteName(route: { state?: any } | undefined): string | undefined {
  let state = route?.state;
  while (state?.routes?.length) {
    const current = state.routes[state.index ?? 0];
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
  const { data: contacts } = useContacts();
  const unreadMessages = useNotificationStore((s) => s.unreadMessages);
  const setUnreadLikes = useNotificationStore((s) => s.setUnreadLikes);
  const setUnreadFollowers = useNotificationStore((s) => s.setUnreadFollowers);
  const setUnreadComments = useNotificationStore((s) => s.setUnreadComments);
  const setUnreadMessages = useNotificationStore((s) => s.setUnreadMessages);
  const getEffectiveTabUnread = useMessageStore((s) => s.getEffectiveTabUnread);
  const markedUnreadContacts = useMessageStore((s) => s.markedUnreadContacts);
  const readContacts = useMessageStore((s) => s.readContacts);
  const inboxSeenContacts = useMessageStore((s) => s.inboxSeenContacts);

  useEffect(() => {
    if (!unreadData) return;
    setUnreadLikes(unreadData.likes ?? 0);
    setUnreadFollowers(unreadData.followers ?? 0);
    setUnreadComments(unreadData.comments ?? 0);
  }, [unreadData, setUnreadLikes, setUnreadFollowers, setUnreadComments]);

  useEffect(() => {
    if (!contacts) {
      setUnreadMessages(0);
      return;
    }
    const unreadMessageCount = contacts.reduce(
      (count, contact) => count + getEffectiveTabUnread(contact.id, contact.unread),
      0
    );
    setUnreadMessages(unreadMessageCount);
  }, [
    contacts,
    getEffectiveTabUnread,
    markedUnreadContacts,
    readContacts,
    inboxSeenContacts,
    setUnreadMessages,
  ]);

  return (
    <TabBarAnimationProvider>
    <Tab.Navigator
      backBehavior="history"
      tabBar={(props) => <AnimatedTabBar {...props} />}
      screenListeners={({ navigation, route }) => ({
        state: () => {
          const state = navigation.getState();
          const activeRouteName = state.routes[state.index]?.name;
          if (activeRouteName !== route.name) {
            return;
          }
          const focusedLeafRouteName = getFocusedLeafRouteName(route as any);
          if (focusedLeafRouteName && MANUAL_TAB_BAR_ROUTES.has(focusedLeafRouteName)) {
            hideTabBar(hiddenTabBarOffset);
            return;
          }
          showTabBar();
        },
        focus: () => {
          const focusedLeafRouteName = getFocusedLeafRouteName(route as any);
          if (focusedLeafRouteName && MANUAL_TAB_BAR_ROUTES.has(focusedLeafRouteName)) {
            hideTabBar(hiddenTabBarOffset);
            return;
          }
          showTabBar();
        },
        tabPress: (e) => {
          const state = navigation.getState();
          const targetIndex = state.routes.findIndex(
            (r) => r.name === route.name,
          );
          const isCurrentTab = state.index === targetIndex;
          if (!isCurrentTab) {
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
