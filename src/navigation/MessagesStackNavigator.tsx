import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { MessagesStackParamList } from './types';

import MessagesScreen from '../screens/messages/MessagesScreen';
import ChatScreen from '../screens/messages/ChatScreen';
import NotifyLikesScreen from '../screens/notifications/NotifyLikesScreen';
import NotifyFollowersScreen from '../screens/notifications/NotifyFollowersScreen';
import NotifyCommentsScreen from '../screens/notifications/NotifyCommentsScreen';

const Stack = createNativeStackNavigator<MessagesStackParamList>();

export default function MessagesStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MessagesList" component={MessagesScreen} />
      <Stack.Screen name="Chat" component={ChatScreen} />
      <Stack.Screen name="NotifyLikes" component={NotifyLikesScreen} />
      <Stack.Screen name="NotifyFollowers" component={NotifyFollowersScreen} />
      <Stack.Screen name="NotifyComments" component={NotifyCommentsScreen} />
    </Stack.Navigator>
  );
}
