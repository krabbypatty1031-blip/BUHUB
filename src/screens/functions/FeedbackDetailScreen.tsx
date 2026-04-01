import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { FunctionsStackParamList } from '../../types/navigation';
import type { FeedbackCategory, FeedbackStatus } from '../../types/feedback';
import { useFeedbackDetail } from '../../hooks/useFeedback';
import { colors } from '../../theme/colors';
import { getLocalizedFontStyle } from '../../theme/typography';
import ImagePreviewModal from '../../components/common/ImagePreviewModal';
import { BackIcon } from '../../components/common/icons';
import { getRelativeTime } from '../../utils/formatTime';

type Props = NativeStackScreenProps<FunctionsStackParamList, 'FeedbackDetail'>;

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

export default function FeedbackDetailScreen({ navigation, route }: Props) {
  const { id } = route.params;
  const { t, i18n } = useTranslation();
  const lang = i18n.language as 'tc' | 'sc' | 'en';
  const { data: feedback, isLoading } = useFeedbackDetail(id);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewIndex, setPreviewIndex] = useState(0);

  const handleImagePress = useCallback((index: number) => {
    setPreviewIndex(index);
    setPreviewVisible(true);
  }, []);

  // Loading / not found state
  if (!feedback) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <BackIcon size={26} color="#0C1015" />
          </TouchableOpacity>
          <Text style={[styles.topBarTitle, getLocalizedFontStyle(lang, 'bold')]}>
            {t('feedbackDetail')}
          </Text>
          <View style={styles.spacer} />
        </View>
        <View style={styles.emptyContainer}>
          {isLoading ? (
            <ActivityIndicator size="large" color={colors.primary} />
          ) : (
            <Text style={[styles.emptyText, getLocalizedFontStyle(lang, 'regular')]}>
              {t('notFound')}
            </Text>
          )}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <BackIcon size={26} color="#0C1015" />
        </TouchableOpacity>
        <Text style={[styles.topBarTitle, getLocalizedFontStyle(lang, 'bold')]}>
          {t('feedbackDetail')}
        </Text>
        <View style={styles.spacer} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header row: category + status */}
        <View style={styles.headerRow}>
          <Text style={[styles.categoryLabel, getLocalizedFontStyle(lang, 'medium')]}>
            {t(CATEGORY_LABEL_KEY[feedback.category])}
          </Text>
          <View
            style={[
              styles.statusTag,
              { backgroundColor: STATUS_COLORS[feedback.status].bg },
            ]}
          >
            <Text
              style={[
                styles.statusTagText,
                { color: STATUS_COLORS[feedback.status].text },
                getLocalizedFontStyle(lang, 'medium'),
              ]}
            >
              {t(STATUS_LABEL_KEY[feedback.status])}
            </Text>
          </View>
        </View>

        {/* Full description */}
        <View style={styles.descriptionSection}>
          <Text style={[styles.descriptionText, getLocalizedFontStyle(lang, 'regular')]}>
            {feedback.description}
          </Text>
        </View>

        {/* Image thumbnails */}
        {feedback.imageUrls.length > 0 && (
          <View style={styles.imagesRow}>
            {feedback.imageUrls.map((url, index) => (
              <TouchableOpacity
                key={`img-${index}`}
                activeOpacity={0.8}
                onPress={() => handleImagePress(index)}
              >
                <Image
                  source={url}
                  style={styles.thumbnail}
                  contentFit="cover"
                  cachePolicy="memory-disk"
                />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Time */}
        <View style={styles.timeRow}>
          <Text style={[styles.timeText, getLocalizedFontStyle(lang, 'regular')]}>
            {getRelativeTime(feedback.createdAt, lang)}
          </Text>
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Admin replies section */}
        <View style={styles.repliesSection}>
          <Text style={[styles.repliesSectionTitle, getLocalizedFontStyle(lang, 'medium')]}>
            {t('feedbackAdminReply')}
          </Text>

          {feedback.replies.length === 0 ? (
            <View style={styles.awaitingContainer}>
              <Text style={[styles.awaitingText, getLocalizedFontStyle(lang, 'regular')]}>
                {t('feedbackAwaitingReply')}
              </Text>
            </View>
          ) : (
            feedback.replies.map((reply) => (
              <View key={reply.id} style={styles.replyCard}>
                <Text style={[styles.replyAdminName, getLocalizedFontStyle(lang, 'medium')]}>
                  {reply.admin.nickname}
                </Text>
                <Text style={[styles.replyContent, getLocalizedFontStyle(lang, 'regular')]}>
                  {reply.content}
                </Text>
                <Text style={[styles.replyTime, getLocalizedFontStyle(lang, 'regular')]}>
                  {getRelativeTime(reply.createdAt, lang)}
                </Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* Image Preview Modal */}
      <ImagePreviewModal
        visible={previewVisible}
        images={feedback?.imageUrls ?? []}
        initialIndex={previewIndex}
        onClose={() => setPreviewVisible(false)}
      />
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

  /* Empty / loading */
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  emptyText: {
    fontSize: 16,
    fontFamily: 'SourceHanSansCN-Regular',
    color: '#86909C',
  },

  /* Scroll content */
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },

  /* Header row */
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  categoryLabel: {
    fontSize: 14,
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

  /* Description */
  descriptionSection: {
    marginBottom: 20,
  },
  descriptionText: {
    fontSize: 15,
    fontFamily: 'SourceHanSansCN-Regular',
    color: '#4E5969',
    lineHeight: 22,
  },

  /* Images */
  imagesRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  thumbnail: {
    width: 100,
    height: 100,
    borderRadius: 8,
  },

  /* Time */
  timeRow: {
    marginBottom: 24,
  },
  timeText: {
    fontSize: 12,
    fontFamily: 'SourceHanSansCN-Regular',
    color: '#86909C',
  },

  /* Divider */
  divider: {
    height: 0.5,
    backgroundColor: '#F0F0F0',
    marginBottom: 20,
  },

  /* Replies section */
  repliesSection: {},
  repliesSectionTitle: {
    fontSize: 14,
    fontFamily: 'SourceHanSansCN-Medium',
    color: '#0C1015',
    marginBottom: 12,
  },

  /* Awaiting placeholder */
  awaitingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  awaitingText: {
    fontSize: 14,
    fontFamily: 'SourceHanSansCN-Regular',
    color: '#86909C',
  },

  /* Reply card */
  replyCard: {
    backgroundColor: '#F7F8FA',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },
  replyAdminName: {
    fontSize: 13,
    fontFamily: 'SourceHanSansCN-Medium',
    color: '#0C1015',
    marginBottom: 4,
  },
  replyContent: {
    fontSize: 14,
    fontFamily: 'SourceHanSansCN-Regular',
    color: '#4E5969',
    lineHeight: 20,
    marginBottom: 6,
  },
  replyTime: {
    fontSize: 11,
    fontFamily: 'SourceHanSansCN-Regular',
    color: '#86909C',
  },
});
