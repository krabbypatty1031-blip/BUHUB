import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StyleSheet, ActivityIndicator, View } from 'react-native';
import { useFonts } from 'expo-font';

import './src/i18n';
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

  if (fontError && __DEV__) {
    console.warn('[Font] Failed to load custom fonts. Continuing with system fallback.', fontError);
  }

  if (!fontsLoaded && !fontError) {
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
