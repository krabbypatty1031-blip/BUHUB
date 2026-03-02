import { useQuery } from '@tanstack/react-query';
import { translationService } from '../api/services/translation.service';
import { useAuthStore } from '../store/authStore';
import type { ContentEntityType, ContentTranslationResult } from '../types';

export function useContentTranslation(params: {
  entityType: ContentEntityType;
  entityId?: string;
  enabled?: boolean;
}) {
  const language = useAuthStore((state) => state.language);

  return useQuery<ContentTranslationResult>({
    queryKey: ['contentTranslation', params.entityType, params.entityId, language],
    queryFn: () =>
      translationService.resolve({
        entityType: params.entityType,
        entityId: params.entityId!,
        targetLanguage: language,
      }),
    enabled: (params.enabled ?? true) && !!params.entityId,
    staleTime: 1000 * 60 * 30,
    gcTime: 1000 * 60 * 60,
    retry: 1,
  });
}
