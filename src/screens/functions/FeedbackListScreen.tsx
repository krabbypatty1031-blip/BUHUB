import React, { useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { FunctionsStackParamList } from '../../types/navigation';
import type { Feedback, FeedbackCategory, FeedbackStatus } from '../../types/feedback';
import { useMyFeedback, flattenFeedbackPages } from '../../hooks/useFeedback';
import { colors } from '../../theme/colors';
import { elevation } from '../../theme/spacing';
import { getLocalizedFontStyle } from '../../theme/typography';
import EmptyState from '../../components/common/EmptyState';
import { BackIcon, PlusIcon } from '../../components/common/icons';
import { getRelativeTime } from '../../utils/formatTime';

type Props = NativeStackScreenProps<FunctionsStackParamList, 'FeedbackList'>;

const STATUS_COLORS: Record<FeedbackStatus, { bg: string; text: string }> = {
  PENDING: { bg: '#FFF8E1', text: '#F59E0B' },
  REPLIED: { bg: '#EBF5FF', text: '#3B82F6' },
  RESOLVED: { bg: '#ECFDF5', text: '#22C55E' },
};

const CATEGORY_LABEL_KEY: Record<FeedbackCategory, string> = {
  BUG: 'feedbackCategoryBug',
  SUGGESTION: 'feedbackCategorySuggestion',
  OTHER: 'feedbackCategoryOther',
};

const STATUS_LABEL_KEY: Record<FeedbackStatus, string> = {
  PENDING: 'feedbackStatusPending',
  REPLIED: 'feedbackStatusReplied',
  RESOLVED: 'feedbackStatusResolved',
};

export default function FeedbackListScreen({ navigation }: Props) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language as 'tc' | 'sc' | 'en';
  const {
    data,
    isLoading,
    isRefetching,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useMyFeedback();
  const items = useMemo(() => flattenFeedbackPages(data), [data]);

  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const renderItem = useCallback(
    ({ item }: { item: Feedback }) => (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.7}
        onPress={() => navigation.navigate('FeedbackDetail', { id: item.id })}
      >
        {/* Top row: category + status tag */}
        <View style={styles.cardTopRow}>
          <Text style={[styles.categoryLabel, getLocalizedFontStyle(lang, 'medium')]}>
            {t(CATEGORY_LABEL_KEY[item.category])}
          </Text>
          <View
            style={[
              styles.statusTag,
              { backgroundColor: STATUS_COLORS[item.status].bg },
            ]}
          >
            <Text
              style={[
                styles.statusTagText,
                { color: STATUS_COLORS[item.status].text },
                getLocalizedFontStyle(lang, 'medium'),
              ]}
            >
              {t(STATUS_LABEL_KEY[item.status])}
            </Text>
          </View>
        </View>

        {/* Description preview */}
        <Text
          style={[styles.descriptionPreview, getLocalizedFontStyle(lang, 'regular')]}
          numberOfLines={2}
        >
          {item.description}
        </Text>

        {/* Time */}
        <Text style={[styles.timeText, getLocalizedFontStyle(lang, 'regular')]}>
          {getRelativeTime(item.createdAt, lang)}
        </Text>
      </TouchableOpacity>
    ),
    [navigation, t, lang],
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <BackIcon size={26} color="#0C1015" />
        </TouchableOpacity>
        <Text style={[styles.topBarTitle, getLocalizedFontStyle(lang, 'bold')]}>
          {t('feedbackList')}
        </Text>
        <View style={styles.spacer} />
      </View>

      {/* Feedback List */}
      <FlatList
        data={items}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        refreshing={isRefetching}
        onRefresh={refetch}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.5}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          !isLoading && !isRefetching ? (
            <EmptyState
              title={t('feedbackEmpty')}
              message={t('feedbackEmptyMessage')}
              actionLabel={t('feedbackEmptyAction')}
              onAction={() => navigation.navigate('FeedbackSubmit')}
            />
          ) : null
        }
        ListFooterComponent={
          isFetchingNextPage ? (
            <View style={styles.footerLoader}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          ) : null
        }
      />

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        activeOpacity={0.85}
        onPress={() => navigation.navigate('FeedbackSubmit')}
      >
        <PlusIcon size={28} color={colors.onPrimary} />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  /* Top Bar */
  topBar: {
    height: 62,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: 12,
    paddingRight: 16,
  },
  backBtn: {
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarTitle: {
    position: 'absolute',
    left: 0,
    right: 0,
    textAlign: 'center',
    fontSize: 18,
    lineHeight: 24,
    fontFamily: 'SourceHanSansCN-Bold',
    color: '#0C1015',
    pointerEvents: 'none',
  },
  spacer: {
    width: 26,
  },

  /* List */
  listContent: {
    flexGrow: 1,
    paddingTop: 8,
    paddingBottom: 100,
  },

  /* Card */
  card: {
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryLabel: {
    fontSize: 13,
    fontFamily: 'SourceHanSansCN-Medium',
    color: '#0C1015',
  },
  statusTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  statusTagText: {
    fontSize: 11,
    fontFamily: 'SourceHanSansCN-Medium',
  },
  descriptionPreview: {
    fontSize: 14,
    fontFamily: 'SourceHanSansCN-Regular',
    color: '#4E5969',
    lineHeight: 20,
    marginBottom: 8,
  },
  timeText: {
    fontSize: 12,
    fontFamily: 'SourceHanSansCN-Regular',
    color: '#86909C',
  },

  /* Footer */
  footerLoader: {
    paddingVertical: 16,
    alignItems: 'center',
  },

  /* FAB */
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 32,
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...elevation[3],
  },
});
