import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { MeStackParamList } from './types';

import MeScreen from '../screens/me/MeScreen';
import EditProfileScreen from '../screens/me/EditProfileScreen';
import ShareProfileScreen from '../screens/me/ShareProfileScreen';
import FollowListScreen from '../screens/me/FollowListScreen';
import UserProfileScreen from '../screens/me/UserProfileScreen';
import PostDetailScreen from '../screens/forum/PostDetailScreen';
import SettingsScreen from '../screens/me/SettingsScreen';

const Stack = createNativeStackNavigator<MeStackParamList>();

export default function MeStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MeHome" component={MeScreen} />
      <Stack.Screen name="EditProfile" component={EditProfileScreen} />
      <Stack.Screen name="ShareProfile" component={ShareProfileScreen} />
      <Stack.Screen name="FollowList" component={FollowListScreen} />
      <Stack.Screen name="UserProfile" component={UserProfileScreen} />
      <Stack.Screen name="PostDetail" component={PostDetailScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
    </Stack.Navigator>
  );
}
