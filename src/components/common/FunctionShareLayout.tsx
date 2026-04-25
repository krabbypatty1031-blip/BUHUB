import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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
import { navigateToForumComposeSelection } from '../../utils/forumComposeNavigation';
import { canPublishCommunityContent } from '../../utils/publishPermission';
import { promptHkbuVerification } from '../../utils/hkbuPrompt';
import { useAuthStore } from '../../store/authStore';
import type { FunctionRefType, FunctionShareNavigation, RatingCategory } from '../../types';

interface FunctionShareLayoutProps {
  navigation: FunctionShareNavigation;
  /** i18n key for success title */
  titleKey: string;
  /** i18n key for success description */
  descKey: string;
  /** interpolation params for descKey, e.g. { taskName: '...' } */
  descParams: Record<string, string>;
  /** 'partner' | 'errand' | 'secondhand' */
  functionType: FunctionRefType;
  /** Display title forwarded to forum / DM */
  functionTitle: string;
  /** Poster name forwarded to DM */
  posterName: string;
  /** Item id forwarded to forum / DM */
  functionId: string;
  /** Required to route rating cards back to the right detail page */
  ratingCategory?: RatingCategory;
  /** Disable forum repost when a function type should stay in DM only */
  allowForumShare?: boolean;
}

export default function FunctionShareLayout({
  navigation,
  titleKey,
  descKey,
  descParams,
  functionType,
  functionTitle,
  posterName,
  functionId,
  ratingCategory,
  allowForumShare = true,
}: FunctionShareLayoutProps) {
  const { t } = useTranslation();
  const [forwardVisible, setForwardVisible] = useState(false);
  const authUser = useAuthStore((s) => s.user);
  const canShareToHkbu = canPublishCommunityContent(authUser);

  const dismiss = useCallback(() => {
    navigation.popToTop();
  }, [navigation]);

  const goToManageEmails = useCallback(() => {
    // Cross-tab navigation: jump to MeTab > ManageEmails so the user can bind
    // their HKBU email without losing context. initial:false preserves MeHome
    // beneath ManageEmails so the tab-press reset and back-press behave correctly.
    navigation.navigate('MeTab', { screen: 'ManageEmails', initial: false } as never);
  }, [navigation]);

  const handleShareToForum = useCallback(() => {
    if (!canShareToHkbu) {
      promptHkbuVerification(t, goToManageEmails);
      return;
    }
    navigateToForumComposeSelection({
      navigation,
      functionType,
      functionTitle,
      functionId,
      ratingCategory,
    });
  }, [
    canShareToHkbu,
    functionId,
    functionTitle,
    functionType,
    goToManageEmails,
    navigation,
    ratingCategory,
    t,
  ]);

  const handleShareToDm = useCallback(() => {
    if (!canShareToHkbu) {
      promptHkbuVerification(t, goToManageEmails);
      return;
    }
    setForwardVisible(true);
  }, [canShareToHkbu, goToManageEmails, t]);

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
          {allowForumShare ? (
            <TouchableOpacity
              style={styles.actionRow}
              activeOpacity={0.7}
              onPress={handleShareToForum}
            >
              <View style={styles.actionLeft}>
                <View style={[styles.actionIcon, { backgroundColor: shareActionThemes.blue.bg }]}>
                  <RepostIcon size={16} color={shareActionThemes.blue.icon} />
                </View>
                <Text style={styles.actionLabel}>{t('shareToForumAction')}</Text>
              </View>
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity
            style={[styles.actionRow, !allowForumShare ? styles.actionRowLast : null]}
            activeOpacity={0.7}
            onPress={handleShareToDm}
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
        functionId={functionId}
        ratingCategory={ratingCategory}
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
  actionRowLast: {
    borderBottomWidth: 0,
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
