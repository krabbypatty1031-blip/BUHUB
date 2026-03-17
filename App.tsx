import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
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

/* eslint-disable @typescript-eslint/no-var-requires */
const FONT_DIR = './assets/思源黑体优化版/思源黑体懿凡修改版';

export default function App() {
  const [fontsLoaded] = useFonts({
    'SourceHanSansCN-Regular': require(`${FONT_DIR}/Source Han Sans CN Regular.otf`),
    'SourceHanSansCN-Medium': require(`${FONT_DIR}/Source Han Sans CN Medium.otf`),
    'SourceHanSansCN-Bold': require(`${FONT_DIR}/Source Han Sans CN Bold.otf`),
    'SourceHanSansCN-Heavy': require(`${FONT_DIR}/Source Han Sans CN Heavy.otf`),
    'SourceHanSansCN-Light': require(`${FONT_DIR}/Source Han Sans CN Light.otf`),
    'DINExp-Bold': require('./assets/fonts/d-din/D-DINExp-Bold.otf'),
  });

  if (!fontsLoaded) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={styles.root}>
      <QueryClientProvider client={queryClient}>
        <SafeAreaProvider>
          <AppNavigator />
          <StatusBar style="dark" />
        </SafeAreaProvider>
      </QueryClientProvider>
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
