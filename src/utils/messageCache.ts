import AsyncStorage from '@react-native-async-storage/async-storage';
import type { QueryClient, QueryKey } from '@tanstack/react-query';
import i18n, { normalizeLanguage } from '../i18n';
import type { ChatHistory, ChatMessage, Contact } from '../types';
import { useAuthStore } from '../store/authStore';

const MESSAGE_CACHE_VERSION = 1;
const CONTACTS_CACHE_PREFIX = `message-cache:v${MESSAGE_CACHE_VERSION}:contacts`;
const CHAT_CACHE_PREFIX = `message-cache:v${MESSAGE_CACHE_VERSION}:chat`;
const HIDDEN_CHAT_MESSAGES_PREFIX = `message-cache:v${MESSAGE_CACHE_VERSION}:hidden-chat-messages`;
const RECENT_SENT_MESSAGES_PREFIX = `message-cache:v${MESSAGE_CACHE_VERSION}:recent-sent`;
const MAX_RECENT_SENT_MESSAGES_PER_CONTACT = 12;

const contactsMemoryCache = new Map<string, Contact[]>();
const chatMemoryCache = new Map<string, ChatHistory[]>();
const hiddenChatMessagesMemoryCache = new Map<string, string[]>();
const recentSentMessagesMemoryCache = new Map<string, ChatMessage[]>();

function getNormalizedLanguage(language?: string | null): string {
  return normalizeLanguage(language ?? i18n.language) ?? 'tc';
}

function buildContactsCacheKey(userId: string, language: string) {
  return `${CONTACTS_CACHE_PREFIX}:${userId}:${getNormalizedLanguage(language)}`;
}

function buildChatCacheKey(userId: string, language: string, contactId: string) {
  return `${CHAT_CACHE_PREFIX}:${userId}:${getNormalizedLanguage(language)}:${contactId}`;
}

function buildHiddenChatMessagesKey(userId: string, contactId: string) {
  return `${HIDDEN_CHAT_MESSAGES_PREFIX}:${userId}:${contactId}`;
}

function buildRecentSentMessagesKey(userId: string, contactId: string) {
  return `${RECENT_SENT_MESSAGES_PREFIX}:${userId}:${contactId}`;
}

function cloneContacts(contacts: Contact[]): Contact[] {
  return contacts.map((contact) => ({ ...contact }));
}

function cloneMessages(messages: ChatMessage[]): ChatMessage[] {
  return messages.map((message) => ({
    ...message,
    ...(message.images ? { images: [...message.images] } : {}),
    ...(message.mediaMetas
      ? { mediaMetas: message.mediaMetas.map((meta) => ({ ...meta })) }
      : {}),
    ...(message.reactions
      ? { reactions: message.reactions.map((reaction) => ({ ...reaction })) }
      : {}),
    ...(message.replyTo ? { replyTo: { ...message.replyTo } } : {}),
    ...(message.imageAlbum ? { imageAlbum: { ...message.imageAlbum } } : {}),
    ...(message.audio ? { audio: { ...message.audio } } : {}),
    ...(message.functionCard ? { functionCard: { ...message.functionCard } } : {}),
  }));
}

function cloneChatHistory(history: ChatHistory[]): ChatHistory[] {
  return history.map((group) => ({
    ...group,
    messages: cloneMessages(group.messages),
  }));
}

function cloneStringArray(values: string[]): string[] {
  return [...values];
}

function readLanguageFromQueryKey(queryKey: QueryKey, fallback?: string): string {
  const raw = queryKey[queryKey.length - 1];
  return typeof raw === 'string' ? getNormalizedLanguage(raw) : getNormalizedLanguage(fallback);
}

function formatMonthDay(date: Date, language: string): string {
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return language === 'en' ? `${month}/${day}` : `${month}月${day}日`;
}

export function getCurrentMessageLanguage(): string {
  const storeLang = useAuthStore.getState().language;
  return getNormalizedLanguage(storeLang);
}

