import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet, Modal, Text, TouchableOpacity, ScrollView } from 'react-native';
import { NavigationContainer, DefaultTheme, useNavigationContainerRef } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from '../store/authStore';
import { useUIStore } from '../store/uiStore';
import { authService } from '../api/services/auth.service';
import { announcementService, type GlobalAnnouncement } from '../api/services/announcement.service';
import { Snackbar, ConfirmModal } from '../components/common';
import { Image as ExpoImage } from 'expo-image';
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
const ANNOUNCEMENT_SEEN_KEY = 'ulink-global-announcement-seen-updated-at';

function isAuthFailure(error: unknown): boolean {
  const apiError = error as Partial<ApiError> | undefined;
  return apiError?.code === 401 || apiError?.errorCode === 'UNAUTHORIZED';
}

function parseAnnouncementBlocks(content: string): Array<{ type: 'text' | 'image'; value: string; key: string }> {
  const blocks: Array<{ type: 'text' | 'image'; value: string; key: string }> = [];
  const lines = content.split(/\r?\n/);
  lines.forEach((line, index) => {
    const trimmed = line.trim();
    const match = trimmed.match(/^!\[[^\]]*]\((https?:\/\/[^)]+)\)$/i);
    if (match?.[1]) {
      blocks.push({ type: 'image', value: match[1], key: `img-${index}` });
      return;
    }
    blocks.push({ type: 'text', value: line, key: `txt-${index}` });
  });
  return blocks;
}

export default function AppNavigator() {
  const queryClient = useQueryClient();
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
  const [lastForumLanguage, setLastForumLanguage] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState<GlobalAnnouncement | null>(null);
  const [announcementVisible, setAnnouncementVisible] = useState(false);
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
    if (lastForumLanguage !== null && lastForumLanguage !== normalized) {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      queryClient.invalidateQueries({ queryKey: ['post'] });
      queryClient.invalidateQueries({ queryKey: ['comments'] });
      queryClient.invalidateQueries({ queryKey: ['search'] });
      queryClient.invalidateQueries({ queryKey: ['userPosts'] });
      queryClient.invalidateQueries({ queryKey: ['myContent'] });
    }
    if (lastForumLanguage !== normalized) {
      setLastForumLanguage(normalized);
    }
  }, [hasHydrated, language, lastForumLanguage, queryClient, setLanguage]);

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

  useEffect(() => {
    if (!hasHydrated || !isLoggedIn) return;
    let active = true;
    (async () => {
      try {
        const latest = await announcementService.fetchLatest();
        if (!active || !latest?.updatedAt) return;
        const seenUpdatedAt = await AsyncStorage.getItem(ANNOUNCEMENT_SEEN_KEY);
        if (!seenUpdatedAt || seenUpdatedAt !== latest.updatedAt) {
          setAnnouncement(latest);
          setAnnouncementVisible(true);
        }
      } catch {
        // Silent: announcement is non-critical.
      }
    })();
    return () => {
      active = false;
    };
  }, [hasHydrated, isLoggedIn]);

  const closeAnnouncement = async () => {
    setAnnouncementVisible(false);
    if (announcement?.updatedAt) {
      await AsyncStorage.setItem(ANNOUNCEMENT_SEEN_KEY, announcement.updatedAt);
    }
  };

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
      <Modal visible={announcementVisible} transparent animationType="fade" onRequestClose={closeAnnouncement}>
        <View style={styles.announcementOverlay}>
          <View style={styles.announcementCard}>
            <Text style={styles.announcementTitle}>{announcement?.title}</Text>
            <ScrollView style={styles.announcementBody} contentContainerStyle={styles.announcementBodyContent}>
              {parseAnnouncementBlocks(announcement?.content ?? '').map((block) =>
                block.type === 'image' ? (
                  <ExpoImage
                    key={block.key}
                    source={block.value}
                    style={styles.announcementImage}
                    contentFit="cover"
                  />
                ) : (
                  <Text key={block.key} style={styles.announcementContent}>
                    {block.value}
                  </Text>
                )
              )}
            </ScrollView>
            <TouchableOpacity style={styles.announcementBtn} onPress={closeAnnouncement} activeOpacity={0.8}>
              <Text style={styles.announcementBtnText}>{i18n.t('confirm')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  announcementOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  announcementCard: {
    width: '100%',
    maxWidth: 420,
    maxHeight: '80%',
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
  },
  announcementTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: colors.onSurface,
    marginBottom: 10,
  },
  announcementBody: {
    maxHeight: 420,
  },
  announcementBodyContent: {
    gap: 10,
  },
  announcementImage: {
    width: '100%',
    height: 180,
    borderRadius: 12,
    backgroundColor: colors.surface3,
  },
  announcementContent: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.onSurface,
  },
  announcementBtn: {
    marginTop: 14,
    alignSelf: 'flex-end',
    backgroundColor: colors.primary,
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  announcementBtnText: {
    color: colors.onPrimary,
    fontWeight: '700',
    fontSize: 14,
  },
});
