import type { Language } from './common';

export type ContentEntityType = 'post' | 'comment' | 'partner' | 'errand' | 'secondhand' | 'rating';

export interface ContentTranslationResult {
  entityType: ContentEntityType;
  entityId: string;
  sourceLanguage: Language;
  targetLanguage: Language;
  fields: Record<string, string>;
}

export interface ContentTranslationBatchResult {
  items: ContentTranslationResult[];
}