export function formatMessageTimeShort(iso: string): string {
  const d = new Date(iso);
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

export function formatConversationTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const language = getCurrentMessageLanguage();
  const diff = now.getTime() - d.getTime();
  if (Number.isNaN(d.getTime()) || diff < 0) return formatMonthDay(now, language);
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return String(i18n.t('messageTimeJustNow', { lng: language }));
  if (mins < 60) return String(i18n.t('messageTimeMinutesAgo', { count: mins, lng: language }));
  if (hours < 24) return String(i18n.t('messageTimeHoursAgo', { count: hours, lng: language }));
  if (days === 1) return String(i18n.t('messageTimeYesterday', { lng: language }));
  if (days < 7) return String(i18n.t('messageTimeDaysAgo', { count: days, lng: language }));
  return formatMonthDay(d, language);
}

export function buildPreviewFromChatMessage(message: ChatMessage): string {
  if (message.isRecalled) {
    return String(i18n.t('messageRecalledPreview', { lng: getCurrentMessageLanguage() }));
  }
  if (message.functionCard) {
    return String(
      i18n.t('messageSharedCardPreview', {
        type: String(i18n.t(message.functionCard.type === 'partner'
          ? 'findPartner'
          : message.functionCard.type === 'errand'
            ? 'errands'
            : message.functionCard.type === 'secondhand'
              ? 'secondhand'
              : message.functionCard.type === 'rating'
                ? 'ratings'
              : 'forum')),
        title: message.functionCard.title,
      })
    );
  }
  if (message.audio?.url) {
    return String(i18n.t('messageAudioPreview', { lng: getCurrentMessageLanguage() }));
  }
  if (message.imageAlbum?.count) {
    return String(
      i18n.t('messageAlbumPreview', {
        count: message.imageAlbum.count,
        lng: getCurrentMessageLanguage(),
      })
    );
  }
  if ((message.images?.length ?? 0) > 0 && !message.text) {
    return String(i18n.t('messageImagePreview', { lng: getCurrentMessageLanguage() }));
  }
  return message.text;
}

export function resolveHistoryDateLabel(iso: string, language = getCurrentMessageLanguage()): string {
  const d = new Date(iso);
  const now = new Date();
  const isToday =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  if (isToday) {
    return String(i18n.t('messageTimeToday', { lng: language }));
  }
  return formatMonthDay(d, language);
}

function sortGroups(history: ChatHistory[]): ChatHistory[] {
  return [...history].sort((a, b) => {
    const aTs = Date.parse(a.messages[a.messages.length - 1]?.createdAt ?? '') || 0;
    const bTs = Date.parse(b.messages[b.messages.length - 1]?.createdAt ?? '') || 0;
    return aTs - bTs;
  });
}

/** Ascending by createdAt within one date group; stable when timestamps tie. */
export function sortGroupMessagesByCreatedAt(messages: ChatMessage[]): ChatMessage[] {
  return [...messages].sort((a, b) => {
    const aTs = Date.parse(a.createdAt ?? '') || 0;
    const bTs = Date.parse(b.createdAt ?? '') || 0;
    if (aTs !== bTs) return aTs - bTs;
    const aKey = `${a.clientKey ?? ''}\t${a.id ?? ''}`;
    const bKey = `${b.clientKey ?? ''}\t${b.id ?? ''}`;
    return aKey.localeCompare(bKey);
  });
}

/**
 * Merge an "older" page of chat history into the existing visible history.
 * Dedupes by message id, coalesces same-date groups, sorts each group's
 * messages by createdAt. Used by the chat-screen pagination flow when the
 * user scrolls back to load page N+1 of the server's history.
 */
export function mergeChatHistories(
  olderHistory: ChatHistory[] | undefined,
  latestHistory: ChatHistory[] | undefined
): ChatHistory[] {
  const seenMessageIds = new Set<string>();
  const merged: ChatHistory[] = [];

  const appendGroup = (group: ChatHistory) => {
    const nextMessages = (group.messages ?? []).filter((message) => {
      if (!message.id) return true;
      if (seenMessageIds.has(message.id)) return false;
      seenMessageIds.add(message.id);
      return true;
    });

    if (nextMessages.length === 0) return;

    const lastGroup = merged.length > 0 ? merged[merged.length - 1] : null;
    if (lastGroup?.date === group.date) {
      lastGroup.messages.push(...nextMessages);
      lastGroup.messages = sortGroupMessagesByCreatedAt(lastGroup.messages);
      return;
    }

    merged.push({
      ...group,
      messages: sortGroupMessagesByCreatedAt([...nextMessages]),
    });
  };

  [olderHistory, latestHistory].forEach((history) => {
    if (!Array.isArray(history)) return;
    history.forEach(appendGroup);
  });

  return merged;
}

