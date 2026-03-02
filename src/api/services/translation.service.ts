import apiClient from '../client';
import ENDPOINTS from '../endpoints';
import type { ContentEntityType, ContentTranslationResult, Language } from '../../types';

export const translationService = {
  async resolve(params: {
    entityType: ContentEntityType;
    entityId: string;
    targetLanguage: Language;
  }): Promise<ContentTranslationResult> {
    const { data } = await apiClient.post(ENDPOINTS.TRANSLATION.RESOLVE, params);
    return data;
  },

  async resolveBatch(params: {
    items: Array<{
      entityType: ContentEntityType;
      entityId: string;
    }>;
    targetLanguage: Language;
  }): Promise<ContentTranslationResult[]> {
    const { data } = await apiClient.post(ENDPOINTS.TRANSLATION.BATCH, params);
    return data.items;
  },
};
