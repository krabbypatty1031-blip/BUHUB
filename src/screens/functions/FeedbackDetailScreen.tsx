import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { FeedbackCategory, FeedbackStatus } from '../../types/feedback';

type FeedbackStackParamList = {
  FeedbackList: undefined;
  FeedbackSubmit: undefined;
  FeedbackDetail: { id: string };
};
import { useFeedbackDetail, useReplyFeedback } from '../../hooks/useFeedback';
import { colors } from '../../theme/colors';
import { getLocalizedFontStyle } from '../../theme/typography';
import Avatar from '../../components/common/Avatar';
import ImagePreviewModal from '../../components/common/ImagePreviewModal';
import ScreenHeader from '../../components/common/ScreenHeader';
import { getRelativeTime } from '../../utils/formatTime';

type Props = NativeStackScreenProps<FeedbackStackParamList, 'FeedbackDetail'>;

const STATUS_COLORS: Record<FeedbackStatus, { bg: string; text: string }> = {
  UNRESOLVED: { bg: '#FFF8E1', text: '#F59E0B' },
  RESOLVED: { bg: '#ECFDF5', text: '#22C55E' },
  CLOSED: { bg: '#F2F3F5', text: '#86909C' },
};

const CATEGORY_LABEL_KEY: Record<FeedbackCategory, string> = {
  BUG: 'feedbackCategoryBug',
  SUGGESTION: 'feedbackCategorySuggestion',
  OTHER: 'feedbackCategoryOther',
};

const STATUS_LABEL_KEY: Record<FeedbackStatus, string> = {
  UNRESOLVED: 'feedbackStatusUnresolved',
  RESOLVED: 'feedbackStatusResolved',
  CLOSED: 'feedbackStatusClosed',
};

