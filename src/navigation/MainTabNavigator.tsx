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

export default function MainTabNavigator() {
  const { t } = useTranslation();

  return (
    <Tab.Navigator
      backBehavior="history"
      screenListeners={({ navigation, route }) => ({
        tabPress: (e) => {
          e.preventDefault();
          const state = navigation.getState();
          const targetIndex = state.routes.findIndex(
            (r) => r.name === route.name,
          );
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
