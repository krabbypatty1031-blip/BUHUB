import React, { useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { MeStackParamList } from '../../types/navigation';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';
import { colors, shareActionThemes } from '../../theme/colors';
import { spacing, borderRadius, elevation } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import Avatar from '../../components/common/Avatar';
import {
  BackIcon,
  DownloadIcon,
  ScanIcon,
  ShareIcon,
  LinkIcon,
  QrCodeIcon,
} from '../../components/common/icons';

type Props = NativeStackScreenProps<MeStackParamList, 'ShareProfile'>;

export default function ShareProfileScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const showSnackbar = useUIStore((s) => s.showSnackbar);

  const handleCopyLink = useCallback(() => {
    showSnackbar({ message: t('linkCopied'), type: 'success' });
  }, [showSnackbar, t]);

  const displayName = user?.nickname || user?.name || '---';

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.iconBtn}
        >
          <BackIcon size={24} color={colors.onSurface} />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>{t('shareProfile')}</Text>
        <View style={styles.iconBtn} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
      >
        {/* QR Card */}
        <View style={styles.qrCard}>
          {/* User info */}
          <Avatar
            text={displayName}
            uri={user?.avatar}
            size="lg"
            gender={user?.gender}
          />
          <Text style={styles.userName}>{displayName}</Text>

          {/* QR Code placeholder */}
          <View style={styles.qrPlaceholder}>
            <QrCodeIcon size={120} color={colors.onSurfaceVariant} />
          </View>
        </View>

        {/* Action buttons */}
        <View style={styles.actionsSection}>
          <TouchableOpacity style={styles.actionRow} activeOpacity={0.7}>
            <View style={styles.actionLeft}>
              <View style={[styles.actionIcon, { backgroundColor: shareActionThemes.blue.bg }]}>
                <DownloadIcon size={20} color={shareActionThemes.blue.icon} />
              </View>
              <Text style={styles.actionLabel}>{t('downloadQR')}</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionRow} activeOpacity={0.7}>
            <View style={styles.actionLeft}>
              <View style={[styles.actionIcon, { backgroundColor: shareActionThemes.lemon.bg }]}>
                <ScanIcon size={20} color={shareActionThemes.lemon.icon} />
              </View>
              <Text style={styles.actionLabel}>{t('scanQR')}</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionRow} activeOpacity={0.7}>
            <View style={styles.actionLeft}>
              <View style={[styles.actionIcon, { backgroundColor: shareActionThemes.blue.bg }]}>
                <ShareIcon size={20} color={shareActionThemes.blue.icon} />
              </View>
              <Text style={styles.actionLabel}>{t('shareExternal')}</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionRow}
            activeOpacity={0.7}
            onPress={handleCopyLink}
          >
            <View style={styles.actionLeft}>
              <View style={[styles.actionIcon, { backgroundColor: shareActionThemes.lemon.bg }]}>
                <LinkIcon size={20} color={shareActionThemes.lemon.icon} />
              </View>
              <Text style={styles.actionLabel}>{t('copyLink')}</Text>
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
  topBar: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.outlineVariant,
  },
  iconBtn: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarTitle: {
    flex: 1,
    textAlign: 'center',
    ...typography.titleMedium,
    color: colors.onSurface,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },

  /* QR Card */
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
  qrPlaceholder: {
    width: 180,
    height: 180,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },

  /* Actions */
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