export default function FeedbackDetailScreen({ navigation, route }: Props) {
  const { id } = route.params;
  const { t, i18n } = useTranslation();
  const lang = i18n.language as 'tc' | 'sc' | 'en';
  const { data: feedback, isLoading } = useFeedbackDetail(id);
  const { mutate: replyFeedback, isPending: isReplying } = useReplyFeedback();
  
  const insets = useSafeAreaInsets();
  
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [replyContent, setReplyContent] = useState('');
  
  const scrollViewRef = useRef<ScrollView>(null);

  const handleImagePress = useCallback((index: number) => {
    setPreviewIndex(index);
    setPreviewVisible(true);
  }, []);

  const handleSendReply = useCallback(() => {
    if (!replyContent.trim() || !feedback) return;
    
    replyFeedback(
      { id: feedback.id, content: replyContent.trim() },
      {
        onSuccess: () => {
          setReplyContent('');
          setTimeout(() => {
            scrollViewRef.current?.scrollToEnd({ animated: true });
          }, 100);
        },
        onError: (error: any) => {
          const errorCode = error?.response?.data?.error?.code;
          if (errorCode === 'FEEDBACK_REPLY_LIMIT_REACHED') {
            Alert.alert(t('error'), t('feedbackReplyLimitReached'));
          } else {
            Alert.alert(t('error'), t('uploadFailed'));
          }
        }
      }
    );
  }, [replyContent, feedback, replyFeedback, t]);

  // Loading / not found state
  if (!feedback) {
    return (
      <SafeAreaView style={styles.container}>
        <ScreenHeader
          variant="campus"
          title={t('feedbackDetail')}
          onBack={() => navigation.goBack()}
          titleStyle={getLocalizedFontStyle(lang, 'bold')}
        />
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

  const hasAdminReplied = feedback.replies.some((r) => r.isAdmin);
  const userRepliesCount = feedback.replies.filter((r) => !r.isAdmin).length;
  const statusKey = feedback.status;
  const statusColor = STATUS_COLORS[statusKey] || STATUS_COLORS.UNRESOLVED;
  const statusLabel = STATUS_LABEL_KEY[statusKey] || STATUS_LABEL_KEY.UNRESOLVED;
  const canReply =
    statusKey !== 'CLOSED' && (hasAdminReplied || userRepliesCount < 3);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <ScreenHeader
        variant="campus"
        title={t('feedbackDetail')}
        onBack={() => navigation.goBack()}
        titleStyle={getLocalizedFontStyle(lang, 'bold')}
      />

      <KeyboardAvoidingView
        style={styles.flex1}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header row: category + status */}
          <View style={styles.headerRow}>
            <Text style={[styles.categoryLabel, getLocalizedFontStyle(lang, 'medium')]}>
              {t(CATEGORY_LABEL_KEY[feedback.category])}
            </Text>
            <View
              style={[
                styles.statusTag,
                { backgroundColor: statusColor.bg },
              ]}
            >
              <Text
                style={[
                  styles.statusTagText,
                  { color: statusColor.text },
                  getLocalizedFontStyle(lang, 'medium'),
                ]}
              >
                {t(statusLabel)}
              </Text>
            </View>
          </View>

          {/* Full description (Original Post) */}
          <View style={styles.originalPostContainer}>
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
          </View>

          {/* Replies section */}
          <View style={styles.repliesSection}>
            {feedback.replies.length === 0 ? (
              <View style={styles.awaitingContainer}>
                <Text style={[styles.awaitingText, getLocalizedFontStyle(lang, 'regular')]}>
                  {t('feedbackAwaitingReply')}
                </Text>
              </View>
            ) : (
              feedback.replies.map((reply) => {
                const isUser = !reply.isAdmin;
                return (
                  <View
                    key={reply.id}
                    style={[
                      styles.replyCard,
                      isUser ? styles.replyCardUser : styles.replyCardAdmin,
                    ]}
                  >
                    <View style={styles.replyHeader}>
                      <View style={{ marginRight: 8 }}>
                        <Avatar
                          uri={reply.user?.avatar}
                          text={reply.user?.nickname || (reply.isAdmin ? 'A' : 'U')}
                          size="xxs"
                        />
                      </View>
                      <Text style={[styles.replyName, getLocalizedFontStyle(lang, 'medium'), isUser && { color: '#FFFFFF' }]}>
                        {reply.isAdmin ? (reply.user?.nickname || 'Developer') : (reply.user?.nickname || 'You')}
                        {reply.isAdmin && <Text style={{ color: colors.primary }}> (Admin)</Text>}
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.replyContent,
                        getLocalizedFontStyle(lang, 'regular'),
                        isUser && { color: '#FFFFFF' }
                      ]}
                    >
                      {reply.content}
                    </Text>
                    <Text
                      style={[
                        styles.replyTime,
                        getLocalizedFontStyle(lang, 'regular'),
                        isUser && { color: 'rgba(255,255,255,0.7)' }
                      ]}
                    >
                      {getRelativeTime(reply.createdAt, lang)}
                    </Text>
                  </View>
                );
              })
            )}
          </View>
        </ScrollView>

        {/* Reply Input Bar */}
        <View style={[styles.inputContainer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          {statusKey === 'CLOSED' ? (
            <Text style={[styles.statusMessage, getLocalizedFontStyle(lang, 'regular')]}>
              {t('feedbackClosedMessage')}
            </Text>
          ) : !canReply ? (
            <Text style={[styles.statusMessage, getLocalizedFontStyle(lang, 'regular')]}>
              {t('feedbackLimitMessage', { current: userRepliesCount, max: 3 })}
            </Text>
          ) : (
            <View style={styles.inputWrapper}>
              <TextInput
                style={[styles.input, getLocalizedFontStyle(lang, 'regular')]}
                placeholder={t('feedbackReplyPlaceholder')}
                placeholderTextColor="#86909C"
                value={replyContent}
                onChangeText={setReplyContent}
                multiline
                maxLength={500}
              />
              <TouchableOpacity
                style={[
                  styles.sendButton,
                  (!replyContent.trim() || isReplying) && styles.sendButtonDisabled,
                ]}
                onPress={handleSendReply}
                disabled={!replyContent.trim() || isReplying}
              >
                {isReplying ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={[styles.sendButtonText, getLocalizedFontStyle(lang, 'medium')]}>
                    {t('send')}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>

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
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  flex1: { flex: 1 },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyText: { fontSize: 16, color: '#86909C' },
  scrollContent: { padding: 16, paddingBottom: 40 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  categoryLabel: { fontSize: 14, color: '#0C1015' },
  statusTag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 },
  statusTagText: { fontSize: 11 },
  originalPostContainer: { backgroundColor: '#F7F8FA', padding: 16, borderRadius: 12, marginBottom: 24 },
  descriptionSection: { marginBottom: 16 },
  descriptionText: { fontSize: 15, color: '#4E5969', lineHeight: 22 },
  imagesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  thumbnail: { width: 80, height: 80, borderRadius: 8 },
  timeRow: { alignItems: 'flex-start' },
  timeText: { fontSize: 12, color: '#86909C' },
  repliesSection: { marginTop: 8 },
  awaitingContainer: { padding: 20, alignItems: 'center' },
  awaitingText: { fontSize: 14, color: '#86909C' },
  replyCard: { padding: 12, borderRadius: 10, marginBottom: 12, maxWidth: '85%' },
  replyCardAdmin: { backgroundColor: '#F0F5FF', borderBottomLeftRadius: 2, alignSelf: 'flex-start' },
  replyCardUser: { backgroundColor: colors.primary, borderBottomRightRadius: 2, alignSelf: 'flex-end' },
  replyHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  replyAvatar: { width: 20, height: 20, borderRadius: 10, marginRight: 8 },
  replyName: { fontSize: 13, color: '#0C1015' },
  replyContent: { fontSize: 15, color: '#1D2129', lineHeight: 22, marginBottom: 6 },
  replyTime: { fontSize: 11, color: '#86909C', alignSelf: 'flex-end' },
  inputContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 0.5,
    borderTopColor: '#E5E6EB',
    backgroundColor: '#FFFFFF',
  },
  statusMessage: { textAlign: 'center', color: '#86909C', fontSize: 13, marginVertical: 8 },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#F2F3F5',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  input: {
    flex: 1,
    minHeight: 24,
    maxHeight: 100,
    fontSize: 15,
    color: '#1D2129',
    paddingTop: 0,
    paddingBottom: 0,
  },
  sendButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    marginLeft: 8,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 60,
  },
  sendButtonDisabled: { opacity: 0.5 },
  sendButtonText: { color: '#FFFFFF', fontSize: 13 },
});
