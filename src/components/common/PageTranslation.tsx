import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { StyleProp, StyleSheet, TouchableOpacity, View, ViewStyle } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../store/authStore';
import { translationService } from '../../api/services/translation.service';
import { colors } from '../../theme/colors';
import LoadingDots from './LoadingDots';
import { TranslateActionIcon } from './PostActionIcons';
import type { ContentEntityType, ContentTranslationResult } from '../../types';

type RegisteredTranslationItem = {
  entityType: ContentEntityType;
  entityId: string;
  sourceText: string;
  sourceLanguage?: string | null;
};

type PageTranslationContextValue = {
  showTranslated: boolean;
  setShowTranslated: React.Dispatch<React.SetStateAction<boolean>>;
  toggleTranslated: () => void;
  retryFailed: () => void;
  registerItem: (key: string, item: RegisteredTranslationItem) => void;
  unregisterItem: (key: string) => void;
  getTranslation: (entityType: ContentEntityType, entityId?: string) => ContentTranslationResult | undefined;
  hasRegisteredItems: boolean;
  hasResolvedTranslations: boolean;
  hasError: boolean;
  isFetching: boolean;
};

const MAX_BATCH_ITEMS = 100;
const PageTranslationContext = createContext<PageTranslationContextValue | null>(null);

function buildEntityKey(entityType: ContentEntityType, entityId: string) {
  return `${entityType}:${entityId}`;
}

