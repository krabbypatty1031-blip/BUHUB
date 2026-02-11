import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, shareActionThemes } from '../../theme/colors';
import { spacing, borderRadius, elevation } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import {
  CloseIcon,
  RepostIcon,
  MessageIcon,
} from './icons';
import FunctionForwardSheet from './FunctionForwardSheet';

interface FunctionShareLayoutProps {
  navigation: any;
  /** i18n key for success title */
  titleKey: string;
  /** i18n key for success description */
  descKey: string;
  /** interpolation params for descKey, e.g. { taskName: '...' } */
  descParams: Record<string, string>;
  /** 'partner' | 'errand' | 'secondhand' */
  functionType: 'partner' | 'errand' | 'secondhand';
  /** Display title forwarded to forum / DM */
  functionTitle: string;
  /** Poster name forwarded to DM */
  posterName: string;
  /** Item index forwarded to forum / DM */
  index: number;
}

export default function FunctionShareLayout({
  navigation,
  titleKey,
  descKey,
  descParams,
  functionType,
  functionTitle,
  posterName,
  index,
}: FunctionShareLayoutProps) {
  const { t } = useTranslation();
  const [forwardVisible, setForwardVisible] = useState(false);

  const dismiss = useCallback(() => {
    navigation.popToTop();
  }, [navigation]);

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
          <Text style={styles.successTitle}>{t(titleKey)}</Text>
          <Text style={styles.successDesc}>
            {t(descKey, descParams)}
          </Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsSection}>
          <TouchableOpacity
            style={styles.actionRow}
            activeOpacity={0.7}
            onPress={() => {
              navigation.getParent()?.navigate('ForumTab', {
                screen: 'Compose',
                params: { functionType, functionTitle, functionIndex: index },
              });
            }}
          >
            <View style={styles.actionLeft}>
              <View style={[styles.actionIcon, { backgroundColor: shareActionThemes.blue.bg }]}>
                <RepostIcon size={16} color={shareActionThemes.blue.icon} />
              </View>
              <Text style={styles.actionLabel}>{t('shareToForumAction')}</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionRow}
            activeOpacity={0.7}
            onPress={() => setForwardVisible(true)}
          >
            <View style={styles.actionLeft}>
              <View style={[styles.actionIcon, { backgroundColor: shareActionThemes.lemon.bg }]}>
                <MessageIcon size={16} color={shareActionThemes.lemon.icon} />
              </View>
              <Text style={styles.actionLabel}>{t('shareToDmAction')}</Text>
            </View>
          </TouchableOpacity>
        </View>

      </View>
      <FunctionForwardSheet
        visible={forwardVisible}
        onClose={() => setForwardVisible(false)}
        functionType={functionType}
        functionTitle={functionTitle}
        functionPosterName={posterName}
        functionIndex={index}
        navigation={navigation}
      />
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
    alignItems: 'center',
  },
  successSection: {
    alignSelf: 'stretch',
    alignItems: 'center',
    marginBottom: spacing.xxxl,
  },
  successTitle: {
    ...typography.headlineLarge,
    color: colors.onSurface,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  successDesc: {
    ...typography.bodyLarge,
    color: colors.onSurface,
    textAlign: 'center',
  },
  actionsSection: {
    alignSelf: 'stretch',
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
});