export function appendMessageToHistory(
  history: ChatHistory[] | undefined,
  message: ChatMessage,
  language = getCurrentMessageLanguage()
): ChatHistory[] {
  const next = Array.isArray(history) ? cloneChatHistory(history) : [];
  const messageId = message.id;
  const messageClientKey = message.clientKey;
  const alreadyExists = next.some((group) =>
    group.messages.some(
      (item) =>
        (messageId && item.id === messageId) ||
        (messageClientKey && item.clientKey === messageClientKey)
    )
  );
  if (alreadyExists) return next;

  const createdAt = message.createdAt ?? new Date().toISOString();
  const dateLabel = resolveHistoryDateLabel(createdAt, language);
  const dateGroup = next.find((group) => group.date === dateLabel);
  if (dateGroup) {
    dateGroup.messages.push({ ...message });
  } else {
    next.push({
      date: dateLabel,
      messages: [{ ...message }],
    });
  }

  next.forEach((group) => {
    group.messages = sortGroupMessagesByCreatedAt(group.messages);
  });

  return sortGroups(next);
}

export function replaceMessageInHistory(
  history: ChatHistory[] | undefined,
  targetId: string,
  nextMessage: ChatMessage
): ChatHistory[] | undefined {
  if (!Array.isArray(history) || history.length === 0) return history;
  let changed = false;
  const next = history.map((group) => {
    let groupChanged = false;
    const messages = group.messages.map((message) => {
      if (message.id !== targetId && message.clientKey !== targetId) return message;
      changed = true;
      groupChanged = true;
      return {
        ...nextMessage,
        clientKey: nextMessage.clientKey ?? message.clientKey,
        mediaMetas:
          nextMessage.mediaMetas && nextMessage.mediaMetas.length > 0
            ? nextMessage.mediaMetas
            : message.mediaMetas,
        mediaGroupId: nextMessage.mediaGroupId ?? message.mediaGroupId,
      };
    });
    return groupChanged ? { ...group, messages: sortGroupMessagesByCreatedAt(messages) } : group;
  });
  return changed ? next : history;
}

export function markMessageAsReadInHistory(
  history: ChatHistory[] | undefined,
  messageId?: string
): ChatHistory[] | undefined {
  if (!Array.isArray(history) || history.length === 0) return history;
  let changed = false;
  const next = history.map((group) => {
    let groupChanged = false;
    const messages = group.messages.map((message) => {
      if (message.type !== 'sent') return message;
      if (messageId && message.id !== messageId) return message;
      if (message.status === 'read') return message;
      changed = true;
      groupChanged = true;
      return { ...message, status: 'read' as const };
    });
    return groupChanged ? { ...group, messages } : group;
  });
  return changed ? next : history;
}

export function markMessageAsRecalledInHistory(
  history: ChatHistory[] | undefined,
  messageId: string
): ChatHistory[] | undefined {
  if (!Array.isArray(history) || history.length === 0) return history;
  const recalledText = String(i18n.t('messageYouRecalled', { lng: getCurrentMessageLanguage() }));
  const recalledPreviewText = String(
    i18n.t('replySourceUnavailable', { lng: getCurrentMessageLanguage() })
  );
  const recalledLookupKeys = new Set<string>();
  history.forEach((group) => {
    group.messages.forEach((message) => {
      if (message.id !== messageId && message.clientKey !== messageId) return;
      if (message.id) recalledLookupKeys.add(`id:${message.id}`);
      if (message.clientKey) recalledLookupKeys.add(`client:${message.clientKey}`);
    });
  });
  let changed = false;
  const next = history.map((group) => {
    let groupChanged = false;
    const messages = group.messages.map((message) => {
      if (message.id === messageId || message.clientKey === messageId) {
        changed = true;
        groupChanged = true;
        return {
          ...message,
          text: recalledText,
          images: [],
          mediaMetas: [],
          audio: undefined,
          functionCard: undefined,
          imageAlbum: undefined,
          replyTo: undefined,
          reactions: [],
          isRecalled: true,
        };
      }

      const replyTo = message.replyTo;
      if (!replyTo) return message;
      const matchesRecalledSource = Boolean(
        (replyTo.messageId && recalledLookupKeys.has(`id:${replyTo.messageId}`)) ||
        (replyTo.clientKey && recalledLookupKeys.has(`client:${replyTo.clientKey}`))
      );
      if (!matchesRecalledSource) return message;

      changed = true;
      groupChanged = true;
      return {
        ...message,
        replyTo: {
          ...replyTo,
          type: 'recalled' as const,
          text: recalledPreviewText,
          title: undefined,
          thumbnailUri: undefined,
          durationMs: undefined,
        },
      };
    });
    return groupChanged ? { ...group, messages } : group;
  });
  return changed ? next : history;
}

