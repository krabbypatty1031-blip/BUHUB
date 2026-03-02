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
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import GradientCard from '../../components/common/GradientCard';
import { CloseIcon, PlusIcon, CameraIcon, UserIcon, QuoteIcon } from '../../components/common/icons';
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
  const type = route.params?.type || 'text';
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

  const { images, pickImages, removeImage } = useImagePicker({ allowsMultiple: true, maxImages: 9 });
  const [content, setContent] = useState('');
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
          functionType,
          functionId,
          functionTitle,
        },
        {
          onSuccess: () => {
            showSnackbar({ message: t('post') + ' ✓', type: 'success' });
            navigation.goBack();
          },
          onError: () => {
            showSnackbar({ message: t('postFailed'), type: 'error' });
          },
          onSettled: () => {
            setIsPosting(false);
          },
        }
      );
    } catch (error: any) {
      showSnackbar({ message: error?.message || t('postFailed'), type: 'error' });
      setIsPosting(false);
    }
  }, [content, images, selectedTags, isAnonymous, type, pollOptions, isPosting, createPost, navigation, showSnackbar, t, functionType, functionId, functionTitle, quotePostId]);

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

      <ScrollView style={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Quoted Post */}
        {quotedPost && (
          <GradientCard colors={['#EEEEEE', '#F7F7F7']} style={styles.quoteCard}>
            <View style={styles.quoteHeader}>
              <QuoteIcon size={12} color="#999999" />
              <Text style={styles.quoteLabel}>{t('quotePost')}</Text>
            </View>
            <Text style={styles.quoteContent} numberOfLines={3}>{quotedPost.content}</Text>
            <Text style={styles.quoteMeta}>{quotedPost.name} · {quotedMeta}</Text>
          </GradientCard>
        )}

        {/* Function Reference Card */}
        {functionType && functionTitle && (
          <GradientCard colors={['#EEEEEE', '#F7F7F7']} style={styles.quoteCard}>
            <Text style={styles.functionRefType}>
              {functionType === 'partner' ? t('findPartner') :
               functionType === 'errand' ? t('errands') :
               functionType === 'secondhand' ? t('secondhand') : ''}
            </Text>
            <Text style={styles.functionRefTitle} numberOfLines={1}>{functionTitle}</Text>
          </GradientCard>
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
                <Image source={{ uri }} style={styles.mediaImage} />
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
  quoteCard: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    padding: spacing.lg,
    borderRadius: borderRadius.md,
  },
  quoteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  quoteLabel: {
    ...typography.labelSmall,
    color: '#999999',
    fontWeight: '500',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  quoteContent: {
    ...typography.bodySmall,
    color: '#000000',
    fontWeight: '600',
    lineHeight: 18,
    marginBottom: spacing.xs,
  },
  quoteMeta: {
    ...typography.labelSmall,
    color: '#999999',
    fontWeight: '400',
  },
  functionRefType: {
    ...typography.labelSmall,
    color: '#999999',
    fontWeight: '600',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    marginBottom: spacing.xs,
  },
  functionRefTitle: {
    ...typography.bodyMedium,
    color: '#000000',
    fontWeight: '500',
  },
});
