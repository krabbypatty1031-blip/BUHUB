import React, { useEffect, useMemo, useRef, useState } from 'react';
import { StyleProp, StyleSheet, Text, TextStyle, TouchableOpacity, View, ViewStyle } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useContentTranslation } from '../../hooks/useContentTranslation';
import { useAuthStore } from '../../store/authStore';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import type { ContentEntityType } from '../../types';
import { resolveTranslationSourceLanguage, shouldAllowContentTranslation } from '../../utils/contentLanguage';
import LoadingDots from './LoadingDots';
import { usePageTranslation } from './PageTranslation';

type Props = {
  entityType: ContentEntityType;
  entityId?: string;
  fieldName: string;
  sourceText?: string | null;
  sourceLanguage?: string | null;
  textStyle?: StyleProp<TextStyle>;
  translatedTextStyle?: StyleProp<TextStyle>;
  containerStyle?: StyleProp<ViewStyle>;
  actionRowStyle?: StyleProp<ViewStyle>;
  buttonTextStyle?: StyleProp<TextStyle>;
  prefixText?: string;
  prefixTextStyle?: StyleProp<TextStyle>;
  numberOfLines?: number;
};

export default function TranslatableText({
  entityType,
  entityId,
  fieldName,
  sourceText,
  sourceLanguage,
  textStyle,
  translatedTextStyle,
  containerStyle,
  actionRowStyle,
  buttonTextStyle,
  prefixText,
  prefixTextStyle,
  numberOfLines,
}: Props) {
  const { t } = useTranslation();
  const targetLanguage = useAuthStore((state) => state.language);
  const pageTranslation = usePageTranslation();
  const registerPageItem = pageTranslation?.registerItem;
  const unregisterPageItem = pageTranslation?.unregisterItem;
  const [localShowTranslated, setLocalShowTranslated] = useState(false);
  const registrationKeyRef = useRef(`translation-${Math.random().toString(36).slice(2)}`);

  const trimmedSourceText = sourceText?.trim() ?? '';
  const resolvedSourceLanguage = resolveTranslationSourceLanguage(trimmedSourceText, sourceLanguage);
  const canTranslate =
    Boolean(entityId) &&
    shouldAllowContentTranslation({
      text: trimmedSourceText,
      sourceLanguage: resolvedSourceLanguage ?? sourceLanguage,
      targetLanguage,
    });
  const showTranslated = pageTranslation?.showTranslated ?? localShowTranslated;
  const usesPageToggle = Boolean(pageTranslation);
  const shouldRequestTranslation = canTranslate && showTranslated;

  const translationQuery = useContentTranslation({
    entityType,
    entityId,
    enabled: !usesPageToggle && shouldRequestTranslation,
  });

  const translatedText = usesPageToggle
    ? pageTranslation?.getTranslation(entityType, entityId)?.fields?.[fieldName]
    : translationQuery.data?.fields?.[fieldName];
  const normalizedTranslatedText = typeof translatedText === 'string' ? translatedText.trim() : translatedText;
  const isShowingTranslated = showTranslated && (!shouldRequestTranslation || !!translatedText);
  const displayText = isShowingTranslated ? normalizedTranslatedText ?? trimmedSourceText : trimmedSourceText;
  const isLoadingInline = showTranslated && translationQuery.isFetching && !translatedText;

  useEffect(() => {
    if (!usesPageToggle) {
      return undefined;
    }
    if (!canTranslate || !entityId || !trimmedSourceText) {
      return undefined;
    }

    registerPageItem?.(registrationKeyRef.current, {
      entityType,
      entityId,
      sourceText: trimmedSourceText,
      sourceLanguage: resolvedSourceLanguage ?? sourceLanguage,
    });

    return () => {
      unregisterPageItem?.(registrationKeyRef.current);
    };
  }, [canTranslate, entityId, entityType, registerPageItem, resolvedSourceLanguage, sourceLanguage, trimmedSourceText, unregisterPageItem, usesPageToggle]);

  useEffect(() => {
    if (!usesPageToggle) {
      setLocalShowTranslated(false);
    }
  }, [entityId, fieldName, trimmedSourceText, resolvedSourceLanguage, sourceLanguage, usesPageToggle]);

  const buttonLabel = useMemo(() => {
    if (showTranslated && translationQuery.isError && !translatedText) return t('retryTranslate');
    if (showTranslated && translationQuery.isFetching && !translatedText) return t('translating');
    if (isShowingTranslated) return t('viewOriginal');
    return t('translate');
  }, [isShowingTranslated, showTranslated, translatedText, translationQuery.isError, translationQuery.isFetching, t]);

  const handleToggle = () => {
    if (!canTranslate) return;
    if (showTranslated && translationQuery.isError && !translatedText) {
      translationQuery.refetch();
      return;
    }
    setLocalShowTranslated((current) => !current);
  };

  if (!trimmedSourceText) {
    return null;
  }

  return (
    <View style={[styles.container, containerStyle]}>
      {canTranslate && !usesPageToggle ? (
        <View style={[styles.actionRow, actionRowStyle]}>
          <TouchableOpacity
            style={styles.inlineButton}
            onPress={handleToggle}
            disabled={translationQuery.isFetching && !translatedText}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={buttonLabel}
          >
            <View style={styles.inlineButtonContent}>
              <Text style={[styles.buttonText, buttonTextStyle]}>{buttonLabel}</Text>
              {isLoadingInline ? (
                <LoadingDots
                  color={colors.onSurfaceVariant}
                  dotSize={4}
                  gap={3}
                  style={styles.buttonLoader}
                />
              ) : null}
            </View>
          </TouchableOpacity>
        </View>
      ) : null}
      <Text style={[textStyle, isShowingTranslated ? translatedTextStyle : undefined]} numberOfLines={numberOfLines}>
        {prefixText ? <Text style={prefixTextStyle}>{`${prefixText} `}</Text> : null}{displayText}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    position: 'relative',
  },
  actionRow: {
    alignItems: 'flex-end',
    marginBottom: spacing.xs,
  },
  inlineButton: {
    paddingVertical: spacing.xxs,
  },
  inlineButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  buttonText: {
    ...typography.labelMedium,
    color: colors.onSurfaceVariant,
    fontWeight: '600',
  },
  buttonLoader: {
    marginLeft: spacing.xs,
  },
});
