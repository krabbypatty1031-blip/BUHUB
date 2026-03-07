import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { ForumStackParamList } from '../../types/navigation';
import { useUIStore } from '../../store/uiStore';
import { useImagePicker } from '../../hooks/useImagePicker';
import { useCreatePost, usePostDetail } from '../../hooks/usePosts';
import { uploadService } from '../../api/services/upload.service';
import ImagePreviewModal from '../../components/common/ImagePreviewModal';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import QuoteCard from '../../components/common/QuoteCard';
import FunctionRefCard from '../../components/common/FunctionRefCard';
import { CloseIcon, PlusIcon, CameraIcon, UserIcon } from '../../components/common/icons';
import { buildPostMeta } from '../../utils/formatTime';
import type { Language } from '../../types';
import IOSSwitch from '../../components/common/IOSSwitch';

type Props = NativeStackScreenProps<ForumStackParamList, 'Compose'>;

const TAGS = [
  'tagTreehole',
  'tagJobReferral',
  'tagCourseExchange',
  'tagCampusLife',
  'tagLostFound',
  'tagStudyHelp',
] as const;

export default function ComposeScreen({ navigation, route }: Props) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language as Language;
  const showSnackbar = useUIStore((s) => s.showSnackbar);
  const createPost = useCreatePost();
  const requestedType = route.params?.type || 'text';
  const quotePostId = route.params?.quotePostId;
  const { data: quotedPostData } = usePostDetail(quotePostId || '');
  const quotedPost = quotePostId ? quotedPostData : undefined;
  const quotedMeta = quotedPost
    ? buildPostMeta(t, lang, {
        gradeKey: quotedPost.gradeKey,
        majorKey: quotedPost.majorKey,
        createdAt: quotedPost.createdAt,
        isAnonymous: quotedPost.isAnonymous,
      })
    : '';
  const functionType = route.params?.functionType;
  const functionTitle = route.params?.functionTitle;
  const functionId = route.params?.functionId ?? (route.params?.functionIndex != null ? String(route.params.functionIndex) : undefined);
  const hasFunctionRef = !!(functionType && functionTitle && functionId);
  const type = hasFunctionRef ? 'text' : requestedType;

  const { images, pickImages, removeImage } = useImagePicker({ allowsMultiple: true, maxImages: 9 });
  const [content, setContent] = useState('');
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [pollOptions, setPollOptions] = useState(['', '']);

  const typeLabels: Record<string, string> = {
    image: t('imagePost'),
    text: t('textPost'),
    poll: t('poll'),
  };

  const toggleTag = useCallback((tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? [] : [tag]
    );
  }, []);

  const addPollOption = useCallback(() => {
    if (pollOptions.length < 10) {
      setPollOptions([...pollOptions, '']);
    }
  }, [pollOptions]);

  const updatePollOption = useCallback(
    (index: number, value: string) => {
      const updated = [...pollOptions];
      updated[index] = value;
      setPollOptions(updated);
    },
    [pollOptions]
  );

  const removePollOption = useCallback(
    (index: number) => {
      if (pollOptions.length <= 2) return;
      setPollOptions(pollOptions.filter((_, i) => i !== index));
    },
    [pollOptions]
  );

  const [isPosting, setIsPosting] = useState(false);

  const handlePost = useCallback(async () => {
    if (!content.trim() || isPosting) return;
    if (type === 'poll') {
      const validOpts = pollOptions.filter((o) => o.trim());
      if (validOpts.length < 2) {
        showSnackbar({ message: t('pollOptionsMin'), type: 'error' });
        return;
      }
    }
    setIsPosting(true);
    try {
      // Upload images if any
      let imageUrls: string[] | undefined;
      if (images.length > 0) {
        const result = await uploadService.uploadImages(
          images.map((uri, i) => ({ uri, type: 'image/jpeg', name: `post-image-${i}.jpg` }))
        );
        imageUrls = result.urls;
      }

      createPost.mutate(
        {
          content: content.trim(),
          tags: selectedTags.length > 0 ? selectedTags : undefined,
          isAnonymous,
          pollOptions: type === 'poll' ? pollOptions.filter((o) => o.trim()).slice(0, 10) : undefined,
          images: type === 'poll' ? [] : imageUrls,
          quotedPostId: quotePostId,
          functionType: hasFunctionRef ? functionType : undefined,
          functionId: hasFunctionRef ? functionId : undefined,
          functionTitle: hasFunctionRef ? functionTitle : undefined,
        },
        {
          onSuccess: () => {
            showSnackbar({ message: t('postSuccess'), type: 'success' });
            navigation.goBack();
          },
          onError: (err: any) => {
            const code = err?.errorCode || err?.code;
            const msg = code === 'CONTENT_VIOLATION' ? t('contentViolation') : t('postFailed');
            showSnackbar({ message: msg, type: 'error' });
          },
          onSettled: () => {
            setIsPosting(false);
          },
        }
      );
    } catch (error: any) {
      const code = error?.errorCode || error?.code;
      let msg = t('postFailed');
      if (code === 'CONTENT_VIOLATION') msg = error?.message?.includes('Image') ? t('imageViolation') : t('contentViolation');
      else if (error?.message) msg = error.message;
      showSnackbar({ message: msg, type: 'error' });
      setIsPosting(false);
    }
  }, [content, images, selectedTags, isAnonymous, type, pollOptions, isPosting, createPost, navigation, showSnackbar, t, functionType, functionId, functionTitle, quotePostId, hasFunctionRef]);

  return (
      <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
          <CloseIcon size={24} color={colors.onSurface} />
        </TouchableOpacity>
        <Text style={styles.headerType}>{typeLabels[type]}</Text>
        <TouchableOpacity
          style={[styles.postBtn, !content.trim() && styles.postBtnDisabled]}
          onPress={handlePost}
          disabled={!content.trim()}
        >
          <Text
            style={[styles.postBtnText, !content.trim() && styles.postBtnTextDisabled]}
          >
            {t('post')}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        {/* Quoted Post */}
        {quotedPost && (
          <View style={styles.quoteCardWrap}>
            <QuoteCard
              postId={quotedPost.id}
              content={quotedPost.content}
              sourceLanguage={quotedPost.sourceLanguage}
              author={quotedPost.name}
              timeLabel={quotedMeta}
              onPress={() => navigation.navigate('PostDetail', { postId: quotedPost.id })}
            />
          </View>
        )}


        {/* Function Reference Card */}
        {hasFunctionRef && (
          <View style={styles.quoteCardWrap}>
            <FunctionRefCard
              functionType={functionType!}
              title={functionTitle}
            />
          </View>
        )}

        {/* Content */}
        <TextInput
          style={styles.textarea}
          placeholder={type === 'poll' ? t('describePoll') : t('shareThoughts')}
          placeholderTextColor={colors.onSurfaceVariant}
          multiline
          textAlignVertical="top"
          value={content}
          onChangeText={setContent}
        />

        {/* Image Add Area */}
        {type === 'image' && (
          <View style={styles.mediaRow}>
            {images.map((uri, i) => (
              <View key={i} style={styles.mediaThumb}>
                <TouchableOpacity
                  activeOpacity={0.9}
                  onPress={() => {
                    setPreviewIndex(i);
                    setPreviewVisible(true);
                  }}
                >
                  <Image source={{ uri }} style={styles.mediaImage} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.mediaRemove} onPress={() => removeImage(i)}>
                  <CloseIcon size={14} color={colors.onPrimary} />
                </TouchableOpacity>
              </View>
            ))}
            {images.length < 9 && (
              <TouchableOpacity style={styles.mediaAdd} onPress={pickImages}>
                <CameraIcon size={28} color={colors.primary} />
                <Text style={styles.mediaAddCount}>{images.length}/9</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
        <ImagePreviewModal
          visible={previewVisible}
          images={images}
          initialIndex={previewIndex}
          onClose={() => setPreviewVisible(false)}
        />

        {/* Poll Form */}
        {type === 'poll' && (
          <View style={styles.pollForm}>
            {pollOptions.map((opt, i) => (
              <View key={i} style={styles.pollOptionRow}>
                <TextInput
                  style={styles.pollOptionInput}
                  placeholder={`${t('optionN')} ${i + 1}`}
                  placeholderTextColor={colors.onSurfaceVariant}
                  value={opt}
                  onChangeText={(val) => updatePollOption(i, val)}
                />
                {pollOptions.length > 2 && (
                  <TouchableOpacity onPress={() => removePollOption(i)}>
                    <CloseIcon size={18} color={colors.onSurfaceVariant} />
                  </TouchableOpacity>
                )}
              </View>
            ))}
            {pollOptions.length < 10 && (
              <TouchableOpacity style={styles.addOptionBtn} onPress={addPollOption}>
                <PlusIcon size={18} color={colors.primary} />
                <Text style={styles.addOptionText}>{t('addOption')}</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Tags */}
        <View style={styles.tagsSection}>
          <Text style={styles.tagsTitle}>{t('selectCircle')}</Text>
          <View style={styles.tagsGrid}>
            {TAGS.map((tagKey) => {
              const label = t(tagKey);
              const selected = selectedTags.includes(tagKey);
              return (
                <TouchableOpacity
                  key={tagKey}
                  style={[styles.tag, selected && styles.tagSelected]}
                  onPress={() => toggleTag(tagKey)}
                >
                  <Text style={[styles.tagText, selected && styles.tagTextSelected]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Options */}
        <View style={styles.optionsSection}>
          <View style={styles.optionRow}>
            <View style={styles.optionLabel}>
              <UserIcon size={20} color={colors.onSurfaceVariant} />
              <Text style={styles.optionText}>{t('anonymous')}</Text>
            </View>
            <IOSSwitch
              value={isAnonymous}
              onValueChange={setIsAnonymous}
              activeColor={colors.onSurface}
            />
          </View>
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
  header: {
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
  headerType: {
    flex: 1,
    textAlign: 'center',
    ...typography.titleSmall,
    color: colors.onSurface,
  },
  postBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.xl,
  },
  postBtnDisabled: {
    backgroundColor: colors.surfaceVariant,
  },
  postBtnText: {
    ...typography.labelLarge,
    color: colors.onPrimary,
  },
  postBtnTextDisabled: {
    color: colors.onSurfaceVariant,
  },
  scroll: {
    flex: 1,
  },
  textarea: {
    ...typography.bodyLarge,
    color: colors.onSurface,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    minHeight: 160,
  },
  mediaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  mediaThumb: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    position: 'relative',
  },
  mediaImage: {
    width: '100%',
    height: '100%',
    borderRadius: borderRadius.md,
  },
  mediaRemove: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.scrimHeavy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaAdd: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: colors.primaryContainer,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryContainer + '20',
    gap: spacing.xs,
  },
  mediaAddCount: {
    ...typography.labelSmall,
    color: colors.primary,
  },
  // Poll
  pollForm: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  pollOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  pollOptionInput: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderColor: '#000000',
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.md,
    ...typography.bodyMedium,
    color: colors.onSurface,
  },
  addOptionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
  },
  addOptionText: {
    ...typography.labelMedium,
    color: colors.primary,
  },
  // Tags
  tagsSection: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.outlineVariant,
  },
  tagsTitle: {
    ...typography.titleSmall,
    color: colors.onSurface,
    marginBottom: spacing.md,
  },
  tagsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  tag: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  tagSelected: {
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  tagText: {
    ...typography.bodySmall,
    color: colors.onSurfaceVariant,
    fontWeight: '500',
  },
  tagTextSelected: {
    color: colors.onPrimary,
    fontWeight: '700',
  },
  // Options
  optionsSection: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.outlineVariant,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  optionLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  optionText: {
    ...typography.bodyLarge,
    color: colors.onSurface,
  },
  quoteCardWrap: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
  },
});

