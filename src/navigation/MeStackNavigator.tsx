import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { MeStackParamList } from './types';

import MeScreen from '../screens/me/MeScreen';
import EditProfileScreen from '../screens/me/EditProfileScreen';
import ShareProfileScreen from '../screens/me/ShareProfileScreen';
import ScanQRScreen from '../screens/me/ScanQRScreen';
import FollowListScreen from '../screens/me/FollowListScreen';
import ForumListScreen from '../screens/me/ForumListScreen';
import UserProfileScreen from '../screens/me/UserProfileScreen';
import CircleDetailScreen from '../screens/forum/CircleDetailScreen';
import PostDetailScreen from '../screens/forum/PostDetailScreen';
import SettingsScreen from '../screens/me/SettingsScreen';
import ManageEmailsScreen from '../screens/me/ManageEmailsScreen';
import BlocklistScreen from '../screens/me/BlocklistScreen';

const Stack = createNativeStackNavigator<MeStackParamList>();

export default function MeStackNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        gestureEnabled: true,
        fullScreenGestureEnabled: false,
      }}
    >
      <Stack.Screen name="MeHome" component={MeScreen} />
      <Stack.Screen name="EditProfile" component={EditProfileScreen} />
      <Stack.Screen name="ShareProfile" component={ShareProfileScreen} />
      <Stack.Screen name="ScanQR" component={ScanQRScreen} />
      <Stack.Screen name="FollowList" component={FollowListScreen} />
      <Stack.Screen name="ForumList" component={ForumListScreen} />
      <Stack.Screen name="CircleDetail" component={CircleDetailScreen} />
      <Stack.Screen name="UserProfile" component={UserProfileScreen} />
      <Stack.Screen name="PostDetail" component={PostDetailScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="ManageEmails" component={ManageEmailsScreen} />
      <Stack.Screen name="Blocklist" component={BlocklistScreen} />
    </Stack.Navigator>
  );
}
