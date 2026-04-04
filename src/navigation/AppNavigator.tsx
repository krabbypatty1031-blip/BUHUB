import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer, DefaultTheme, useNavigationContainerRef } from '@react-navigation/native';
import { useAuthStore } from '../store/authStore';
import { useUIStore } from '../store/uiStore';
import { authService } from '../api/services/auth.service';
import { Snackbar, ConfirmModal } from '../components/common';
import { colors } from '../theme/colors';
import i18n, { changeLanguage, normalizeLanguage } from '../i18n';
import type { ApiError } from '../types';
import { flushPendingPushNavigation, usePushRegistration } from '../hooks/usePushRegistration';
import type { MainTabParamList } from '../types/navigation';

import AuthNavigator from './AuthNavigator';
import MainTabNavigator from './MainTabNavigator';

const AppTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: colors.background,
  },
};

function isAuthFailure(error: unknown): boolean {
  const apiError = error as Partial<ApiError> | undefined;
  return apiError?.code === 401 || apiError?.errorCode === 'UNAUTHORIZED';
}

export default function AppNavigator() {
  const navigationRef = useNavigationContainerRef<MainTabParamList>();
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const token = useAuthStore((s) => s.token);
  const logout = useAuthStore((s) => s.logout);
  const setUser = useAuthStore((s) => s.setUser);
  const setLanguage = useAuthStore((s) => s.setLanguage);
  const language = useAuthStore((s) => s.language);
  const hasHydrated = useAuthStore((s) => s._hasHydrated);
  const showSnackbar = useUIStore((s) => s.showSnackbar);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  usePushRegistration(navigationRef);

  // Keep the rendering language in sync with the persisted/store language.
  // This also covers login/verify-token flows that update the auth store
  // without going through the Settings screen.
  useEffect(() => {
    if (!hasHydrated) return;
    const normalized = normalizeLanguage(language) ?? 'tc';
    if (normalized !== language) {
      setLanguage(normalized);
    }
    if (normalized !== i18n.language) {
      void changeLanguage(normalized);
    }
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
      } catch (error) {
        if (isAuthFailure(error)) {
          logout();
        } else {
          showSnackbar({ message: i18n.t('networkError'), type: 'error' });
          if (__DEV__) {
            console.log('[Auth] verify-token skipped because the server did not respond in time');
          }
        }
      } finally {
        setIsCheckingAuth(false);
      }
    };
    checkAuth();
  }, [hasHydrated, isLoggedIn, token, logout, setUser, showSnackbar]); // Re-run when hydration completes

  if (!hasHydrated || isCheckingAuth) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer
      ref={navigationRef}
      theme={AppTheme}
      onReady={() => flushPendingPushNavigation(navigationRef)}
    >
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
