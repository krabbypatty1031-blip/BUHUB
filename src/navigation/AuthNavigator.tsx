import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { AuthStackParamList } from './types';
import { useAuthStore } from '../store/authStore';

import LanguageScreen from '../screens/auth/LanguageScreen';
import LoginScreen from '../screens/auth/LoginScreen';
import EmailInputScreen from '../screens/auth/EmailInputScreen';
import SetPasswordScreen from '../screens/auth/SetPasswordScreen';
import InviteCodeScreen from '../screens/auth/InviteCodeScreen';
import ProfileSetupScreen from '../screens/auth/ProfileSetupScreen';

const Stack = createNativeStackNavigator<AuthStackParamList>();

export default function AuthNavigator() {
  const hasSelectedLanguage = useAuthStore((s) => s.hasSelectedLanguage);
  const forceLanguageOnNextLaunch = useAuthStore((s) => s.forceLanguageOnNextLaunch);

  const initialRoute = forceLanguageOnNextLaunch
    ? 'Language'
    : (hasSelectedLanguage ? 'Login' : 'Language');

  return (
    <Stack.Navigator initialRouteName={initialRoute} screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Language" component={LanguageScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="EmailInput" component={EmailInputScreen} />
      <Stack.Screen name="SetPassword" component={SetPasswordScreen} />
      <Stack.Screen name="InviteCode" component={InviteCodeScreen} />
      <Stack.Screen name="ProfileSetup" component={ProfileSetupScreen} />
    </Stack.Navigator>
  );
}
