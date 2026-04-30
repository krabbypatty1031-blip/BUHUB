import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useTranslation } from 'react-i18next';
import { colors } from '../../theme/colors';
import { fontFamily } from '../../theme/typography';
import TranslatableText from './TranslatableText';

type QuoteCardProps = {
  postId: string;
  content: string;
  sourceLanguage?: string | null;
  author: string;
  timeLabel: string;
  onPress?: () => void;
};

/** Figma 引用帖子小图标 (双引号) */
function QuoteSmallIcon({ size = 12, color = '#0C1015' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size * (15.904 / 16.705)} viewBox="0 0 16.705 15.904" fill="none">
      <Path
        d="M.752 13.479v.873c0 .442.358.8.8.8a6.6 6.6 0 005.6-5.6V2.352a1.6 1.6 0 00-1.6-1.6H2.352a1.6 1.6 0 00-1.6 1.6v3.8a2 2 0 002 2c.331 0 .6.269.6.6v2.527a.8.8 0 01-.8.8 1.6 1.6 0 00-1.6 1.6z"
        stroke={color} strokeWidth={1.504}
      />
      <Path
        d="M9.553 13.479v.873c0 .442.358.8.8.8a6.6 6.6 0 005.6-5.6V2.352a1.6 1.6 0 00-1.6-1.6h-3.2a1.6 1.6 0 00-1.6 1.6v3.8a2 2 0 002 2c.331 0 .6.269.6.6v2.527a.8.8 0 01-.8.8 1.6 1.6 0 00-1.6 1.6z"
        stroke={color} strokeWidth={1.504}
      />
    </Svg>
  );
}

/** Figma chevron right arrow */
function ChevronRightSmall({ size = 18, color = '#C1C1C1' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 18 18" fill="none">
      <Path d="M7.125 4.5L11.625 9 7.125 13.5" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export default function QuoteCard({
  postId,
  content,
  sourceLanguage,
  author,
  timeLabel,
  onPress,
}: QuoteCardProps) {
  const { t } = useTranslation();
  const isPressable = !!onPress;

  return (
    <TouchableOpacity
      activeOpacity={isPressable ? 0.85 : 1}
      disabled={!isPressable}
      onPress={onPress}
      style={styles.card}
    >
      <View style={styles.accentBar} />

      <View style={styles.inner}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.iconWrap}>
              <QuoteSmallIcon size={10} color="#0C1015" />
            </View>
            <Text style={styles.label}>{t('quotePost')}</Text>
          </View>
          <ChevronRightSmall size={18} color="#C1C1C1" />
        </View>

        <TranslatableText
          entityType="post"
          entityId={postId}
          fieldName="content"
          sourceText={content}
          sourceLanguage={sourceLanguage}
          textStyle={styles.content}
          numberOfLines={1}
        />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: '#DEE2E5',
    backgroundColor: colors.surface,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  accentBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: '#0C1015',
  },
  inner: {
    paddingLeft: 16,
    paddingRight: 12,
    paddingVertical: 12,
    gap: 6,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  iconWrap: {
    width: 20,
    height: 20,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F7F7F7',
  },
  label: {
    fontFamily: fontFamily.medium,
    fontSize: 12,
    color: '#86909C',
  },
  content: {
    fontFamily: fontFamily.medium,
    fontSize: 14,
    lineHeight: 20,
    color: '#0C1015',
  },
});
