import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { StyleProp, StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../store/authStore';
import { translationService } from '../../api/services/translation.service';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
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
  registerItem: (key: string, item: RegisteredTranslationItem) => void;
  unregisterItem: (key: string) => void;
  getTranslation: (entityType: ContentEntityType, entityId?: string) => ContentTranslationResult | undefined;
  hasRegisteredItems: boolean;
};

const PageTranslationContext = createContext<PageTranslationContextValue | null>(null);

function buildEntityKey(entityType: ContentEntityType, entityId: string) {
  return `${entityType}:${entityId}`;
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
  const inFlightKeysRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    setBatchResults({});
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

    const pendingItems = uniqueBatchItems.filter(
      (item) => {
        const entityKey = buildEntityKey(item.entityType, item.entityId);
        return !batchResults[entityKey] && !inFlightKeysRef.current.has(entityKey);
      },
    );

    if (pendingItems.length === 0) {
      return undefined;
    }

    let cancelled = false;
    let requestStarted = false;
    const pendingKeys = pendingItems.map((item) => buildEntityKey(item.entityType, item.entityId));
    pendingKeys.forEach((key) => inFlightKeysRef.current.add(key));

    const timeoutId = setTimeout(() => {
      requestStarted = true;
      (async () => {
        try {
          const results = await translationService.resolveBatch({
            targetLanguage: language,
            items: pendingItems.map((item) => ({
              entityType: item.entityType,
              entityId: item.entityId,
            })),
          });

          if (cancelled) {
            return;
          }

          results.forEach((result) => {
            queryClient.setQueryData(
              ['contentTranslation', result.entityType, result.entityId, language],
              result,
            );
          });

          setBatchResults((current) => {
            const next = { ...current };
            for (const result of results) {
              next[buildEntityKey(result.entityType, result.entityId)] = result;
            }
            return next;
          });
        } catch (error) {
          if (__DEV__) {
            console.log('[translation] batch request failed', error);
          }
        } finally {
          pendingKeys.forEach((key) => inFlightKeysRef.current.delete(key));
        }
      })();
    }, 40);

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
      if (!requestStarted) {
        pendingKeys.forEach((key) => inFlightKeysRef.current.delete(key));
      }
    };
  }, [batchResults, language, queryClient, showTranslated, uniqueBatchItems]);

  const getTranslation = useCallback(
    (entityType: ContentEntityType, entityId?: string) => {
      if (!entityId) {
        return undefined;
      }
      return batchResults[buildEntityKey(entityType, entityId)];
    },
    [batchResults],
  );

  const value = useMemo<PageTranslationContextValue>(
    () => ({
      showTranslated,
      setShowTranslated,
      toggleTranslated: () => setShowTranslated((current) => !current),
      registerItem,
      unregisterItem,
      getTranslation,
      hasRegisteredItems: Object.keys(registeredItems).length > 0,
    }),
    [getTranslation, registerItem, registeredItems, showTranslated, unregisterItem],
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

  return (
    <View style={style}>
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={context.toggleTranslated}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <TranslateActionIcon
          size={18}
          color={context.showTranslated ? '#0463E2' : '#86909C'}
        />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  linkText: {
    ...typography.labelSmall,
    color: colors.onSurface,
    fontWeight: '600',
  },
});
