import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { useAuthStore } from '../store/authStore';
import { authService } from '../api/services/auth.service';
import { Snackbar, ConfirmModal } from '../components/common';
import { colors } from '../theme/colors';
import { changeLanguage, normalizeLanguage } from '../i18n';

import AuthNavigator from './AuthNavigator';
import MainTabNavigator from './MainTabNavigator';

const AppTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: colors.background,
  },
};

export default function AppNavigator() {
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const token = useAuthStore((s) => s.token);
  const logout = useAuthStore((s) => s.logout);
  const setUser = useAuthStore((s) => s.setUser);
  const setLanguage = useAuthStore((s) => s.setLanguage);
  const language = useAuthStore((s) => s.language);
  const hasHydrated = useAuthStore((s) => s._hasHydrated);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    if (!hasHydrated) return;
    const normalized = normalizeLanguage(language) ?? 'tc';
    if (normalized !== language) {
      setLanguage(normalized);
    }
    void changeLanguage(normalized);
  }, [hasHydrated, language, setLanguage]);

  // Verify token on app startup (wait for hydration first)
  useEffect(() => {
    if (!hasHydrated) return;
    const checkAuth = async () => {
      if (!isLoggedIn || !token) {
        setIsCheckingAuth(false);
        return;
      }
      try {
        const result = await authService.verifyToken();
        if (!result.valid) {
          logout();
        } else if (result.user) {
          setUser(result.user);
        }
      } catch {
        logout();
      } finally {
        setIsCheckingAuth(false);
      }
    };
    checkAuth();
  }, [hasHydrated, isLoggedIn, token, logout, setUser]); // Re-run when hydration completes

  if (!hasHydrated || isCheckingAuth) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer theme={AppTheme}>
      {isLoggedIn ? <MainTabNavigator /> : <AuthNavigator />}
      <Snackbar />
      <ConfirmModal />
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
});