function chunkItems<T>(items: T[], size: number) {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

export function PageTranslationProvider({
  children,
  defaultTranslated = false,
}: {
  children: React.ReactNode;
  defaultTranslated?: boolean;
}) {
  const language = useAuthStore((state) => state.language);
  const queryClient = useQueryClient();
  const [showTranslated, setShowTranslated] = useState(defaultTranslated);
  const [registeredItems, setRegisteredItems] = useState<Record<string, RegisteredTranslationItem>>({});
  const [batchResults, setBatchResults] = useState<Record<string, ContentTranslationResult>>({});
  const [failedKeys, setFailedKeys] = useState<Record<string, true>>({});
  const [isFetching, setIsFetching] = useState(false);
  const inFlightKeysRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    setBatchResults({});
    setFailedKeys({});
    setIsFetching(false);
  }, [language]);

  const registerItem = useCallback((key: string, item: RegisteredTranslationItem) => {
    setRegisteredItems((current) => {
      const existing = current[key];
      if (
        existing &&
        existing.entityType === item.entityType &&
        existing.entityId === item.entityId &&
        existing.sourceText === item.sourceText &&
        existing.sourceLanguage === item.sourceLanguage
      ) {
        return current;
      }
      return { ...current, [key]: item };
    });
  }, []);

  const unregisterItem = useCallback((key: string) => {
    setRegisteredItems((current) => {
      if (!(key in current)) {
        return current;
      }
      const next = { ...current };
      delete next[key];
      return next;
    });
  }, []);

  const uniqueBatchItems = useMemo(() => {
    const deduped = new Map<string, RegisteredTranslationItem>();

    for (const item of Object.values(registeredItems)) {
      const entityKey = buildEntityKey(item.entityType, item.entityId);
      if (!deduped.has(entityKey)) {
        deduped.set(entityKey, item);
      }
    }

    return Array.from(deduped.values());
  }, [registeredItems]);

  useEffect(() => {
    if (!showTranslated || uniqueBatchItems.length === 0) {
      return undefined;
    }

    const pendingItems = uniqueBatchItems.filter((item) => {
      const entityKey = buildEntityKey(item.entityType, item.entityId);
      return !batchResults[entityKey] && !failedKeys[entityKey] && !inFlightKeysRef.current.has(entityKey);
    });

    if (pendingItems.length === 0) {
      return undefined;
    }

    let cancelled = false;
    let requestStarted = false;
    const pendingKeys = pendingItems.map((item) => buildEntityKey(item.entityType, item.entityId));
    pendingKeys.forEach((key) => inFlightKeysRef.current.add(key));

    const timeoutId = setTimeout(() => {
      requestStarted = true;
      setIsFetching(true);

      (async () => {
        const nextResults: Record<string, ContentTranslationResult> = {};
        const successfulKeys = new Set<string>();
        const failedChunkKeys = new Set<string>();

        for (const chunk of chunkItems(pendingItems, MAX_BATCH_ITEMS)) {
          try {
            const results = await translationService.resolveBatch({
              targetLanguage: language,
              items: chunk.map((item) => ({
                entityType: item.entityType,
                entityId: item.entityId,
              })),
            });

            if (cancelled) {
              return;
            }

            results.forEach((result) => {
              const entityKey = buildEntityKey(result.entityType, result.entityId);
              successfulKeys.add(entityKey);
              nextResults[entityKey] = result;
              queryClient.setQueryData(
                ['contentTranslation', result.entityType, result.entityId, language],
                result,
              );
            });
          } catch (error) {
            if (__DEV__) {
              console.log('[translation] batch request failed', error);
            }

            chunk.forEach((item) => {
              failedChunkKeys.add(buildEntityKey(item.entityType, item.entityId));
            });
          }
        }

        if (cancelled) {
          return;
        }

        if (Object.keys(nextResults).length > 0) {
          setBatchResults((current) => ({ ...current, ...nextResults }));
        }

        setFailedKeys((current) => {
          const next = { ...current };
          successfulKeys.forEach((key) => {
            delete next[key];
          });
          failedChunkKeys.forEach((key) => {
            if (!successfulKeys.has(key)) {
              next[key] = true;
            }
          });
          return next;
        });
      })().finally(() => {
        pendingKeys.forEach((key) => inFlightKeysRef.current.delete(key));
        setIsFetching(inFlightKeysRef.current.size > 0);
      });
    }, 40);

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
      if (!requestStarted) {
        pendingKeys.forEach((key) => inFlightKeysRef.current.delete(key));
        setIsFetching(inFlightKeysRef.current.size > 0);
      }
    };
  }, [batchResults, failedKeys, language, queryClient, showTranslated, uniqueBatchItems]);

  const getTranslation = useCallback(
    (entityType: ContentEntityType, entityId?: string) => {
      if (!entityId) {
        return undefined;
      }
      return batchResults[buildEntityKey(entityType, entityId)];
    },
    [batchResults],
  );

  const hasResolvedTranslations = useMemo(
    () => uniqueBatchItems.some((item) => Boolean(batchResults[buildEntityKey(item.entityType, item.entityId)])),
    [batchResults, uniqueBatchItems],
  );

  const hasError = useMemo(
    () => uniqueBatchItems.some((item) => Boolean(failedKeys[buildEntityKey(item.entityType, item.entityId)])),
    [failedKeys, uniqueBatchItems],
  );

  const retryFailed = useCallback(() => {
    setShowTranslated(true);
    setFailedKeys((current) => {
      const next = { ...current };
      uniqueBatchItems.forEach((item) => {
        delete next[buildEntityKey(item.entityType, item.entityId)];
      });
      return next;
    });
  }, [uniqueBatchItems]);

  const toggleTranslated = useCallback(() => {
    if (!showTranslated) {
      setFailedKeys({});
    }
    setShowTranslated((current) => !current);
  }, [showTranslated]);

  const value = useMemo<PageTranslationContextValue>(
    () => ({
      showTranslated,
      setShowTranslated,
      toggleTranslated,
      retryFailed,
      registerItem,
      unregisterItem,
      getTranslation,
      hasRegisteredItems: Object.keys(registeredItems).length > 0,
      hasResolvedTranslations,
      hasError,
      isFetching,
    }),
    [
      getTranslation,
      hasError,
      hasResolvedTranslations,
      isFetching,
      registerItem,
      registeredItems,
      retryFailed,
      showTranslated,
      toggleTranslated,
      unregisterItem,
    ],
  );

  return <PageTranslationContext.Provider value={value}>{children}</PageTranslationContext.Provider>;
}

export function usePageTranslation() {
  return useContext(PageTranslationContext);
}

type PageTranslationToggleProps = {
  style?: StyleProp<ViewStyle>;
};

export function PageTranslationToggle({
  style,
}: PageTranslationToggleProps) {
  const { t } = useTranslation();
  const context = usePageTranslation();

  if (!context?.hasRegisteredItems) {
    return null;
  }

  const shouldRetry = context.showTranslated && context.hasError && !context.hasResolvedTranslations;
  const isLoading = context.showTranslated && context.isFetching && !context.hasResolvedTranslations;
  const iconColor = shouldRetry
    ? colors.error
    : context.showTranslated
      ? '#0463E2'
      : '#86909C';
  const accessibilityLabel = isLoading
    ? t('translating')
    : shouldRetry
      ? t('retryTranslate')
      : context.showTranslated
        ? t('viewOriginal')
        : t('translate');

  return (
    <View style={style}>
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={shouldRetry ? context.retryFailed : context.toggleTranslated}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
      >
        {isLoading ? (
          <View style={styles.loadingIndicator}>
            <LoadingDots color="#0463E2" dotSize={4} gap={3} />
          </View>
        ) : (
          <TranslateActionIcon
            size={18}
            color={iconColor}
          />
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingIndicator: {
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
