import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Image,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { ForumStackParamList } from '../../types/navigation';
import { useUIStore } from '../../store/uiStore';
import { useImagePicker } from '../../hooks/useImagePicker';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { CloseIcon, PlusIcon, UserIcon, QuoteIcon } from '../../components/common/icons';
import { mockPosts } from '../../data/mock/forum';
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
  const { t } = useTranslation();
  const showSnackbar = useUIStore((s) => s.showSnackbar);
  const type = route.params?.type || 'text';
  const quotePostId = route.params?.quotePostId;
  const quotedPost = quotePostId ? mockPosts.find((p) => p.id === quotePostId) : undefined;
  const functionType = route.params?.functionType;
  const functionTitle = route.params?.functionTitle;

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
    if (pollOptions.length < 6) {
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

  const handlePost = useCallback(() => {
    if (!content.trim()) return;
    showSnackbar({ message: t('post') + ' ✓', type: 'success' });
    navigation.goBack();
  }, [content, navigation, showSnackbar, t]);

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
          <View style={styles.quoteCard}>
            <View style={styles.quoteHeader}>
              <QuoteIcon size={14} color={colors.primary} />
              <Text style={styles.quoteLabel}>{t('quotedPost') || 'Quoted Post'}</Text>
            </View>
            <Text style={styles.quoteName}>{quotedPost.name}</Text>
            <Text style={styles.quoteContent} numberOfLines={3}>{quotedPost.content}</Text>
          </View>
        )}

        {/* Function Reference Card */}
        {functionType && functionTitle && (
          <View style={styles.functionRefCard}>
            <Text style={styles.functionRefType}>
              {functionType === 'partner' ? t('findPartner') :
               functionType === 'errand' ? t('errands') :
               functionType === 'secondhand' ? t('secondhand') : ''}
            </Text>
            <Text style={styles.functionRefTitle} numberOfLines={1}>{functionTitle}</Text>
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
                <Image source={{ uri }} style={styles.mediaImage} />
                <TouchableOpacity style={styles.mediaRemove} onPress={() => removeImage(i)}>
                  <CloseIcon size={14} color={colors.onPrimary} />
                </TouchableOpacity>
              </View>
            ))}
            {images.length < 9 && (
              <TouchableOpacity style={styles.mediaAdd} onPress={pickImages}>
                <PlusIcon size={28} color={colors.onSurfaceVariant} />
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
            {pollOptions.length < 6 && (
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
    color: colors.onSurfaceVariant,
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
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
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
    borderColor: colors.outlineVariant,
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
  },
  tagSelected: {
    backgroundColor: colors.primaryContainer,
  },
  tagText: {
    ...typography.bodySmall,
    color: colors.primary,
    fontWeight: '500',
  },
  tagTextSelected: {
    color: colors.onPrimaryContainer,
    fontWeight: '500',
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
  // Quote
  quoteCard: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.surface2,
    borderRadius: borderRadius.sm,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  quoteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  quoteLabel: {
    ...typography.labelSmall,
    color: colors.primary,
  },
  quoteName: {
    ...typography.labelMedium,
    color: colors.onSurface,
    fontWeight: '600',
    marginBottom: 2,
  },
  quoteContent: {
    ...typography.bodySmall,
    color: colors.onSurfaceVariant,
    lineHeight: 18,
  },
  // Function reference
  functionRefCard: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.surface2,
    borderRadius: borderRadius.sm,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  functionRefType: {
    ...typography.labelSmall,
    color: colors.primary,
    fontWeight: '600',
    marginBottom: 2,
  },
  functionRefTitle: {
    ...typography.bodyMedium,
    color: colors.onSurface,
  },
});
