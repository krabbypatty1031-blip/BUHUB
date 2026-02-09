import React, { useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { FunctionsStackParamList } from '../../types/navigation';
import { useUIStore } from '../../store/uiStore';
import { colors, shareActionThemes } from '../../theme/colors';
import { spacing, borderRadius, elevation } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import {
  CloseIcon,
  PackageIcon,
  ShareIcon,
  MessageIcon,
  LinkIcon,
} from '../../components/common/icons';

type Props = NativeStackScreenProps<FunctionsStackParamList, 'ErrandShare'>;

export default function ErrandShareScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const { taskName } = route.params;
  const showSnackbar = useUIStore((s) => s.showSnackbar);

  const dismiss = useCallback(() => {
    navigation.popToTop();
  }, [navigation]);

  const handleCopyLink = useCallback(() => {
    showSnackbar({ message: t('linkCopied'), type: 'success' });
  }, [showSnackbar, t]);

  return (
    <SafeAreaView style={styles.container}>
      {/* Close Button */}
      <View style={styles.topBar}>
        <View style={styles.iconBtn} />
        <View style={{ flex: 1 }} />
        <TouchableOpacity onPress={dismiss} style={styles.iconBtn}>
          <CloseIcon size={24} color={colors.onSurface} />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {/* Success Section */}
        <View style={styles.successSection}>
          <View style={styles.iconCircle}>
            <PackageIcon size={40} color={colors.primary} />
          </View>
          <Text style={styles.successTitle}>{t('errandShareTitle')}</Text>
          <Text style={styles.successDesc}>
            {t('errandShareDesc', { taskName })}
          </Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsSection}>
          <TouchableOpacity style={styles.actionRow} activeOpacity={0.7}>
            <View style={styles.actionLeft}>
              <View style={[styles.actionIcon, { backgroundColor: shareActionThemes.blue.bg }]}>
                <ShareIcon size={16} color={shareActionThemes.blue.icon} />
              </View>
              <Text style={styles.actionLabel}>{t('shareToForumAction')}</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionRow} activeOpacity={0.7}>
            <View style={styles.actionLeft}>
              <View style={[styles.actionIcon, { backgroundColor: shareActionThemes.lemon.bg }]}>
                <MessageIcon size={16} color={shareActionThemes.lemon.icon} />
              </View>
              <Text style={styles.actionLabel}>{t('shareToDmAction')}</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionRow}
            activeOpacity={0.7}
            onPress={handleCopyLink}
          >
            <View style={styles.actionLeft}>
              <View style={[styles.actionIcon, { backgroundColor: shareActionThemes.blue.bg }]}>
                <LinkIcon size={16} color={shareActionThemes.blue.icon} />
              </View>
              <Text style={styles.actionLabel}>{t('copyLinkAction')}</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Skip */}
        <TouchableOpacity onPress={dismiss} style={styles.skipBtn}>
          <Text style={styles.skipText}>{t('skipShare')}</Text>
        </TouchableOpacity>
      </View>
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
  },
  iconBtn: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    justifyContent: 'center',
  },
  successSection: {
    alignItems: 'center',
    marginBottom: spacing.xxxl,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  successTitle: {
    ...typography.headlineSmall,
    color: colors.onSurface,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  successDesc: {
    ...typography.bodyMedium,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
  },
  actionsSection: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    ...elevation[1],
    overflow: 'hidden',
    marginBottom: spacing.xxl,
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
    width: 32,
    height: 32,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: {
    ...typography.bodyMedium,
    color: colors.onSurface,
  },
  skipBtn: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  skipText: {
    ...typography.bodyMedium,
    color: colors.onSurfaceVariant,
  },
});
