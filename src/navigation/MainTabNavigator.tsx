import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { CommonActions } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import type { MainTabParamList } from './types';
import { colors } from '../theme';
import { TabHomeIcon, TabCompassIcon, TabChatIcon, TabProfileIcon } from '../components/common/icons';

import ForumStackNavigator from './ForumStackNavigator';
import FunctionsStackNavigator from './FunctionsStackNavigator';
import MessagesStackNavigator from './MessagesStackNavigator';
import MeStackNavigator from './MeStackNavigator';

const Tab = createBottomTabNavigator<MainTabParamList>();

const TAB_ROOT_SCREENS: Record<string, string> = {
  ForumTab: 'ForumHome',
  FunctionsTab: 'FunctionsHub',
  MessagesTab: 'MessagesList',
  MeTab: 'MeHome',
};

export default function MainTabNavigator() {
  const { t } = useTranslation();

  return (
    <Tab.Navigator
      screenListeners={({ route, navigation }) => ({
        tabPress: (e) => {
          e.preventDefault();
          navigation.dispatch(
            CommonActions.navigate({
              name: route.name,
              params: { screen: TAB_ROOT_SCREENS[route.name] },
            })
          );
        },
      })}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.onSurfaceVariant,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.outlineVariant,
          height: 80,
          paddingBottom: 20,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
        },
      }}
    >
      <Tab.Screen
        name="ForumTab"
        component={ForumStackNavigator}
        options={{
          tabBarLabel: t('forum'),
          tabBarIcon: ({ color, size, focused }) => <TabHomeIcon size={size} color={color} fill={focused ? color : undefined} />,
        }}
      />
      <Tab.Screen
        name="FunctionsTab"
        component={FunctionsStackNavigator}
        options={{
          tabBarLabel: t('functions'),
          tabBarIcon: ({ color, size, focused }) => <TabCompassIcon size={size} color={color} fill={focused ? color : undefined} />,
        }}
      />
      <Tab.Screen
        name="MessagesTab"
        component={MessagesStackNavigator}
        options={{
          tabBarLabel: t('messages'),
          tabBarIcon: ({ color, size, focused }) => <TabChatIcon size={size} color={color} fill={focused ? color : undefined} />,
        }}
      />
      <Tab.Screen
        name="MeTab"
        component={MeStackNavigator}
        options={{
          tabBarLabel: t('me'),
          tabBarIcon: ({ color, size, focused }) => <TabProfileIcon size={size} color={color} fill={focused ? color : undefined} />,
        }}
      />
    </Tab.Navigator>
  );
}