export function upsertContact(
  contacts: Contact[] | undefined,
  incoming: Contact
): Contact[] {
  const next = Array.isArray(contacts) ? cloneContacts(contacts) : [];
  const index = next.findIndex((item) => item.id === incoming.id);
  if (index >= 0) {
    next[index] = { ...next[index], ...incoming };
  } else {
    next.unshift({ ...incoming });
  }
  return next;
}

export async function hydrateContactsCache(
  userId: string,
  language: string
): Promise<Contact[] | null> {
  const cacheKey = buildContactsCacheKey(userId, language);
  if (contactsMemoryCache.has(cacheKey)) {
    return cloneContacts(contactsMemoryCache.get(cacheKey)!);
  }
  try {
    const raw = await AsyncStorage.getItem(cacheKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Contact[];
    if (!Array.isArray(parsed)) return null;
    contactsMemoryCache.set(cacheKey, cloneContacts(parsed));
    return cloneContacts(parsed);
  } catch {
    return null;
  }
}

export async function hydrateChatCache(
  userId: string,
  language: string,
  contactId: string
): Promise<ChatHistory[] | null> {
  const cacheKey = buildChatCacheKey(userId, language, contactId);
  if (chatMemoryCache.has(cacheKey)) {
    return cloneChatHistory(chatMemoryCache.get(cacheKey)!);
  }
  try {
    const raw = await AsyncStorage.getItem(cacheKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ChatHistory[];
    if (!Array.isArray(parsed)) return null;
    chatMemoryCache.set(cacheKey, cloneChatHistory(parsed));
    return cloneChatHistory(parsed);
  } catch {
    return null;
  }
}

export function peekCachedContacts(
  userId: string,
  language: string
): Contact[] | undefined {
  const cacheKey = buildContactsCacheKey(userId, language);
  const cached = contactsMemoryCache.get(cacheKey);
  return cached ? cloneContacts(cached) : undefined;
}

export function peekCachedChatHistory(
  userId: string,
  language: string,
  contactId: string
): ChatHistory[] | undefined {
  const cacheKey = buildChatCacheKey(userId, language, contactId);
  const cached = chatMemoryCache.get(cacheKey);
  return cached ? cloneChatHistory(cached) : undefined;
}

export function peekHiddenChatMessages(
  userId: string,
  contactId: string
): string[] | undefined {
  const cacheKey = buildHiddenChatMessagesKey(userId, contactId);
  const cached = hiddenChatMessagesMemoryCache.get(cacheKey);
  return cached ? cloneStringArray(cached) : undefined;
}

export function peekRecentSentMessages(
  userId: string,
  contactId: string
): ChatMessage[] | undefined {
  const cacheKey = buildRecentSentMessagesKey(userId, contactId);
  const cached = recentSentMessagesMemoryCache.get(cacheKey);
  return cached ? cloneMessages(cached) : undefined;
}

export function rememberRecentSentMessage(
  userId: string,
  contactId: string,
  message: ChatMessage
): void {
  if (!userId || !contactId || !message.id) return;
  const cacheKey = buildRecentSentMessagesKey(userId, contactId);
  const current = recentSentMessagesMemoryCache.get(cacheKey) ?? [];
  const next = [
    ...current.filter(
      (item) =>
        item.id !== message.id &&
        (!message.clientKey || item.clientKey !== message.clientKey)
    ),
    { ...message },
  ]
    .sort((a, b) => {
      const aTs = Date.parse(a.createdAt ?? '') || 0;
      const bTs = Date.parse(b.createdAt ?? '') || 0;
      return aTs - bTs;
    })
    .slice(-MAX_RECENT_SENT_MESSAGES_PER_CONTACT);
  recentSentMessagesMemoryCache.set(cacheKey, cloneMessages(next));
}

export async function persistContactsCache(
  userId: string,
  language: string,
  contacts: Contact[]
): Promise<void> {
  const cacheKey = buildContactsCacheKey(userId, language);
  const snapshot = cloneContacts(contacts);
  contactsMemoryCache.set(cacheKey, snapshot);
  try {
    await AsyncStorage.setItem(cacheKey, JSON.stringify(snapshot));
  } catch {
    // Ignore cache persistence failures.
  }
}

export async function persistChatCache(
  userId: string,
  language: string,
  contactId: string,
  history: ChatHistory[]
): Promise<void> {
  const cacheKey = buildChatCacheKey(userId, language, contactId);
  const snapshot = cloneChatHistory(history);
  chatMemoryCache.set(cacheKey, snapshot);
  try {
    await AsyncStorage.setItem(cacheKey, JSON.stringify(snapshot));
  } catch {
    // Ignore cache persistence failures.
  }
}

export async function hydrateHiddenChatMessages(
  userId: string,
  contactId: string
): Promise<string[] | null> {
  const cacheKey = buildHiddenChatMessagesKey(userId, contactId);
  if (hiddenChatMessagesMemoryCache.has(cacheKey)) {
    return cloneStringArray(hiddenChatMessagesMemoryCache.get(cacheKey)!);
  }
  try {
    const raw = await AsyncStorage.getItem(cacheKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as string[];
    if (!Array.isArray(parsed) || parsed.some((value) => typeof value !== 'string')) {
      return null;
    }
    hiddenChatMessagesMemoryCache.set(cacheKey, cloneStringArray(parsed));
    return cloneStringArray(parsed);
  } catch {
    return null;
  }
}

export async function persistHiddenChatMessages(
  userId: string,
  contactId: string,
  hiddenMessageKeys: string[]
): Promise<void> {
  const cacheKey = buildHiddenChatMessagesKey(userId, contactId);
  const snapshot = cloneStringArray(hiddenMessageKeys);
  hiddenChatMessagesMemoryCache.set(cacheKey, snapshot);
  try {
    await AsyncStorage.setItem(cacheKey, JSON.stringify(snapshot));
  } catch {
    // Ignore cache persistence failures.
  }
}

export function patchContactsQueries(
  queryClient: QueryClient,
  userId: string | undefined,
  updater: (current: Contact[] | undefined, language: string) => Contact[] | undefined
) {
  const results = queryClient.getQueriesData<Contact[]>({ queryKey: ['contacts'] });
  results.forEach(([queryKey, current]) => {
    const language = readLanguageFromQueryKey(queryKey);
    const next = updater(current, language);
    if (!next || next === current) return;
    queryClient.setQueryData(queryKey, next);
    if (userId) {
      void persistContactsCache(userId, language, next);
    }
  });
}

export function patchChatQueries(
  queryClient: QueryClient,
  userId: string | undefined,
  contactId: string,
  updater: (current: ChatHistory[] | undefined, language: string) => ChatHistory[] | undefined
) {
  const results = queryClient.getQueriesData<ChatHistory[]>({ queryKey: ['chat', contactId] });
  results.forEach(([queryKey, current]) => {
    const language = readLanguageFromQueryKey(queryKey);
    const next = updater(current, language);
    if (!next || next === current) return;
    queryClient.setQueryData(queryKey, next);
    if (userId) {
      void persistChatCache(userId, language, contactId, next);
    }
  });
}

export function writeContactsSnapshot(
  queryClient: QueryClient,
  userId: string | undefined,
  language: string,
  contacts: Contact[]
) {
  const normalizedLanguage = getNormalizedLanguage(language);
  queryClient.setQueryData(['contacts', normalizedLanguage], contacts);
  if (userId) {
    void persistContactsCache(userId, normalizedLanguage, contacts);
  }
}

export function writeChatSnapshot(
  queryClient: QueryClient,
  userId: string | undefined,
  language: string,
  contactId: string,
  history: ChatHistory[]
) {
  const normalizedLanguage = getNormalizedLanguage(language);
  queryClient.setQueryData(['chat', contactId, normalizedLanguage], history);
  if (userId) {
    void persistChatCache(userId, normalizedLanguage, contactId, history);
  }
}
