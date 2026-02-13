import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { ForumStackParamList } from './types';

import ForumScreen from '../screens/forum/ForumScreen';
import PostDetailScreen from '../screens/forum/PostDetailScreen';
import ComposeScreen from '../screens/forum/ComposeScreen';
import SearchScreen from '../screens/forum/SearchScreen';
import CircleDetailScreen from '../screens/forum/CircleDetailScreen';
import UserProfileScreen from '../screens/me/UserProfileScreen';

const Stack = createNativeStackNavigator<ForumStackParamList>();

export default function ForumStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, gestureEnabled: false }}>
      <Stack.Screen name="ForumHome" component={ForumScreen} />
      <Stack.Screen name="PostDetail" component={PostDetailScreen} />
      <Stack.Screen name="Compose" component={ComposeScreen} />
      <Stack.Screen name="Search" component={SearchScreen} />
      <Stack.Screen name="CircleDetail" component={CircleDetailScreen} />
      <Stack.Screen name="UserProfile" component={UserProfileScreen} />
    </Stack.Navigator>
  );
}
