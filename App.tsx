import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StyleSheet, ActivityIndicator, View } from 'react-native';
import { useFonts } from 'expo-font';

import i18n, { i18nReady, changeLanguage } from './src/i18n';
import { useAuthStore } from './src/store/authStore';
import AppNavigator from './src/navigation/AppNavigator';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 1,
    },
  },
});

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    'SourceHanSansCN-Regular': require('./assets/fonts/source-han/SourceHanSansCN-Regular.otf'),
    'SourceHanSansCN-Medium': require('./assets/fonts/source-han/SourceHanSansCN-Medium.otf'),
    'SourceHanSansCN-Bold': require('./assets/fonts/source-han/SourceHanSansCN-Bold.otf'),
    'SourceHanSansCN-Heavy': require('./assets/fonts/source-han/SourceHanSansCN-Heavy.otf'),
    'SourceHanSansCN-Light': require('./assets/fonts/source-han/SourceHanSansCN-Light.otf'),
    'DINExp-Bold': require('./assets/fonts/d-din/D-DINExp-Bold.otf'),
    'Poppins-Medium': require('@expo-google-fonts/poppins/500Medium/Poppins_500Medium.ttf'),
    'Poppins-SemiBold': require('@expo-google-fonts/poppins/600SemiBold/Poppins_600SemiBold.ttf'),
  });

  const [i18nLoaded, setI18nLoaded] = useState(false);
  useEffect(() => {
    let cancelled = false;
    i18nReady.then(() => {
      if (!cancelled) setI18nLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Block first render until the persisted auth store is rehydrated, so
  // language / token / login state are read from disk before any screen
  // mounts. Without this gate, the initial paint can use the default
  // Zustand values and produce a UI/Accept-Language drift.
  const [authHydrated, setAuthHydrated] = useState(() =>
    Boolean(useAuthStore.persist?.hasHydrated?.())
  );
  useEffect(() => {
    if (authHydrated) return;
    if (useAuthStore.persist?.hasHydrated?.()) {
      setAuthHydrated(true);
      return;
    }
    const unsub = useAuthStore.persist?.onFinishHydration?.(() => setAuthHydrated(true));
    return unsub;
  }, [authHydrated]);

  // Reconcile i18n.language with authStore.language once both have hydrated.
  // The store is the user-confirmed source of truth (set in LanguageScreen,
  // SettingsScreen, ProfileSetupScreen, or via setUser from server). If they
  // disagree at boot, push the store value into i18n + AsyncStorage.
  useEffect(() => {
    if (!i18nLoaded || !authHydrated) return;
    const stored = useAuthStore.getState().language;
    if (stored && stored !== i18n.language) {
      void changeLanguage(stored);
    }
  }, [i18nLoaded, authHydrated]);

  if (fontError && __DEV__) {
    console.warn('[Font] Failed to load custom fonts. Continuing with system fallback.', fontError);
  }

  if ((!fontsLoaded && !fontError) || !i18nLoaded || !authHydrated) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={styles.root}>
      <KeyboardProvider statusBarTranslucent>
        <QueryClientProvider client={queryClient}>
          <SafeAreaProvider>
            <AppNavigator />
            <StatusBar style="dark" />
          </SafeAreaProvider>
        </QueryClientProvider>
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
