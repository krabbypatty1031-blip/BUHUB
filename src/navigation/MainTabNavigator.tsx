import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { CommonActions } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { MainTabParamList } from './types';
import { colors } from '../theme';
import { layout } from '../theme/spacing';
import { TabHomeIcon, TabCompassIcon, TabChatIcon, TabProfileIcon } from '../components/common/icons';
import { TabBarAnimationProvider } from '../hooks/TabBarAnimationContext';
import AnimatedTabBar from '../components/common/AnimatedTabBar';

import ForumStackNavigator from './ForumStackNavigator';
import FunctionsStackNavigator from './FunctionsStackNavigator';
import MessagesStackNavigator from './MessagesStackNavigator';
import MeStackNavigator from './MeStackNavigator';

const Tab = createBottomTabNavigator<MainTabParamList>();

export default function MainTabNavigator() {
  const insets = useSafeAreaInsets();

  return (
    <TabBarAnimationProvider>
    <Tab.Navigator
      backBehavior="history"
      tabBar={(props) => <AnimatedTabBar {...props} />}
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
