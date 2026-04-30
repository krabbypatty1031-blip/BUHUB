import React, { useRef, useCallback, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { captureRef } from 'react-native-view-shot';
import * as MediaLibrary from 'expo-media-library';
import QRCode from 'react-native-qrcode-svg';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { MeStackParamList } from '../../types/navigation';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';
import { colors, shareActionThemes } from '../../theme/colors';
import { spacing, borderRadius, elevation } from '../../theme/spacing';
import { typography, fontFamily } from '../../theme/typography';
import Avatar from '../../components/common/Avatar';
import ScreenHeader from '../../components/common/ScreenHeader';
import {
  DownloadIcon,
  ScanIcon,
} from '../../components/common/icons';

const QR_PREFIX = 'ulink://user/';

type Props = NativeStackScreenProps<MeStackParamList, 'ShareProfile'>;

export default function ShareProfileScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const showSnackbar = useUIStore((s) => s.showSnackbar);
  const cardRef = useRef<View>(null);
  const [saving, setSaving] = useState(false);

  const displayName = user?.nickname || user?.name || '---';
  const qrValue = `${QR_PREFIX}${user?.userName || user?.id || ''}`;

  const handleDownload = useCallback(async () => {
    if (saving) return;
    setSaving(true);
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        showSnackbar({ message: t('photoPermissionMessage'), type: 'error' });
        return;
      }

      const uri = await captureRef(cardRef, {
        format: 'png',
        quality: 1,
      });

      await MediaLibrary.saveToLibraryAsync(uri);
      showSnackbar({ message: t('qrSaved'), type: 'success' });
    } catch {
      showSnackbar({ message: t('saveFailed'), type: 'error' });
    } finally {
      setSaving(false);
    }
  }, [saving, showSnackbar, t]);

  const handleScan = useCallback(() => {
    navigation.navigate('ScanQR');
  }, [navigation]);

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader
        title={t('shareProfile')}
        onBack={() => navigation.goBack()}
        titleStyle={{ fontFamily: fontFamily.bold }}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
      >
        {/* QR Card — captured for download */}
        <View
          ref={cardRef}
          style={styles.qrCard}
          collapsable={false}
        >
          <Avatar
            text={displayName}
            uri={user?.avatar}
            size="lg"
            gender={user?.gender}
          />
          <Text style={styles.userName}>{displayName}</Text>

          <View style={styles.qrWrapper}>
            <QRCode
              value={qrValue}
              size={180}
              color={colors.onSurface}
              backgroundColor={colors.surface}
              ecl="M"
            />
          </View>

          <Text style={styles.scanHint}>{t('scanToVisitProfile')}</Text>
        </View>

        {/* Action buttons */}
        <View style={styles.actionsSection}>
          <TouchableOpacity
            style={styles.actionRow}
            activeOpacity={0.7}
            onPress={handleDownload}
            disabled={saving}
          >
            <View style={styles.actionLeft}>
              <View style={[styles.actionIcon, { backgroundColor: shareActionThemes.blue.bg }]}>
                {saving ? (
                  <ActivityIndicator size="small" color={shareActionThemes.blue.icon} />
                ) : (
                  <DownloadIcon size={20} color={shareActionThemes.blue.icon} />
                )}
              </View>
              <Text style={styles.actionLabel}>{t('downloadQR')}</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionRow, styles.actionRowLast]}
            activeOpacity={0.7}
            onPress={handleScan}
          >
            <View style={styles.actionLeft}>
              <View style={[styles.actionIcon, { backgroundColor: shareActionThemes.lemon.bg }]}>
                <ScanIcon size={20} color={shareActionThemes.lemon.icon} />
              </View>
              <Text style={styles.actionLabel}>{t('scanQR')}</Text>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  qrCard: {
    alignItems: 'center',
    margin: spacing.lg,
    padding: spacing.xxl,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    ...elevation[2],
  },
  userName: {
    ...typography.titleLarge,
    color: colors.onSurface,
    fontWeight: '700',
    marginTop: spacing.md,
    marginBottom: spacing.xl,
  },
  qrWrapper: {
    padding: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.06,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
      },
      android: {
        elevation: 1,
      },
    }),
  },
  scanHint: {
    ...typography.bodySmall,
    color: colors.onSurfaceVariant,
    marginTop: spacing.lg,
  },
  actionsSection: {
    marginHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    ...elevation[1],
    overflow: 'hidden',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.outlineVariant,
  },
  actionRowLast: {
    borderBottomWidth: 0,
  },
  actionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: {
    ...typography.bodyLarge,
    color: colors.onSurface,
  },
});
