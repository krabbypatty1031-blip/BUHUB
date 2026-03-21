import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useTranslation } from 'react-i18next';
import { colors } from '../../theme/colors';
import { borderRadius, spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import type { FunctionRefPreview } from '../../types';
import {
  PartnerFnIcon,
  ErrandFnIcon,
  SecondhandFnIcon,
  RatingFnIcon,
} from '../functions/FunctionHubIcons';
import TranslatableText from './TranslatableText';

type FunctionRefCardProps = {
  functionType: string;
  title?: string | null;
  preview?: FunctionRefPreview | null;
  onPress?: () => void;
};

const FUNCTION_COLORS: Record<string, string> = {
  partner: '#3B82F6',
  errand: '#FF9145',
  secondhand: '#02AF4A',
  rating: '#FFA814',
};

function getFunctionColor(functionType: string) {
  return FUNCTION_COLORS[functionType] ?? '#0C1015';
}

function FunctionTypeIcon({ functionType }: { functionType: string }) {
  const c = getFunctionColor(functionType);
  if (functionType === 'partner') return <PartnerFnIcon size={13} color={c} />;
  if (functionType === 'errand') return <ErrandFnIcon size={13} color={c} />;
  if (functionType === 'secondhand') return <SecondhandFnIcon size={13} color={c} />;
  if (functionType === 'rating') return <RatingFnIcon size={13} color={c} />;
  return <PartnerFnIcon size={13} color="#0C1015" />;
}

/** Figma chevron right arrow */
function ChevronRightSmall({ size = 18, color = '#C1C1C1' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 18 18" fill="none">
      <Path d="M7.125 4.5L11.625 9 7.125 13.5" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function getTranslationFieldName(entityType: FunctionRefPreview['entityType']) {
  return entityType === 'rating' ? 'name' : 'title';
}

export default function FunctionRefCard({ functionType, title, preview, onPress }: FunctionRefCardProps) {
  const { t } = useTranslation();
  const isPressable = !!onPress;
  const resolvedTitle = preview?.title ?? title;

  const typeLabel =
    functionType === 'partner'
      ? t('findPartner')
      : functionType === 'errand'
        ? t('errands')
        : functionType === 'secondhand'
          ? t('secondhand')
          : functionType === 'rating'
            ? t('ratings')
            : t('forum');

  const accentColor = getFunctionColor(functionType);

  return (
    <TouchableOpacity
      activeOpacity={isPressable ? 0.85 : 1}
      disabled={!isPressable}
      onPress={onPress}
      style={styles.card}
    >
      <View style={[styles.accentBar, { backgroundColor: accentColor }]} />

      <View style={styles.inner}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.iconWrap}>
              <FunctionTypeIcon functionType={functionType} />
            </View>
            <Text style={styles.label}>{typeLabel}</Text>
          </View>
          <ChevronRightSmall size={18} color="#C1C1C1" />
        </View>

        {!!resolvedTitle && (
          preview ? (
            <TranslatableText
              entityType={preview.entityType}
              entityId={preview.entityId}
              fieldName={getTranslationFieldName(preview.entityType)}
              sourceText={resolvedTitle}
              sourceLanguage={preview.sourceLanguage}
              textStyle={styles.title}
              numberOfLines={2}
            />
          ) : (
            <Text style={styles.title} numberOfLines={2}>
              {resolvedTitle}
            </Text>
          )
        )}
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
    fontFamily: 'SourceHanSansCN-Medium',
    fontSize: 12,
    color: '#86909C',
  },
  title: {
    fontFamily: 'SourceHanSansCN-Medium',
    fontSize: 14,
    lineHeight: 20,
    color: '#0C1015',
  },
});
