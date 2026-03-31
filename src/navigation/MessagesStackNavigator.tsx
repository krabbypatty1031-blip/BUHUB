import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { MessagesStackParamList } from './types';

import MessagesScreen from '../screens/messages/MessagesScreen';
import ChatScreen from '../screens/messages/ChatScreen';
import NotifyLikesScreen from '../screens/notifications/NotifyLikesScreen';
import NotifyFollowersScreen from '../screens/notifications/NotifyFollowersScreen';
import NotifyCommentsScreen from '../screens/notifications/NotifyCommentsScreen';
import UserProfileScreen from '../screens/me/UserProfileScreen';
import PostDetailScreen from '../screens/forum/PostDetailScreen';

const Stack = createNativeStackNavigator<MessagesStackParamList>();

export default function MessagesStackNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        gestureEnabled: true,
        fullScreenGestureEnabled: false,
      }}
    >
      <Stack.Screen name="MessagesList" component={MessagesScreen} />
      <Stack.Screen
        name="Chat"
        component={ChatScreen}
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen name="NotifyLikes" component={NotifyLikesScreen} />
      <Stack.Screen name="NotifyFollowers" component={NotifyFollowersScreen} />
      <Stack.Screen name="NotifyComments" component={NotifyCommentsScreen} />
      <Stack.Screen name="UserProfile" component={UserProfileScreen} />
      <Stack.Screen name="PostDetail" component={PostDetailScreen} />
    </Stack.Navigator>
  );
}
