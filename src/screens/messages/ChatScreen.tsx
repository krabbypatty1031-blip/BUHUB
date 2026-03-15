import React, { startTransition, useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  InteractionManager,
  GestureResponderEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  BackHandler,
  Keyboard,
  Linking,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import type { ImageLoadEventData } from 'expo-image';
import Svg, { Path, Polygon } from 'react-native-svg';
import { FlashList, type FlashListRef } from '@shopify/flash-list';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import * as ImagePicker from 'expo-image-picker';
import { Audio } from 'expo-av';
import { useQueryClient } from '@tanstack/react-query';
import Animated, {
  Easing,
  runOnJS,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  cancelAnimation,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import {
  CommonActions,
  useFocusEffect,
  useIsFocused,
  type NavigationProp,
} from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type {
  ForwardedChatType,
  MainTabParamList,
  MessagesStackParamList,
} from '../../types/navigation';
import type { ChatMessage, ChatHistory, Contact, ForwardedCardDraft } from '../../types';
import { useCanSendMessage, useChatHistory, usePresence, useRecallMessage, useSendMessage } from '../../hooks/useMessages';
import { useAutoGrowingInput } from '../../hooks/useAutoGrowingInput';
import { useAuthStore } from '../../store/authStore';
import { useMessageStore } from '../../store/messageStore';
import { useUIStore } from '../../store/uiStore';
import { useMessageRealtimeStore } from '../../store/messageRealtimeStore';
import { colors } from '../../theme/colors';
import { spacing, borderRadius, layout } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import Avatar from '../../components/common/Avatar';
import ImagePreviewModal from '../../components/common/ImagePreviewModal';
import { uploadService } from '../../api/services/upload.service';
import { messageService } from '../../api/services/message.service';
import {
  VoiceMessageBubble,
  RecordingOverlay,
  type RecordingOverlayRef,
  VoiceButton,
} from '../../components/messages';
import {
  BackIcon,
  SendIcon,
  CameraIcon,
  MicIcon,
  KeyboardIcon,
  ImageIcon,
  CloseIcon,
  ChevronRightIcon,
  UsersIcon,
  TruckIcon,
  ShoppingBagIcon,
  StarIcon,
  EditIcon,
} from '../../components/common/icons';
import { showTabBar, useTabBarAnimation } from '../../hooks/TabBarAnimationContext';
import { hapticLight } from '../../utils/haptics';
import { transcribeAudioFileWithNativeSpeech } from '../../utils/nativeSpeechToText';
import { getSpeechRecognitionModule } from '../../utils/speechRecognition';
import { normalizeImageUrl as normalizeMediaUrl } from '../../utils/imageUrl';
import {
  appendMessageToHistory,
  buildPreviewFromChatMessage,
  formatConversationTime,
  hydrateHiddenChatMessages,
  patchChatQueries,
  patchContactsQueries,
  peekHiddenChatMessages,
  persistHiddenChatMessages,
  replaceMessageInHistory,
  upsertContact,
} from '../../utils/messageCache';
import { recordMessageMetric, recordTimedMessageMetric } from '../../utils/messageMetrics';
import type { ChatHistoryChunk, SendMessagePayload } from '../../api/services/message.service';

const MIN_RECORD_DURATION_MS = 1000;
const MAX_RECORD_DURATION_MS = 60000;
const TYPING_STOP_DELAY_MS = 2500;
const TYPING_STALE_MS = 6000;
const RECALL_WINDOW_MS = 2 * 60 * 1000;
const VOICE_ACTION_ZONE_WIDTH = 132;
const VOICE_ACTION_ZONE_HEIGHT = 80;
const VOICE_ACTION_ZONE_SIDE = 20;
const VOICE_ACTION_ZONE_BOTTOM = 90;
const CHAT_HISTORY_PAGE_LIMIT = 50;
const CHAT_LIST_DRAW_DISTANCE = 420;
const OLDER_HISTORY_LOADING_DELAY_MS = 180;
const OLDER_HISTORY_PREFETCH_DISTANCE_PX = 520;
const OLDER_HISTORY_TRIGGER_COOLDOWN_MS = 420;
const LATEST_PROXIMITY_PX = 96;
const MAX_NEW_MESSAGE_HINT_COUNT = 99;
const PURE_BLACK = '#000000';
const CHAT_INPUT_MIN_HEIGHT = 40;
const CHAT_INPUT_MAX_HEIGHT = 120;
const CHAT_INPUT_EXTRA_HEIGHT = 18;
const CHAT_INPUT_LINE_HEIGHT = 20;
const REACTION_OPTIONS = [
  '\u{1F44D}',
  '\u{2764}\u{FE0F}',
  '\u{1F602}',
  '\u{1F62E}',
  '\u{1F622}',
  '\u{1F44F}',
];

type ApiLikeError = {
  errorCode?: unknown;
  code?: unknown;
  error?: {
    code?: unknown;
  };
  message?: unknown;
};

type RecordingOptionsInput = NonNullable<
  Parameters<Audio.Recording['prepareToRecordAsync']>[0]
>;

function resolveSpeechRecognitionLocale(language: string): string {
  const normalized = language.toLowerCase();
  if (normalized.startsWith('en')) return 'en-US';
  if (normalized.startsWith('sc') || normalized.includes('hans') || normalized.includes('zh-cn')) {
    return 'zh-CN';
  }
  if (normalized.startsWith('tc') || normalized.includes('hant') || normalized.includes('zh-hk')) {
    return 'zh-HK';
  }
  return 'zh-HK';
}

function getAudioUploadMetaFromUri(uri: string): { type: string; name: string } {
  const cleanUri = (uri || '').split('?')[0].toLowerCase();
  const extMatch = cleanUri.match(/\.([a-z0-9]+)$/);
  const ext = extMatch?.[1] ?? 'm4a';

  if (ext === 'mp4') {
    return { type: 'audio/mp4', name: `voice-${Date.now()}.mp4` };
  }
  if (ext === 'caf') {
    return { type: 'audio/x-caf', name: `voice-${Date.now()}.caf` };
  }
  if (ext === 'wav' || ext === 'wave') {
    return { type: 'audio/wav', name: `voice-${Date.now()}.wav` };
  }
  if (ext === 'aac') {
    return { type: 'audio/aac', name: `voice-${Date.now()}.aac` };
  }
  if (ext === 'm4a') {
    return { type: 'audio/x-m4a', name: `voice-${Date.now()}.m4a` };
  }

  return { type: 'audio/m4a', name: `voice-${Date.now()}.m4a` };
}

function extractErrorMessage(error: unknown, fallback: string): string {
  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string' && message.trim().length > 0) {
      return message;
    }
  }
  return fallback;
}

function getApiErrorCode(error: unknown): string | undefined {
  if (!error || typeof error !== 'object') return undefined;
  const apiError = error as ApiLikeError;
  const code = apiError.errorCode ?? apiError.error?.code ?? apiError.code;
  return typeof code === 'string' ? code : undefined;
}

function looksLikeContentViolation(error: unknown): boolean {
  const code = getApiErrorCode(error);
  if (code === 'CONTENT_VIOLATION') return true;
  const msg = error && typeof error === 'object' ? (error as ApiLikeError).message : '';
  return typeof msg === 'string' && (msg.includes('CONTENT_VIOLATION') || msg.includes('violates community guidelines'));
}

function looksLikeImageViolation(error: unknown): boolean {
  const msg = error && typeof error === 'object' ? (error as ApiLikeError).message : '';
  return typeof msg === 'string' && (msg.includes('"code":"CONTENT_VIOLATION"') || msg.includes('Image contains content'));
}

type Props = NativeStackScreenProps<MessagesStackParamList, 'Chat'>;

/* ----- Union type for FlatList data ----- */
type ChatListItem =
  | { kind: 'date'; date: string; key: string }
  | { kind: 'time'; timeLabel: string; key: string }
  | { kind: 'message'; message: ChatMessage; key: string };

type VoiceReleaseAction = 'send' | 'cancel' | 'transcribe';
type ImageSendMode = 'separate' | 'merged';
type ChatBubbleProps = {
  message: ChatMessage;
  myAvatarText: string;
  myAvatarUri?: string | null;
  theirAvatarText: string;
  theirAvatarUri?: string | null;
  onCardPress?: (card: NonNullable<ChatMessage['functionCard']>) => void;
  onLongPressMessage?: (message: ChatMessage) => void;
  onSwipeReply?: (message: ChatMessage) => void;
  onPlayAudio?: (message: ChatMessage) => void;
  onImagePress?: (images: string[], index: number) => void;
  onPressReaction?: (message: ChatMessage, emoji: string, reactedByMe: boolean) => void;
  onRetryFailedMessage?: (message: ChatMessage) => void;
  isAudioPlaying?: boolean;
  t: (key: string, options?: Record<string, unknown>) => string;
};

function formatReplyDurationLabel(durationMs?: number) {
  if (typeof durationMs !== 'number' || !Number.isFinite(durationMs) || durationMs <= 0) return '';
  return `${Math.max(1, Math.round(durationMs / 1000))}"`;
}

function resolveMinuteTimeKey(createdAt?: string, fallbackTime?: string) {
  if (typeof createdAt === 'string' && createdAt.length > 0) {
    const timestamp = Date.parse(createdAt);
    if (Number.isFinite(timestamp)) {
      const date = new Date(timestamp);
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      const dateKey = date.toISOString().slice(0, 10);
      return {
        minuteKey: `${dateKey}-${hours}:${minutes}`,
        timeLabel: `${hours}:${minutes}`,
      };
    }
  }
  const normalizedFallback = typeof fallbackTime === 'string' ? fallbackTime.trim() : '';
  if (normalizedFallback.length > 0) {
    return {
      minuteKey: `time-${normalizedFallback}`,
      timeLabel: normalizedFallback,
    };
  }
  return null;
}

function resolveMessageTimestampMs(message: ChatMessage): number | null {
  const createdAt = typeof message.createdAt === 'string' ? message.createdAt : '';
  if (createdAt) {
    const parsed = Date.parse(createdAt);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function resolveMessageGroupSenderKey(message: ChatMessage): string {
  return message.type === 'sent' ? 'me' : 'them';
}

function shouldMessagesShareGroup(current: ChatMessage, nextOlder: ChatMessage): boolean {
  if (resolveMessageGroupSenderKey(current) !== resolveMessageGroupSenderKey(nextOlder)) {
    return false;
  }

  const currentTs = resolveMessageTimestampMs(current);
  const nextOlderTs = resolveMessageTimestampMs(nextOlder);
  if (currentTs != null && nextOlderTs != null) {
    return Math.abs(currentTs - nextOlderTs) < 5 * 60 * 1000;
  }

  const currentMinute = resolveMinuteTimeKey(current.createdAt, current.time)?.minuteKey;
  const nextMinute = resolveMinuteTimeKey(nextOlder.createdAt, nextOlder.time)?.minuteKey;
  return Boolean(currentMinute && nextMinute && currentMinute === nextMinute);
}

function formatReplyReferenceText(
  replyTo: NonNullable<ChatMessage['replyTo']>,
  t: (key: string, options?: Record<string, unknown>) => string
) {
  const normalizedText = typeof replyTo.text === 'string' ? replyTo.text.trim() : '';
  if (replyTo.type === 'deleted') {
    return t('replySourceDeleted');
  }
  if (replyTo.type === 'recalled') {
    return t('replySourceUnavailable');
  }
  if (replyTo.type === 'audio') {
    const durationLabel = formatReplyDurationLabel(replyTo.durationMs);
    if (normalizedText.length > 0 && normalizedText !== t('messageAudioPreview')) {
      return normalizedText;
    }
    return durationLabel ? `${t('messageAudioPreview')} ${durationLabel}` : t('messageAudioPreview');
  }
  if (replyTo.type === 'album' && typeof replyTo.title === 'string' && replyTo.title.length > 0) {
    return replyTo.title;
  }
  if (replyTo.type === 'image') {
    if (normalizedText.length > 0 && normalizedText !== t('messageImagePreview')) {
      return normalizedText;
    }
    return t('messageImagePreview');
  }
  if (replyTo.type === 'card' && replyTo.title) {
    return replyTo.title;
  }
  if (normalizedText.length > 0) {
    return normalizedText;
  }
  if (replyTo.title) {
    return replyTo.title;
  }
  if (replyTo.type === 'album') {
    return t('messageAlbumTitle');
  }
  if (replyTo.type === 'card') {
    return t('messageSharedCardPreview', {
      type: replyTo.cardType ? t(TYPE_LABEL_KEYS[replyTo.cardType]) || replyTo.cardType : '',
      title: replyTo.title || t('inputMessage'),
    });
  }
  return t('inputMessage');
}

function resolveReplyAuthorLabel(
  replyTo: NonNullable<ChatMessage['replyTo']>,
  myReplyName: string,
  theirReplyName: string,
  t: (key: string, options?: Record<string, unknown>) => string
) {
  const normalizedFromName = typeof replyTo.fromName === 'string' ? replyTo.fromName.trim() : '';
  if (normalizedFromName.length > 0) return normalizedFromName;
  if (replyTo.from === 'me') return myReplyName || t('meLabel');
  return theirReplyName || t('themLabel');
}

function getReplyReferenceIconType(replyTo: NonNullable<ChatMessage['replyTo']>) {
  if (replyTo.thumbnailUri) return null;
  if (replyTo.type === 'image' || replyTo.type === 'album') return 'image' as const;
  if (replyTo.type === 'audio') return 'audio' as const;
  if (replyTo.type === 'card') return replyTo.cardType ?? ('post' as const);
  if (replyTo.type === 'recalled' || replyTo.type === 'deleted') return 'state' as const;
  return null;
}

function ReplyAudioGlyph({
  color,
}: {
  color: string;
}) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Polygon
        points="10 6 6.6 9 4 9 4 15 6.6 15 10 18 10 6"
        stroke={color}
        strokeWidth={1.8}
        strokeLinejoin="round"
      />
      <Path
        d="M14 9.2C15.4 10.1 16.1 11 16.1 12C16.1 13 15.4 13.9 14 14.8"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M16.8 7.2C18.8 8.6 20 10.2 20 12C20 13.8 18.8 15.4 16.8 16.8"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

type RetryUploadFile = {
  uri: string;
  type: string;
  name: string;
};

type PendingSendRequest =
  | {
      kind: 'direct';
      payload: SendMessagePayload;
      images?: string[];
    }
  | {
      kind: 'image-batch';
      files: RetryUploadFile[];
      mode: 'plain' | 'album';
      replyTo?: ChatMessage['replyTo'];
    }
  | {
      kind: 'image-single';
      file: RetryUploadFile;
      replyTo?: ChatMessage['replyTo'];
    }
  | {
      kind: 'audio';
      file: RetryUploadFile;
      durationMs?: number;
      replyTo?: ChatMessage['replyTo'];
    };

function formatLocalMessageTime(date: Date) {
  return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
}

function buildConversationPreviewContact(
  contactId: string,
  message: ChatMessage,
  contactName: string,
  contactAvatar: string,
  existing?: Contact
): Contact {
  const createdAt = message.createdAt ?? new Date().toISOString();
  const trimmedContactName = contactName.trim();
  const resolvedName =
    existing?.name ??
    (trimmedContactName.length > 0 ? trimmedContactName : undefined) ??
    existing?.userName ??
    contactId;
  return {
    id: contactId,
    userName: existing?.userName,
    name: resolvedName,
    avatar: existing?.avatar ?? contactAvatar ?? '',
    grade: existing?.grade,
    major: existing?.major,
    message: buildPreviewFromChatMessage(message),
    time: formatConversationTime(createdAt),
    lastMessageAt: createdAt,
    unread: 0,
    pinned: existing?.pinned ?? false,
    gender: existing?.gender,
    muted: existing?.muted,
  };
}

function createLocalMessageId() {
  return `local-msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function isLocalMessageId(id?: string) {
  return typeof id === 'string' && id.startsWith('local-msg-');
}

function resolveMessageRenderKey(
  message: ChatMessage,
  renderKeyByServerId: Record<string, string>,
  fallbackKey: string
) {
  if (typeof message.clientKey === 'string' && message.clientKey.length > 0) {
    return message.clientKey;
  }
  if (typeof message.id === 'string' && message.id.length > 0) {
    return renderKeyByServerId[message.id] ?? message.id;
  }
  return fallbackKey;
}

function resolveLocalVisibilityKey(message: Pick<ChatMessage, 'id' | 'clientKey' | 'createdAt' | 'time'>) {
  if (typeof message.id === 'string' && message.id.length > 0) {
    return `id:${message.id}`;
  }
  if (typeof message.clientKey === 'string' && message.clientKey.length > 0) {
    return `client:${message.clientKey}`;
  }
  if (typeof message.createdAt === 'string' && message.createdAt.length > 0) {
    return `created:${message.createdAt}`;
  }
  return `time:${message.time}`;
}

function sortMessagesByCreatedAt(messages: ChatMessage[]) {
  return [...messages].sort((a, b) => {
    const aTs = Date.parse(a.createdAt ?? '') || 0;
    const bTs = Date.parse(b.createdAt ?? '') || 0;
    return aTs - bTs;
  });
}

function appendPendingMessagesToHistory(
  history: ChatHistory[] | undefined,
  pendingMessages: ChatMessage[],
  todayLabel: string
): ChatHistory[] {
  const base = Array.isArray(history)
    ? history.map((group) => ({ ...group, messages: [...group.messages] }))
    : [];

  if (pendingMessages.length === 0) return base;
  const persistedIds = new Set(
    base.flatMap((group) =>
      group.messages
        .map((message) => message.id)
        .filter((id): id is string => typeof id === 'string' && id.length > 0)
    )
  );
  const visiblePendingMessages = pendingMessages.filter(
    (message) => !message.id || !persistedIds.has(message.id)
  );

  if (visiblePendingMessages.length === 0) return base;

  const lastGroup = base.length > 0 ? base[base.length - 1] : null;
  if (lastGroup?.date === todayLabel) {
    lastGroup.messages.push(...visiblePendingMessages);
    return base;
  }

  base.push({
    date: todayLabel,
    messages: [...visiblePendingMessages],
  });
  return base;
}

function countMessagesInHistory(history: ChatHistory[] | undefined): number {
  if (!Array.isArray(history) || history.length === 0) return 0;
  return history.reduce((count, group) => count + (group.messages?.length ?? 0), 0);
}

function mergeChatHistories(
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
      return;
    }

    merged.push({
      ...group,
      messages: [...nextMessages],
    });
  };

  [olderHistory, latestHistory].forEach((history) => {
    if (!Array.isArray(history)) return;
    history.forEach(appendGroup);
  });

  return merged;
}

/* ----- Date separator ----- */
const DateSeparator = React.memo(function DateSeparator({
  date,
}: {
  date: string;
}) {
  return (
    <View style={styles.dateSeparator}>
      <View style={styles.dateLine} />
      <Text style={styles.dateText}>{date}</Text>
      <View style={styles.dateLine} />
    </View>
  );
});

/* ----- Type label keys ----- */
const TYPE_LABEL_KEYS: Record<string, string> = { partner: 'findPartner', errand: 'errands', secondhand: 'secondhand', rating: 'ratings', post: 'forum' };

/* ----- Card theme: unified monochrome ----- */
const CARD_THEME = {
  bg: '#FFFFFF',
  iconBg: '#F5F5F5',
  iconColor: '#000000',
  accent: '#999999',
  divider: 'rgba(0,0,0,0.06)',
};

const TYPE_ICONS = { partner: UsersIcon, errand: TruckIcon, secondhand: ShoppingBagIcon, rating: StarIcon, post: EditIcon };

const SINGLE_MEDIA_MAX_WIDTH = 220;
const SINGLE_MEDIA_MAX_HEIGHT = 280;
const GRID_MEDIA_MAX_WIDTH = 110;
const GRID_MEDIA_MAX_HEIGHT = 140;
const CHAT_MEDIA_SIZE_CACHE_MAX = 800;
const chatMediaSizeCache = new Map<string, { width: number; height: number }>();
const CHAT_ITEM_VERTICAL_SPACING = spacing.lg;

const ChatMediaThumbnail = React.memo(function ChatMediaThumbnail({
  uri,
  mediaIdentity,
  intrinsicWidth,
  intrinsicHeight,
  totalCount,
  onPress,
  onLongPress,
}: {
  uri: string;
  mediaIdentity?: string;
  intrinsicWidth?: number;
  intrinsicHeight?: number;
  totalCount: number;
  onPress: () => void;
  onLongPress?: () => void;
}) {
  const maxWidth = totalCount === 1 ? SINGLE_MEDIA_MAX_WIDTH : GRID_MEDIA_MAX_WIDTH;
  const maxHeight = totalCount === 1 ? SINGLE_MEDIA_MAX_HEIGHT : GRID_MEDIA_MAX_HEIGHT;
  const stableIdentity = mediaIdentity || uri;
  const cacheKey = `${stableIdentity}|${maxWidth}|${maxHeight}`;
  const cachedSize = chatMediaSizeCache.get(cacheKey);
  const [size, setSize] = useState(() =>
    cachedSize ??
    getContainedMediaSize(
      intrinsicWidth && intrinsicWidth > 0 ? intrinsicWidth : maxWidth,
      intrinsicHeight && intrinsicHeight > 0 ? intrinsicHeight : maxHeight,
      maxWidth,
      maxHeight
    )
  );

  useEffect(() => {
    if (cachedSize) {
      setSize((prev) =>
        prev.width === cachedSize.width && prev.height === cachedSize.height ? prev : cachedSize
      );
      return;
    }
    const fallbackSize = getContainedMediaSize(
      intrinsicWidth && intrinsicWidth > 0 ? intrinsicWidth : maxWidth,
      intrinsicHeight && intrinsicHeight > 0 ? intrinsicHeight : maxHeight,
      maxWidth,
      maxHeight
    );
    setSize((prev) =>
      prev.width === fallbackSize.width && prev.height === fallbackSize.height ? prev : fallbackSize
    );
  }, [cacheKey, cachedSize, intrinsicHeight, intrinsicWidth, maxHeight, maxWidth, uri]);

  const handleImageLoad = useCallback((event: ImageLoadEventData) => {
    const width = Number(event?.source?.width);
    const height = Number(event?.source?.height);
    if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return;
    const nextSize = getContainedMediaSize(width, height, maxWidth, maxHeight);
    if (!chatMediaSizeCache.has(cacheKey) && chatMediaSizeCache.size >= CHAT_MEDIA_SIZE_CACHE_MAX) {
      const oldestKey = chatMediaSizeCache.keys().next().value as string | undefined;
      if (oldestKey) chatMediaSizeCache.delete(oldestKey);
    }
    chatMediaSizeCache.set(cacheKey, nextSize);
    setSize((prev) =>
      prev.width === nextSize.width && prev.height === nextSize.height ? prev : nextSize
    );
  }, [cacheKey, maxHeight, maxWidth]);

  const longPressTriggeredRef = useRef(false);
  const handleLongPress = useCallback(() => {
    longPressTriggeredRef.current = true;
    onLongPress?.();
  }, [onLongPress]);
  const handlePress = useCallback(() => {
    if (longPressTriggeredRef.current) {
      longPressTriggeredRef.current = false;
      return;
    }
    onPress();
  }, [onPress]);

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={handlePress}
      onLongPress={handleLongPress}
      delayLongPress={300}
      style={styles.mediaPressTarget}
    >
      <ExpoImage
        source={uri}
        style={[styles.mediaImage, size]}
        contentFit="contain"
        cachePolicy="memory-disk"
        transition={0}
        recyclingKey={stableIdentity}
        onLoad={handleImageLoad}
      />
    </TouchableOpacity>
  );
});

const ChatAlbumBubble = React.memo(function ChatAlbumBubble({
  images,
  count,
  mediaIdentity,
  isMine,
  onPress,
  onLongPress,
  t,
}: {
  images: string[];
  count: number;
  mediaIdentity?: string;
  isMine: boolean;
  onPress: () => void;
  onLongPress?: () => void;
  t: (key: string, options?: Record<string, unknown>) => string;
}) {
  const coverImage = images[0];
  const longPressTriggeredRef = useRef(false);
  const handleLongPress = useCallback(() => {
    longPressTriggeredRef.current = true;
    onLongPress?.();
  }, [onLongPress]);
  const handlePress = useCallback(() => {
    if (longPressTriggeredRef.current) {
      longPressTriggeredRef.current = false;
      return;
    }
    onPress();
  }, [onPress]);

  return (
    <TouchableOpacity
      style={[styles.albumBubble, isMine ? styles.albumBubbleMine : styles.albumBubbleTheirs]}
      activeOpacity={0.85}
      onPress={handlePress}
      onLongPress={handleLongPress}
      delayLongPress={300}
    >
      {coverImage ? (
        <ExpoImage
          source={coverImage}
          style={styles.albumCoverImage}
          contentFit="cover"
          cachePolicy="memory-disk"
          transition={0}
          recyclingKey={mediaIdentity || coverImage}
        />
      ) : null}
      <View style={styles.albumBubbleContent}>
        <Text style={[styles.albumBubbleTitle, isMine ? styles.albumBubbleTitleMine : styles.albumBubbleTitleTheirs]}>
          {t('messageAlbumTitle')}
        </Text>
        <Text style={[styles.albumBubbleMeta, isMine ? styles.albumBubbleMetaMine : styles.albumBubbleMetaTheirs]}>
          {t('messageAlbumPreview', { count })}
        </Text>
      </View>
    </TouchableOpacity>
  );
});

function isSameStringArray(a?: string[], b?: string[]) {
  if (a === b) return true;
  if (!a || !b) return !a && !b;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

function isSameMediaMetas(a?: ChatMessage['mediaMetas'], b?: ChatMessage['mediaMetas']) {
  if (a === b) return true;
  if (!a || !b) return !a && !b;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (
      a[i]?.uri !== b[i]?.uri ||
      a[i]?.width !== b[i]?.width ||
      a[i]?.height !== b[i]?.height ||
      a[i]?.localKey !== b[i]?.localKey
    ) {
      return false;
    }
  }
  return true;
}

function isSameReplyTo(a?: ChatMessage['replyTo'], b?: ChatMessage['replyTo']) {
  if (a === b) return true;
  if (!a || !b) return !a && !b;
  return (
    a.text === b.text &&
    a.from === b.from &&
    a.fromName === b.fromName &&
    a.messageId === b.messageId &&
    a.clientKey === b.clientKey &&
    a.type === b.type &&
    a.title === b.title &&
    a.thumbnailUri === b.thumbnailUri &&
    a.durationMs === b.durationMs &&
    a.cardType === b.cardType
  );
}

function isSameFunctionCard(a?: ChatMessage['functionCard'], b?: ChatMessage['functionCard']) {
  if (a === b) return true;
  if (!a || !b) return !a && !b;
  return (
    a.type === b.type &&
    a.id === b.id &&
    a.index === b.index &&
    a.title === b.title &&
    a.posterName === b.posterName &&
    a.postId === b.postId
  );
}

function isSameReactions(a?: ChatMessage['reactions'], b?: ChatMessage['reactions']) {
  if (a === b) return true;
  if (!a || !b) return !a && !b;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    const ra = a[i];
    const rb = b[i];
    if (
      ra.emoji !== rb.emoji ||
      ra.count !== rb.count ||
      Boolean(ra.reactedByMe) !== Boolean(rb.reactedByMe)
    ) {
      return false;
    }
  }
  return true;
}

function areChatMessagesEquivalent(a: ChatMessage, b: ChatMessage) {
  if (a === b) return true;
  return (
    a.id === b.id &&
    a.createdAt === b.createdAt &&
    a.mediaGroupId === b.mediaGroupId &&
    a.type === b.type &&
    a.text === b.text &&
    a.time === b.time &&
    a.isRecalled === b.isRecalled &&
    a.status === b.status &&
    a.audio?.url === b.audio?.url &&
    a.audio?.durationMs === b.audio?.durationMs &&
    a.imageAlbum?.count === b.imageAlbum?.count &&
    isSameReplyTo(a.replyTo, b.replyTo) &&
    isSameFunctionCard(a.functionCard, b.functionCard) &&
    isSameStringArray(a.images, b.images) &&
    isSameMediaMetas(a.mediaMetas, b.mediaMetas) &&
    isSameReactions(a.reactions, b.reactions)
  );
}

type MessageReplyBlockProps = {
  replyTo?: ChatMessage['replyTo'];
  isMine: boolean;
  myReplyName: string;
  theirReplyName: string;
  t: (key: string, options?: Record<string, unknown>) => string;
};

function ReplyReferenceAccessory({
  replyTo,
}: {
  replyTo: NonNullable<ChatMessage['replyTo']>;
}) {
  if (replyTo.thumbnailUri) {
    return (
      <ExpoImage
        source={replyTo.thumbnailUri}
        style={styles.replyThumbnail}
        contentFit="cover"
        cachePolicy="memory-disk"
        transition={0}
        recyclingKey={replyTo.thumbnailUri}
      />
    );
  }

  const iconType = getReplyReferenceIconType(replyTo);
  if (!iconType) return null;

  const IconComp =
    iconType === 'image'
      ? ImageIcon
      : iconType === 'audio'
        ? MicIcon
        : iconType === 'partner' || iconType === 'errand' || iconType === 'secondhand' || iconType === 'rating' || iconType === 'post'
          ? TYPE_ICONS[iconType]
          : CloseIcon;

  return (
    <View style={styles.replyAccessoryIconWrap}>
      <IconComp size={14} color={colors.onSurfaceVariant} />
    </View>
  );
}

function ReplyReferenceInlineContent({
  replyTo,
  authorLabel,
  t,
}: {
  replyTo: NonNullable<ChatMessage['replyTo']>;
  authorLabel: string;
  t: (key: string, options?: Record<string, unknown>) => string;
}) {
  const previewText = formatReplyReferenceText(replyTo, t);
  const authorPrefix = `${authorLabel}：`;

  if (replyTo.thumbnailUri) {
    return (
      <View style={styles.replyInlineRow}>
        <Text style={styles.replyInlineAuthor} numberOfLines={1}>
          {authorPrefix}
        </Text>
        <ExpoImage
          source={replyTo.thumbnailUri}
          style={styles.replyInlineThumbnail}
          contentFit="cover"
          cachePolicy="memory-disk"
          transition={0}
          recyclingKey={replyTo.thumbnailUri}
        />
      </View>
    );
  }

  if (replyTo.type === 'audio') {
    return (
      <View style={styles.replyInlineRow}>
        <Text style={styles.replyInlineAuthor} numberOfLines={1}>
          {authorPrefix}
        </Text>
        <View style={styles.replyInlineAudio}>
          <ReplyAudioGlyph color="#111111" />
          <Text style={styles.replyInlineAudioText}>
            {formatReplyDurationLabel(replyTo.durationMs) || formatReplyReferenceText(replyTo, t)}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <Text style={styles.replyInlineText} numberOfLines={2}>
      <Text style={styles.replyInlineAuthor}>{authorPrefix}</Text>
      <Text style={styles.replyInlineBody}>{previewText}</Text>
    </Text>
  );
}

const MessageReplyBlock = React.memo(function MessageReplyBlock({
  replyTo,
  isMine,
  myReplyName,
  theirReplyName,
  t,
}: MessageReplyBlockProps) {
  if (!replyTo) return null;
  const replyFromLabel = resolveReplyAuthorLabel(replyTo, myReplyName, theirReplyName, t);
  return (
    <View style={[styles.replyBlock, isMine ? styles.replyBlockMine : styles.replyBlockTheirs]}>
      <ReplyReferenceInlineContent
        replyTo={replyTo}
        authorLabel={replyFromLabel}
        t={t}
      />
    </View>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.isMine === nextProps.isMine &&
    prevProps.myReplyName === nextProps.myReplyName &&
    prevProps.theirReplyName === nextProps.theirReplyName &&
    prevProps.t === nextProps.t &&
    isSameReplyTo(prevProps.replyTo, nextProps.replyTo)
  );
});

type TextMessageContentProps = {
  message: ChatMessage;
  isMine: boolean;
  t: (key: string, options?: Record<string, unknown>) => string;
};

const TextMessageContent = React.memo(function TextMessageContent({
  message,
  isMine,
  t,
}: TextMessageContentProps) {
  return (
    <View
      style={[
        styles.bubble,
        isMine ? styles.bubbleMine : styles.bubbleTheirs,
      ]}
    >
      <Text
        style={[
          styles.bubbleText,
          isMine ? styles.bubbleTextMine : styles.bubbleTextTheirs,
          message.isRecalled ? styles.bubbleTextRecalled : undefined,
        ]}
      >
        {message.text}
      </Text>
    </View>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.isMine === nextProps.isMine &&
    prevProps.t === nextProps.t &&
    prevProps.message.text === nextProps.message.text &&
    prevProps.message.isRecalled === nextProps.message.isRecalled
  );
});

type ImageMessageContentProps = {
  message: ChatMessage;
  isMine: boolean;
  onImagePress?: (images: string[], index: number) => void;
  onLongPressMessage?: (message: ChatMessage) => void;
  t: (key: string, options?: Record<string, unknown>) => string;
};

const ImageMessageContent = React.memo(function ImageMessageContent({
  message,
  isMine,
  onImagePress,
  onLongPressMessage,
  t,
}: ImageMessageContentProps) {
  const images = message.images ?? [];
  const messageIdentity = message.clientKey || message.id || `message-${message.time}`;
  const mediaMetas = message.mediaMetas ?? [];
  const displayImages = images.map((uri, index) => mediaMetas[index]?.uri ?? uri);

  return (
    <View style={styles.mediaBubble}>
      {message.text ? (
        <Text
          style={[
            styles.bubbleText,
            isMine ? styles.bubbleTextMine : styles.bubbleTextTheirs,
          ]}
        >
          {message.text}
        </Text>
      ) : null}
      {message.imageAlbum ? (
        <ChatAlbumBubble
          images={displayImages}
          count={message.imageAlbum.count}
          mediaIdentity={`${messageIdentity}-album`}
          isMine={isMine}
          onPress={() => onImagePress?.(displayImages, 0)}
          onLongPress={() => onLongPressMessage?.(message)}
          t={t}
        />
      ) : (
        <View style={styles.mediaGrid}>
          {displayImages.slice(0, 4).map((uri, index) => (
            <ChatMediaThumbnail
              key={`${uri}-${index}`}
              uri={uri}
              mediaIdentity={`${messageIdentity}-${index}`}
              intrinsicWidth={mediaMetas[index]?.width}
              intrinsicHeight={mediaMetas[index]?.height}
              totalCount={images.length}
              onPress={() => onImagePress?.(displayImages, index)}
              onLongPress={() => onLongPressMessage?.(message)}
            />
          ))}
        </View>
      )}
    </View>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.isMine === nextProps.isMine &&
    prevProps.t === nextProps.t &&
    prevProps.onImagePress === nextProps.onImagePress &&
    prevProps.onLongPressMessage === nextProps.onLongPressMessage &&
    prevProps.message.text === nextProps.message.text &&
    prevProps.message.imageAlbum?.count === nextProps.message.imageAlbum?.count &&
    isSameStringArray(prevProps.message.images, nextProps.message.images)
  );
});

type AudioMessageContentProps = {
  message: ChatMessage;
  isMine: boolean;
  isAudioPlaying?: boolean;
  onPlayAudio?: (message: ChatMessage) => void;
  onLongPressMessage?: (message: ChatMessage) => void;
};

const AudioMessageContent = React.memo(function AudioMessageContent({
  message,
  isMine,
  isAudioPlaying,
  onPlayAudio,
  onLongPressMessage,
}: AudioMessageContentProps) {
  return (
    <VoiceMessageBubble
      isMine={isMine}
      durationMs={message.audio?.durationMs || 0}
      isPlaying={isAudioPlaying}
      isRead={message.status === 'read' || !isMine}
      onPress={() => onPlayAudio?.(message)}
      onLongPress={() => onLongPressMessage?.(message)}
    />
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.isMine === nextProps.isMine &&
    Boolean(prevProps.isAudioPlaying) === Boolean(nextProps.isAudioPlaying) &&
    prevProps.onPlayAudio === nextProps.onPlayAudio &&
    prevProps.onLongPressMessage === nextProps.onLongPressMessage &&
    prevProps.message.id === nextProps.message.id &&
    prevProps.message.status === nextProps.message.status &&
    prevProps.message.audio?.url === nextProps.message.audio?.url &&
    prevProps.message.audio?.durationMs === nextProps.message.audio?.durationMs
  );
});

type MessageDeliveryStatusProps = {
  message: ChatMessage;
  onRetryFailedMessage?: (message: ChatMessage) => void;
};

const SendingSpinner = React.memo(function SendingSpinner() {
  const rotation = useSharedValue(0);

  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(1, {
        duration: 920,
        easing: Easing.bezier(0.42, 0, 0.22, 1),
      }),
      -1,
      false
    );

    return () => {
      cancelAnimation(rotation);
    };
  }, [rotation]);

  const spinnerStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value * 360}deg` }],
  }));

  return (
    <View style={styles.messageSpinnerTrack}>
      <Animated.View style={[styles.messageSpinnerArc, spinnerStyle]} />
    </View>
  );
});

const MessageDeliveryStatus = React.memo(function MessageDeliveryStatus({
  message,
  onRetryFailedMessage,
}: MessageDeliveryStatusProps) {
  if (message.type !== 'sent') return null;

  if (message.status === 'sending') {
    return (
      <View style={styles.messageStatusWrap}>
        <SendingSpinner />
      </View>
    );
  }

  if (message.status === 'failed') {
    return (
      <TouchableOpacity
        activeOpacity={0.75}
        style={styles.messageStatusWrap}
        onPress={() => onRetryFailedMessage?.(message)}
      >
        <View style={styles.messageFailedBadge}>
          <Text style={styles.messageFailedBadgeText}>!</Text>
        </View>
      </TouchableOpacity>
    );
  }

  return null;
}, (prevProps, nextProps) => {
  return (
    prevProps.onRetryFailedMessage === nextProps.onRetryFailedMessage &&
    prevProps.message.id === nextProps.message.id &&
    prevProps.message.status === nextProps.message.status
  );
});

/* ----- Chat bubble with avatar ----- */
const ChatBubble = React.memo(function ChatBubble({
  message,
  myAvatarText,
  myAvatarUri,
  theirAvatarText,
  theirAvatarUri,
  onCardPress,
  onLongPressMessage,
  onSwipeReply,
  onPlayAudio,
  onImagePress,
  onPressReaction,
  onRetryFailedMessage,
  isAudioPlaying,
  t,
}: ChatBubbleProps) {
  const isMine = message.type === 'sent';
  const card = message.functionCard;
  const isRecalled = Boolean(message.isRecalled);
  const hasImages = Array.isArray(message.images) && message.images.length > 0;
  const hasAudio = Boolean(message.audio?.url);
  const hasReactions = Array.isArray(message.reactions) && message.reactions.length > 0;
  const hasDeliveryStatus = message.type === 'sent' && (message.status === 'sending' || message.status === 'failed');
  const swipeTranslateX = useSharedValue(0);
  const swipeReplyHintOpacity = useSharedValue(0);

  const swipeGesture = useMemo(
    () =>
      Gesture.Pan()
        .enabled(Boolean(onSwipeReply))
        .minDistance(10)
        .activeOffsetX([28, 999])
        .failOffsetY([-8, 8])
        .onUpdate((event) => {
          const nextX = Math.max(0, Math.min(event.translationX, 40));
          swipeTranslateX.value = nextX;
          swipeReplyHintOpacity.value = Math.min(1, nextX / 24);
        })
        .onEnd((event) => {
          const shouldReply = event.translationX >= 34;
          swipeTranslateX.value = withTiming(0, { duration: 180 });
          swipeReplyHintOpacity.value = withTiming(0, { duration: 160 });
          if (shouldReply && onSwipeReply) {
            runOnJS(hapticLight)();
            runOnJS(onSwipeReply)(message);
          }
        })
        .onFinalize(() => {
          swipeTranslateX.value = withTiming(0, { duration: 180 });
          swipeReplyHintOpacity.value = withTiming(0, { duration: 160 });
        }),
    [message, onSwipeReply, swipeReplyHintOpacity, swipeTranslateX]
  );

  const swipeBubbleAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: swipeTranslateX.value }],
  }));

  const swipeReplyHintAnimatedStyle = useAnimatedStyle(() => ({
    opacity: swipeReplyHintOpacity.value,
    transform: [{ scale: 0.92 + swipeReplyHintOpacity.value * 0.08 }],
  }));

  if (isRecalled) {
    const recalledText = isMine
      ? t('messageYouRecalled')
      : t('messagePeerRecalled');
    const recalledNode = (
      <View style={styles.recalledNoticeRow}>
        <Text style={styles.recalledNoticeText}>{recalledText}</Text>
      </View>
    );
    if (!onLongPressMessage) {
      return recalledNode;
    }
    return (
      <TouchableOpacity
        activeOpacity={1}
        onLongPress={() => onLongPressMessage(message)}
        delayLongPress={300}
      >
        {recalledNode}
      </TouchableOpacity>
    );
  }

  const messageBodyNode = (
    <View style={styles.bubbleBodyWrap}>
      {card ? (() => {
        const IconComp = TYPE_ICONS[card.type];
        return (
          <TouchableOpacity
            style={styles.cardBubble}
            activeOpacity={0.8}
            onPress={() => onCardPress?.(card)}
            onLongPress={() => onLongPressMessage?.(message)}
            delayLongPress={300}
          >
            <View style={styles.cardContent}>
              <View style={styles.cardTopRow}>
                <View style={styles.cardIconCircle}>
                  <IconComp size={13} color={CARD_THEME.iconColor} />
                </View>
                <Text style={styles.cardTypeText}>
                  {t(TYPE_LABEL_KEYS[card.type]) || card.type}
                </Text>
                <ChevronRightIcon size={12} color="#CCCCCC" />
              </View>
              <Text style={styles.cardTitle} numberOfLines={2}>{card.title}</Text>
              <View style={styles.cardDivider} />
              <View style={styles.cardFooter}>
                <Text style={styles.cardPosterText} numberOfLines={1}>{card.posterName}</Text>
              </View>
            </View>
          </TouchableOpacity>
        );
      })() : hasImages ? (
        <ImageMessageContent
          message={message}
          isMine={isMine}
          onImagePress={onImagePress}
          onLongPressMessage={onLongPressMessage}
          t={t}
        />
      ) : hasAudio ? (
        <AudioMessageContent
          message={message}
          isMine={isMine}
          isAudioPlaying={isAudioPlaying}
          onPlayAudio={onPlayAudio}
          onLongPressMessage={onLongPressMessage}
        />
      ) : (
        <TextMessageContent
          message={message}
          isMine={isMine}
          t={t}
        />
      )}
    </View>
  );

  const interactiveBodyNode = (() => {
    const wrappedForLongPress = onLongPressMessage ? (
      <TouchableOpacity
        activeOpacity={1}
        onLongPress={() => onLongPressMessage(message)}
        delayLongPress={300}
      >
        {messageBodyNode}
      </TouchableOpacity>
    ) : (
      messageBodyNode
    );

    return onSwipeReply ? (
      <GestureDetector gesture={swipeGesture}>{wrappedForLongPress}</GestureDetector>
    ) : (
      wrappedForLongPress
    );
  })();

  const bubbleNode = (
    <View
      style={[
        styles.bubbleRow,
        isMine ? styles.bubbleRowRight : styles.bubbleRowLeft,
      ]}
    >
      {!isMine && (
        <View style={styles.avatarWrap}>
          <Avatar text={theirAvatarText} uri={theirAvatarUri} size="sm" />
        </View>
      )}
      <Animated.View
        style={[
          styles.bubbleCol,
          swipeBubbleAnimatedStyle,
        ]}
      >
        <Animated.View
          style={[
            styles.replySwipeHintWrap,
            isMine ? styles.replySwipeHintWrapRight : styles.replySwipeHintWrapLeft,
            swipeReplyHintAnimatedStyle,
          ]}
          pointerEvents="none"
        >
          <View style={styles.replySwipeHint}>
            <Text style={styles.replySwipeHintText}>{'\u21A9'}</Text>
          </View>
        </Animated.View>
        <View
          style={[
            styles.messageContentStack,
            isMine ? styles.messageContentStackMine : styles.messageContentStackTheirs,
          ]}
        >
          {interactiveBodyNode}
        <MessageReplyBlock
          replyTo={message.replyTo}
          isMine={isMine}
          myReplyName={myAvatarText}
          theirReplyName={theirAvatarText}
          t={t}
        />
      </View>
        {hasReactions || hasDeliveryStatus ? (
          <View style={styles.bubbleFooterRow}>
            {hasReactions ? (
              <View style={styles.reactionList}>
                {message.reactions?.map((reaction) => (
                  <TouchableOpacity
                    key={`${reaction.emoji}-${reaction.reactedByMe ? 'me' : 'peer'}`}
                    style={[styles.reactionChip, reaction.reactedByMe ? styles.reactionChipMine : undefined]}
                    activeOpacity={0.8}
                    onPress={() => onPressReaction?.(message, reaction.emoji, Boolean(reaction.reactedByMe))}
                  >
                    <Text style={styles.reactionEmoji}>{reaction.emoji}</Text>
                    <Text style={styles.reactionCount}>{reaction.count}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <View />
            )}
            <View style={styles.bubbleMetaRight}>
              <MessageDeliveryStatus
                message={message}
                onRetryFailedMessage={onRetryFailedMessage}
              />
            </View>
          </View>
        ) : null}
      </Animated.View>
      {isMine && (
        <View style={styles.avatarWrap}>
          <Avatar text={myAvatarText} uri={myAvatarUri} size="sm" />
        </View>
      )}
    </View>
  );
  return bubbleNode;
}, (prevProps, nextProps) => {
  return (
    prevProps.myAvatarText === nextProps.myAvatarText &&
    prevProps.myAvatarUri === nextProps.myAvatarUri &&
    prevProps.theirAvatarText === nextProps.theirAvatarText &&
    prevProps.theirAvatarUri === nextProps.theirAvatarUri &&
    prevProps.onRetryFailedMessage === nextProps.onRetryFailedMessage &&
    prevProps.onSwipeReply === nextProps.onSwipeReply &&
    Boolean(prevProps.isAudioPlaying) === Boolean(nextProps.isAudioPlaying) &&
    prevProps.t === nextProps.t &&
    areChatMessagesEquivalent(prevProps.message, nextProps.message)
  );
});

/* ----- Waveform color palette ----- */
const WAVE_COLORS = [colors.error];

/* ----- Waveform bar (single animated bar with staggered start) ----- */
const WAVE_BAR_COUNT = 24;
const BAR_STAGGER_MS = 60;

const WaveBar = React.memo(function WaveBar({ index }: { index: number }) {
  const height = useSharedValue(3);

  useEffect(() => {
    const delay = index * BAR_STAGGER_MS;
    const dur = 200 + (index % 5) * 50;
    const maxH = 10 + (index % 4) * 5;
    const timer = setTimeout(() => {
      height.value = withRepeat(
        withSequence(
          withTiming(maxH, { duration: dur }),
          withTiming(4, { duration: dur })
        ),
        -1,
        true
      );
    }, delay);
    return () => {
      clearTimeout(timer);
      cancelAnimation(height);
    };
  }, [height, index]);

  const barStyle = useAnimatedStyle(() => ({
    height: height.value,
  }));

  return (
    <Animated.View
      style={[styles.waveBar, { backgroundColor: WAVE_COLORS[index % WAVE_COLORS.length] }, barStyle]}
    />
  );
});

/* ----- Waveform bars container ----- */
const waveBars = Array.from({ length: WAVE_BAR_COUNT }, (_, i) => i);

function WaveformBars() {
  return (
    <View style={styles.waveformContainer}>
      {waveBars.map((i) => (
        <WaveBar key={i} index={i} />
      ))}
    </View>
  );
}

function getContainedMediaSize(
  sourceWidth: number,
  sourceHeight: number,
  maxWidth: number,
  maxHeight: number
) {
  const widthRatio = maxWidth / sourceWidth;
  const heightRatio = maxHeight / sourceHeight;
  const scale = Math.min(widthRatio, heightRatio, 1);

  return {
    width: Math.max(48, Math.round(sourceWidth * scale)),
    height: Math.max(48, Math.round(sourceHeight * scale)),
  };
}

export default function ChatScreen({ navigation, route }: Props) {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const {
    contactId,
    contactName,
    contactAvatar,
    forwardedType,
    forwardedTitle,
    forwardedPosterName,
    forwardedId,
    forwardedIndex,
    forwardedPostId,
    forwardedMessage,
    forwardedNonce,
    forwardedRatingCategory,
    backTo,
    forwardedRequiresConfirm,
  } = route.params;
  const isScreenFocused = useIsFocused();
  const { data: chatHistory, isLoading } = useChatHistory(contactId, {
    enabled: isScreenFocused,
    polling: false,
  });
  const { data: canSendState } = useCanSendMessage(contactId);
  const canSendMessage = canSendState?.canSendMessage;
  const canSendReason = canSendState?.reason;
  const { data: presence } = usePresence(contactId);
  const sendMessageMutation = useSendMessage(contactId, {
    name: contactName,
    avatar: contactAvatar,
  });
  const sendMessage = sendMessageMutation.mutateAsync;
  const recallMessageMutation = useRecallMessage(contactId);
  const user = useAuthStore((s) => s.user);
  const clearUnread = useMessageStore((s) => s.clearUnread);
  const setActiveChatContact = useMessageStore((s) => s.setActiveChatContact);
  const showSnackbar = useUIStore((s) => s.showSnackbar);
  const typingState = useMessageRealtimeStore((s) => s.typingByContact[contactId]);
  const clearTyping = useMessageRealtimeStore((s) => s.clearTyping);
  const { tabBarTranslateY } = useTabBarAnimation();
  const hiddenTabBarOffset = layout.bottomNavHeight + insets.bottom;
  const shouldForceLatestOnReadyRef = useRef(true);
  const scrollRetryTimersRef = useRef<Array<ReturnType<typeof setTimeout>>>([]);
  const flatListRef = useRef<FlashListRef<ChatListItem>>(null);
  const textInputRef = useRef<TextInput | null>(null);
  const isNearLatestRef = useRef(true);
  const anchorToLatestRef = useRef(true);
  const hasUserDraggedRef = useRef(false);
  const lastKnownListLengthRef = useRef(0);
  const isFetchingOlderHistoryRef = useRef(false);
  const isAppendingOlderHistoryRef = useRef(false);
  const olderHistoryLoadingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prefetchedOlderHistoryChunkRef = useRef<ChatHistoryChunk | null>(null);
  const isPrefetchingOlderHistoryRef = useRef(false);
  const nextHistoryPageRef = useRef(2);
  const hasCompletedInitialLatestPositionRef = useRef(false);
  const olderHistoryLoadArmedRef = useRef(false);
  const olderHistoryTriggerCooldownUntilRef = useRef(0);
  const lastKnownMessageCountRef = useRef(0);
  const pendingNewMessageCountRef = useRef(0);

  const handleBack = useCallback(() => {
    if (backTo?.tab === 'MessagesTab') {
      showTabBar();
      if (navigation.canGoBack()) {
        navigation.goBack();
        return;
      }
      if (!backTo.screen || backTo.screen === 'MessagesList') {
        navigation.reset({
          index: 0,
          routes: [{ name: 'MessagesList' }],
        });
        return;
      }
      navigation.reset({
        index: 1,
        routes: [
          { name: 'MessagesList' },
          {
            name: backTo.screen as keyof MessagesStackParamList,
            params: backTo.params as MessagesStackParamList[keyof MessagesStackParamList],
          },
        ],
      });
      return;
    }

    if (backTo?.tab) {
      showTabBar();
      const parent = navigation.getParent<NavigationProp<MainTabParamList>>();
      navigation.reset({
        index: 0,
        routes: [{ name: 'MessagesList' }],
      });
      if (!parent) return;
      if (backTo.screen) {
        parent.dispatch(
          CommonActions.navigate({
            name: backTo.tab,
            params: {
              screen: backTo.screen,
              params: backTo.params,
            },
          })
        );
        return;
      }
      parent.dispatch(
        CommonActions.navigate({
          name: backTo.tab,
        })
      );
      return;
    }
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    navigation.getParent()?.navigate('MessagesTab', { screen: 'MessagesList' });
  }, [navigation, backTo]);

  const handleOpenManageEmails = useCallback(() => {
    const parent = navigation.getParent<NavigationProp<MainTabParamList>>();
    if (!parent) return;
    parent.dispatch(
      CommonActions.navigate({
        name: 'MeTab',
        params: {
          screen: 'ManageEmails',
        },
      })
    );
  }, [navigation]);

  // Hide tab bar when chat is focused, restore when leaving
  useFocusEffect(
    useCallback(() => {
      tabBarTranslateY.value = withTiming(hiddenTabBarOffset, { duration: 250 });
      return () => {
        tabBarTranslateY.value = withTiming(0, { duration: 250 });
      };
    }, [hiddenTabBarOffset, tabBarTranslateY])
  );

  useFocusEffect(
    useCallback(() => {
      shouldForceLatestOnReadyRef.current = true;
      scrollRetryTimersRef.current.forEach((timer) => clearTimeout(timer));
      scrollRetryTimersRef.current = [];
      isNearLatestRef.current = true;
      anchorToLatestRef.current = true;
      hasUserDraggedRef.current = false;
      lastKnownListLengthRef.current = 0;
      lastKnownMessageCountRef.current = 0;
      hasCompletedInitialLatestPositionRef.current = false;
      olderHistoryLoadArmedRef.current = false;
      isAppendingOlderHistoryRef.current = false;
      olderHistoryTriggerCooldownUntilRef.current = 0;
      setIsInitialLatestPositionReady(false);
      setPendingNewMessageCount(0);
      prefetchedOlderHistoryChunkRef.current = null;
      isPrefetchingOlderHistoryRef.current = false;
      if (olderHistoryLoadingTimerRef.current) {
        clearTimeout(olderHistoryLoadingTimerRef.current);
        olderHistoryLoadingTimerRef.current = null;
      }
      setFocusVersion((prev) => prev + 1);
      setActiveChatContact(contactId);
      clearUnread(contactId);
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        handleBack();
        return true;
      });
      return () => {
        scrollRetryTimersRef.current.forEach((timer) => clearTimeout(timer));
        scrollRetryTimersRef.current = [];
        if (olderHistoryLoadingTimerRef.current) {
          clearTimeout(olderHistoryLoadingTimerRef.current);
          olderHistoryLoadingTimerRef.current = null;
        }
        setActiveChatContact(null);
        sub.remove();
      };
    }, [clearUnread, contactId, handleBack, setActiveChatContact])
  );

  const [inputText, setInputText] = useState('');
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [voiceReleaseAction, setVoiceReleaseActionState] = useState<VoiceReleaseAction>('send');
  const [replyTarget, setReplyTarget] = useState<ChatMessage | null>(null);
  const [actionTarget, setActionTarget] = useState<ChatMessage | null>(null);
  const [playingAudioMessageId, setPlayingAudioMessageId] = useState<string | null>(null);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const cardSentRef = useRef<string | null>(null);
  const cardSendingRef = useRef<string | null>(null);
  const forwardedTextSentRef = useRef<string | null>(null);
  const forwardedTextSendingRef = useRef<string | null>(null);
  const typingStopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingSentRef = useRef(false);
  const audioSoundRef = useRef<Audio.Sound | null>(null);
  const isRecordingRef = useRef(false);
  const voiceReleaseActionRef = useRef<VoiceReleaseAction>('send');
  const pendingReleaseActionRef = useRef<VoiceReleaseAction | null>(null);
  const recordingOverlayRef = useRef<RecordingOverlayRef>(null);
  const recordingStartTimeRef = useRef<number>(0);
  const [recordingDurationMs, setRecordingDurationMs] = useState<number>(0);
  const [pendingForwardConfirmKey, setPendingForwardConfirmKey] = useState<string | null>(null);
  const [pendingForwardSendingKey, setPendingForwardSendingKey] = useState<string | null>(null);
  const [previewImages, setPreviewImages] = useState<string[]>([]);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [hiddenMessageKeys, setHiddenMessageKeys] = useState<string[]>([]);
  const [focusVersion, setFocusVersion] = useState(0);
  const [pendingImageAssets, setPendingImageAssets] = useState<ImagePicker.ImagePickerAsset[]>([]);
  const [imageSendModeVisible, setImageSendModeVisible] = useState(false);
  const [isSendingSelectedImages, setIsSendingSelectedImages] = useState(false);
  const [isTranscribingVoice, setIsTranscribingVoice] = useState(false);
  const [liveTranscriptionText, setLiveTranscriptionText] = useState('');
  const [localPendingMessages, setLocalPendingMessages] = useState<ChatMessage[]>([]);
  const localPendingMessagesRef = useRef<ChatMessage[]>([]);
  const [olderChatHistory, setOlderChatHistory] = useState<ChatHistory[]>([]);
  const [nextHistoryPage, setNextHistoryPage] = useState(2);
  const [hasOlderHistory, setHasOlderHistory] = useState(false);
  const [showOlderHistoryLoading, setShowOlderHistoryLoading] = useState(false);
  const [isInitialLatestPositionReady, setIsInitialLatestPositionReady] = useState(false);
  const [pendingNewMessageCount, setPendingNewMessageCount] = useState(0);
  const [transientMediaVersion, setTransientMediaVersion] = useState(0);
  const {
    inputHeight: chatInputHeight,
    scrollEnabled: isChatInputScrollEnabled,
    handleContentSizeChange: handleChatInputContentSizeChange,
    updateInputHeightByText: updateChatInputHeightByText,
    resetInputHeight: resetChatInputHeight,
  } = useAutoGrowingInput({
    minHeight: CHAT_INPUT_MIN_HEIGHT,
    maxHeight: CHAT_INPUT_MAX_HEIGHT,
    extraHeight: CHAT_INPUT_EXTRA_HEIGHT,
    lineHeight: CHAT_INPUT_LINE_HEIGHT,
  });
  const olderHistoryLoadingOpacity = useSharedValue(0);
  const olderHistoryLoadingTranslateY = useSharedValue(-6);
  const newMessageHintOpacity = useSharedValue(0);
  const newMessageHintTranslateY = useSharedValue(8);
  const replyComposerOpacity = useSharedValue(0);
  const replyComposerTranslateY = useSharedValue(8);
  const replyComposerDragX = useSharedValue(0);
  const replyComposerDragY = useSharedValue(0);
  const recordingDurationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const handleHoldToTalkReleaseRef = useRef<(() => Promise<void>) | null>(null);
  const liveTranscriptionTextRef = useRef('');
  const liveTranscriptionFinalRef = useRef('');
  const liveSpeechActiveRef = useRef(false);

  const handleChatInputTextChange = useCallback((text: string) => {
    setInputText(text);
    updateChatInputHeightByText(text);
  }, [updateChatInputHeightByText]);

  useEffect(() => {
    if (inputText.length === 0) {
      resetChatInputHeight();
    }
  }, [inputText, resetChatInputHeight]);
  const pendingRequestsRef = useRef<Record<string, PendingSendRequest>>({});
  const renderKeyByServerIdRef = useRef<Record<string, string>>({});
  const transientMediaPreviewByKeyRef = useRef<
    Record<string, NonNullable<ChatMessage['mediaMetas']>>
  >({});
  const composerSendLockRef = useRef(false);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvent, () => setIsKeyboardVisible(true));
    const hideSub = Keyboard.addListener(hideEvent, () => setIsKeyboardVisible(false));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  useEffect(() => {
    setLocalPendingMessages([]);
    localPendingMessagesRef.current = [];
    setOlderChatHistory([]);
    setNextHistoryPage(2);
    setHasOlderHistory(false);
    setShowOlderHistoryLoading(false);
    setIsInitialLatestPositionReady(false);
    setPendingNewMessageCount(0);
    setTransientMediaVersion(0);
    isAppendingOlderHistoryRef.current = false;
    olderHistoryTriggerCooldownUntilRef.current = 0;
    prefetchedOlderHistoryChunkRef.current = null;
    isPrefetchingOlderHistoryRef.current = false;
    if (olderHistoryLoadingTimerRef.current) {
      clearTimeout(olderHistoryLoadingTimerRef.current);
      olderHistoryLoadingTimerRef.current = null;
    }
    pendingRequestsRef.current = {};
    renderKeyByServerIdRef.current = {};
    transientMediaPreviewByKeyRef.current = {};
  }, [contactId]);

  useEffect(() => {
    localPendingMessagesRef.current = localPendingMessages;
  }, [localPendingMessages]);

  useEffect(() => {
    nextHistoryPageRef.current = nextHistoryPage;
  }, [nextHistoryPage]);

  useEffect(() => {
    pendingNewMessageCountRef.current = pendingNewMessageCount;
  }, [pendingNewMessageCount]);

  useEffect(() => {
    const currentUserId = user?.id;
    const cachedHiddenMessageKeys =
      currentUserId ? peekHiddenChatMessages(currentUserId, contactId) : undefined;

    setHiddenMessageKeys(cachedHiddenMessageKeys ?? []);

    if (!currentUserId) return;

    let cancelled = false;
    void hydrateHiddenChatMessages(currentUserId, contactId).then((hiddenKeys) => {
      if (cancelled || !hiddenKeys) return;
      setHiddenMessageKeys(hiddenKeys);
    });

    return () => {
      cancelled = true;
    };
  }, [contactId, user?.id]);

  const setVoiceReleaseAction = useCallback((action: VoiceReleaseAction) => {
    voiceReleaseActionRef.current = action;
    setVoiceReleaseActionState(action);
  }, []);

  useEffect(() => {
    liveTranscriptionTextRef.current = liveTranscriptionText;
  }, [liveTranscriptionText]);

  useEffect(() => {
    const speechRecognitionModule = getSpeechRecognitionModule();
    if (!speechRecognitionModule) return;

    const resultSub = speechRecognitionModule.addListener('result', (event) => {
      const transcript = event?.results?.[0]?.transcript?.trim() ?? '';
      if (!transcript) return;
      liveTranscriptionTextRef.current = transcript;
      setLiveTranscriptionText(transcript);
      if (event.isFinal) {
        liveTranscriptionFinalRef.current = transcript;
      }
    });
    const errorSub = speechRecognitionModule.addListener('error', () => {
      liveSpeechActiveRef.current = false;
    });
    const endSub = speechRecognitionModule.addListener('end', () => {
      liveSpeechActiveRef.current = false;
    });
    return () => {
      resultSub.remove();
      errorSub.remove();
      endSub.remove();
      try {
        speechRecognitionModule.abort();
      } catch {
        // Ignore cleanup failures from speech recognizer.
      }
      liveSpeechActiveRef.current = false;
    };
  }, []);

  const composerBottomInset = isKeyboardVisible
    ? spacing.sm
    : Math.max(insets.bottom, spacing.sm);

  const clearLiveTranscription = useCallback(() => {
    liveTranscriptionTextRef.current = '';
    liveTranscriptionFinalRef.current = '';
    setLiveTranscriptionText('');
  }, []);

  const stopLiveSpeechRecognition = useCallback((abort = false) => {
    const speechRecognitionModule = getSpeechRecognitionModule();
    if (!speechRecognitionModule) return;
    if (!liveSpeechActiveRef.current) return;
    try {
      if (abort) {
        speechRecognitionModule.abort();
      } else {
        speechRecognitionModule.stop();
      }
    } catch {
      // Ignore stop/abort failures from speech recognizer.
    }
    liveSpeechActiveRef.current = false;
  }, []);

  const startLiveSpeechRecognition = useCallback(async () => {
    if (liveSpeechActiveRef.current) return;
    const speechRecognitionModule = getSpeechRecognitionModule();
    if (!speechRecognitionModule) return;
    try {
      if (!speechRecognitionModule.isRecognitionAvailable()) return;
      const permission = await speechRecognitionModule.requestPermissionsAsync();
      if (!permission.granted) return;
      speechRecognitionModule.start({
        lang: resolveSpeechRecognitionLocale(i18n.language),
        interimResults: true,
        continuous: true,
        addsPunctuation: true,
        maxAlternatives: 1,
      });
      liveSpeechActiveRef.current = true;
    } catch {
      liveSpeechActiveRef.current = false;
    }
  }, [i18n.language]);

  const forwardedCardDraft = useMemo<ForwardedCardDraft | null>(() => {
    if (!forwardedType || !forwardedPosterName) return null;
    const normalizedType = forwardedType as ForwardedChatType;
    const resolvedId =
      forwardedId ??
      (typeof forwardedIndex === 'number' ? String(forwardedIndex) : undefined);
    const cardTitle =
      (forwardedTitle ?? '').trim() || (normalizedType === 'post' ? t('messageImagePreview') : '-');
    const posterName = forwardedPosterName.trim() || t('themLabel');
    const dedupeKey =
      forwardedNonce?.trim() ||
      `${normalizedType}:${resolvedId ?? ''}:${forwardedRatingCategory ?? ''}:${cardTitle}:${forwardedPostId ?? ''}:${forwardedMessage?.trim() ?? ''}`;
    return {
      normalizedType,
      resolvedId,
      cardTitle,
      posterName,
      dedupeKey,
      messageDedupeKey: forwardedMessage?.trim() ? `${dedupeKey}:message` : null,
      forwardedPostId,
      forwardedMessage,
      requiresConfirm: forwardedRequiresConfirm === true,
      ...(forwardedRatingCategory ? { ratingCategory: forwardedRatingCategory } : {}),
    };
  }, [
    forwardedId,
    forwardedIndex,
    forwardedMessage,
    forwardedNonce,
    forwardedRatingCategory,
    forwardedPosterName,
    forwardedPostId,
    forwardedRequiresConfirm,
    forwardedTitle,
    forwardedType,
    t,
  ]);

  const sendForwardedText = useCallback(
    async (draft: NonNullable<typeof forwardedCardDraft>) => {
      const text = draft.forwardedMessage?.trim();
      if (!text || !draft.messageDedupeKey) return true;
      if (
        forwardedTextSentRef.current === draft.messageDedupeKey ||
        forwardedTextSendingRef.current === draft.messageDedupeKey
      ) {
        return true;
      }
      forwardedTextSendingRef.current = draft.messageDedupeKey;
      try {
        await sendMessage({ payload: { text } });
        forwardedTextSentRef.current = draft.messageDedupeKey;
        return true;
      } catch (error) {
        const msg = looksLikeContentViolation(error)
          ? t('contentViolation')
          : extractErrorMessage(error, t('dataLoadFailed'));
        showSnackbar({ message: msg, type: 'error' });
        return false;
      } finally {
        if (forwardedTextSendingRef.current === draft.messageDedupeKey) {
          forwardedTextSendingRef.current = null;
        }
      }
    },
    [sendMessage, showSnackbar, t]
  );

  const sendForwardedCard = useCallback(
    async (draft: NonNullable<typeof forwardedCardDraft>) => {
      if (cardSentRef.current === draft.dedupeKey || cardSendingRef.current === draft.dedupeKey) {
        return true;
      }
      cardSendingRef.current = draft.dedupeKey;
      setPendingForwardSendingKey(draft.dedupeKey);
      try {
        await sendMessage({
          payload: {
            functionCard: {
              type: draft.normalizedType,
              ...(draft.resolvedId ? { id: draft.resolvedId } : {}),
              title: draft.cardTitle,
              posterName: draft.posterName,
              ...(draft.forwardedPostId ? { postId: draft.forwardedPostId } : {}),
              ...(draft.ratingCategory ? { ratingCategory: draft.ratingCategory } : {}),
            },
          },
        });
        cardSentRef.current = draft.dedupeKey;
        return true;
      } catch (error) {
        const msg = looksLikeContentViolation(error)
          ? t('contentViolation')
          : extractErrorMessage(error, t('dataLoadFailed'));
        showSnackbar({ message: msg, type: 'error' });
        return false;
      } finally {
        if (cardSendingRef.current === draft.dedupeKey) {
          cardSendingRef.current = null;
        }
        setPendingForwardSendingKey((current) => (current === draft.dedupeKey ? null : current));
      }
    },
    [sendMessage, showSnackbar, t]
  );

  useEffect(() => {
    if (isLoading || canSendMessage !== true || !forwardedCardDraft) return;
    if (cardSentRef.current === forwardedCardDraft.dedupeKey) {
      setPendingForwardConfirmKey(null);
      return;
    }
    if (forwardedCardDraft.requiresConfirm) {
      setPendingForwardConfirmKey(forwardedCardDraft.dedupeKey);
      return;
    }
    void (async () => {
      const cardSent = await sendForwardedCard(forwardedCardDraft);
      if (!cardSent) return;
      await sendForwardedText(forwardedCardDraft);
    })();
  }, [canSendMessage, forwardedCardDraft, isLoading, sendForwardedCard, sendForwardedText]);

  const pendingForwardPreview = useMemo(() => {
    if (!forwardedCardDraft || pendingForwardConfirmKey !== forwardedCardDraft.dedupeKey) return null;
    return {
      type: forwardedCardDraft.normalizedType,
      title: forwardedCardDraft.cardTitle,
      typeLabel: t(TYPE_LABEL_KEYS[forwardedCardDraft.normalizedType]) || forwardedCardDraft.normalizedType,
      dedupeKey: forwardedCardDraft.dedupeKey,
    };
  }, [forwardedCardDraft, pendingForwardConfirmKey, t]);

  const recordingRef = useRef<Audio.Recording | null>(null);
  const playingAudioMessageIdRef = useRef<string | null>(null);

  const myAvatarText = user?.nickname || user?.name || t('meLabel');
  const myAvatarUri = user?.avatar || null;
  const theirAvatarText = contactName || t('themLabel');
  const theirAvatarUri = contactAvatar || null;
  const hasText = inputText.trim().length > 0;
  const buildReplyPreview = useCallback(
    (message: ChatMessage) => {
      if (message.isRecalled) {
        return t('messageRecalledPreview');
      }
      if (message.imageAlbum) {
        return t('messageAlbumPreview', { count: message.imageAlbum.count });
      }
      if (message.audio?.url) {
        return t('messageAudioPreview');
      }
      if (Array.isArray(message.images) && message.images.length > 0 && !message.text) {
        return t('messageImagePreview');
      }
      if (message.functionCard) {
        return t('messageSharedCardPreview', {
          type: t(TYPE_LABEL_KEYS[message.functionCard.type]) || message.functionCard.type,
          title: message.functionCard.title,
        });
      }
      return message.text || t('inputMessage');
    },
    [t]
  );

  const buildReplyPayload = useCallback((): ChatMessage['replyTo'] | undefined => {
    if (!replyTarget) return undefined;
    const replyType = replyTarget.isRecalled
      ? 'recalled'
      : replyTarget.imageAlbum
        ? 'album'
        : replyTarget.audio?.url
          ? 'audio'
          : replyTarget.functionCard
            ? 'card'
            : Array.isArray(replyTarget.images) && replyTarget.images.length > 0
              ? 'image'
              : 'text';
    const thumbnailUri = replyTarget.mediaMetas?.[0]?.uri ?? replyTarget.images?.[0];
    const albumTitle = replyTarget.imageAlbum
      ? t('messageAlbumPreview', { count: replyTarget.imageAlbum.count })
      : undefined;

    return {
      text: buildReplyPreview(replyTarget),
      from: (replyTarget.type === 'sent' ? 'me' : 'them') as 'me' | 'them',
      fromName: replyTarget.type === 'sent' ? myAvatarText : theirAvatarText,
      ...(replyTarget.id ? { messageId: replyTarget.id } : {}),
      ...(replyTarget.clientKey ? { clientKey: replyTarget.clientKey } : {}),
      type: replyType,
      ...(replyTarget.functionCard?.title
        ? { title: replyTarget.functionCard.title, cardType: replyTarget.functionCard.type }
        : {}),
      ...(albumTitle ? { title: albumTitle } : {}),
      ...(thumbnailUri ? { thumbnailUri } : {}),
      ...(typeof replyTarget.audio?.durationMs === 'number'
        ? { durationMs: replyTarget.audio.durationMs }
        : {}),
    };
  }, [buildReplyPreview, myAvatarText, replyTarget, t, theirAvatarText]);

  const todayLabel = String(t('messageTimeToday'));
  const activeReplyPayload = useMemo(() => buildReplyPayload(), [buildReplyPayload]);
  const buildLocalMediaMetas = useCallback(
    (
      items: Array<{
        uri: string;
        width?: number;
        height?: number;
        localKey?: string;
      }>
    ): NonNullable<ChatMessage['mediaMetas']> =>
      items.map((item, index) => ({
        uri: item.uri,
        width: Number.isFinite(item.width) ? item.width : undefined,
        height: Number.isFinite(item.height) ? item.height : undefined,
        localKey: item.localKey ?? `${item.uri}-${index}`,
      })),
    []
  );

  const rememberTransientMediaPreview = useCallback((message: Pick<ChatMessage, 'id' | 'clientKey' | 'mediaMetas'>) => {
    if (!message.mediaMetas || message.mediaMetas.length === 0) return;
    const snapshot = message.mediaMetas.map((meta) => ({ ...meta }));
    if (message.id) {
      transientMediaPreviewByKeyRef.current[message.id] = snapshot;
    }
    if (message.clientKey) {
      transientMediaPreviewByKeyRef.current[message.clientKey] = snapshot;
    }
  }, []);

  const resolveTransientMediaPreview = useCallback((message: ChatMessage) => {
    if (message.mediaMetas && message.mediaMetas.length > 0) {
      return message.mediaMetas;
    }
    if (message.id && transientMediaPreviewByKeyRef.current[message.id]) {
      return transientMediaPreviewByKeyRef.current[message.id];
    }
    if (message.clientKey && transientMediaPreviewByKeyRef.current[message.clientKey]) {
      return transientMediaPreviewByKeyRef.current[message.clientKey];
    }
    return undefined;
  }, []);

  const releaseTransientMediaPreview = useCallback((message: Pick<ChatMessage, 'id' | 'clientKey'>) => {
    let changed = false;
    if (message.id && transientMediaPreviewByKeyRef.current[message.id]) {
      delete transientMediaPreviewByKeyRef.current[message.id];
      changed = true;
    }
    if (message.clientKey && transientMediaPreviewByKeyRef.current[message.clientKey]) {
      delete transientMediaPreviewByKeyRef.current[message.clientKey];
      changed = true;
    }
    if (changed) {
      setTransientMediaVersion((current) => current + 1);
    }
  }, []);

  const mergeResolvedMessageWithPreview = useCallback((messageId: string, nextMessage: ChatMessage): ChatMessage => {
    const existingMessage = localPendingMessagesRef.current.find((item) => item.id === messageId);
    const clientKey = existingMessage?.clientKey ?? nextMessage.clientKey ?? messageId;
    const mediaMetas =
      nextMessage.mediaMetas && nextMessage.mediaMetas.length > 0
        ? nextMessage.mediaMetas
        : existingMessage?.mediaMetas;

    const resolvedMessage = {
      ...nextMessage,
      clientKey,
      ...(mediaMetas && mediaMetas.length > 0 ? { mediaMetas } : {}),
      mediaGroupId: nextMessage.mediaGroupId ?? existingMessage?.mediaGroupId,
    };

    rememberTransientMediaPreview(resolvedMessage);
    return resolvedMessage;
  }, [rememberTransientMediaPreview]);

  const upsertLocalPendingMessage = useCallback((message: ChatMessage) => {
    setLocalPendingMessages((current) => {
      const next = [...current];
      const index = next.findIndex((item) => item.id === message.id);
      if (index >= 0) {
        next[index] = message;
      } else {
        next.push(message);
      }
      return sortMessagesByCreatedAt(next);
    });
    rememberTransientMediaPreview(message);
  }, [rememberTransientMediaPreview]);

  const removeLocalPendingMessage = useCallback((messageId: string) => {
    delete pendingRequestsRef.current[messageId];
    setLocalPendingMessages((current) => current.filter((item) => item.id !== messageId));
  }, []);

  const resolveLocalPendingMessage = useCallback((messageId: string, nextMessage: ChatMessage) => {
    delete pendingRequestsRef.current[messageId];
    setLocalPendingMessages((current) => {
      const index = current.findIndex((item) => item.id === messageId);
      if (index < 0) {
        const resolvedMessage = mergeResolvedMessageWithPreview(messageId, nextMessage);
        if (resolvedMessage.id) {
          renderKeyByServerIdRef.current[resolvedMessage.id] = resolvedMessage.clientKey!;
        }
        return sortMessagesByCreatedAt([...current, resolvedMessage]);
      }
      const resolvedMessage = mergeResolvedMessageWithPreview(messageId, nextMessage);
      if (resolvedMessage.id) {
        renderKeyByServerIdRef.current[resolvedMessage.id] = resolvedMessage.clientKey!;
      }
      const next = [...current];
      next[index] = resolvedMessage;
      return sortMessagesByCreatedAt(next);
    });
  }, [mergeResolvedMessageWithPreview]);

  const updateLocalPendingMessageStatus = useCallback((messageId: string, status: 'sending' | 'failed') => {
    setLocalPendingMessages((current) =>
      current.map((item) => (item.id === messageId ? { ...item, status } : item))
    );
  }, []);

  const queueLocalPendingMessage = useCallback((message: ChatMessage, request: PendingSendRequest) => {
    if (!message.id) return;
    pendingRequestsRef.current[message.id] = request;
    upsertLocalPendingMessage(message);
  }, [upsertLocalPendingMessage]);

  const buildLocalPendingMessage = useCallback((message: {
    text?: string;
    images?: string[];
    mediaMetas?: ChatMessage['mediaMetas'];
    mediaGroupId?: string;
    audio?: ChatMessage['audio'];
    replyTo?: ChatMessage['replyTo'];
    imageAlbum?: ChatMessage['imageAlbum'];
    functionCard?: ChatMessage['functionCard'];
  }): ChatMessage => {
    const now = new Date();
    const localMessageId = createLocalMessageId();
    return {
      id: localMessageId,
      clientKey: localMessageId,
      createdAt: now.toISOString(),
      type: 'sent',
      text: message.text ?? '',
      ...(message.images ? { images: message.images } : {}),
      ...(message.mediaMetas ? { mediaMetas: message.mediaMetas } : {}),
      ...(message.mediaGroupId ? { mediaGroupId: message.mediaGroupId } : {}),
      ...(message.audio ? { audio: message.audio } : {}),
      ...(message.replyTo ? { replyTo: message.replyTo } : {}),
      ...(message.imageAlbum ? { imageAlbum: message.imageAlbum } : {}),
      ...(message.functionCard ? { functionCard: message.functionCard } : {}),
      time: formatLocalMessageTime(now),
      status: 'sending',
    };
  }, []);

  const resolveSendErrorMessage = useCallback((error: unknown, mediaKind?: 'image' | 'audio') => {
    if (mediaKind === 'image' && looksLikeImageViolation(error)) {
      return t('imageViolation');
    }
    if (looksLikeContentViolation(error)) {
      return t('contentViolation');
    }
    return extractErrorMessage(error, t('dataLoadFailed'));
  }, [t]);

  const refreshMessageQueries = useCallback(async () => {
    await Promise.allSettled([
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unreadCount'] }),
      queryClient.invalidateQueries({ queryKey: ['chat-can-send', contactId] }),
      queryClient.invalidateQueries({ queryKey: ['contacts'], refetchType: 'active' }),
    ]);
  }, [contactId, queryClient]);

  const patchConversationPreview = useCallback((message: ChatMessage) => {
    patchContactsQueries(queryClient, user?.id, (current) => {
      const existing = current?.find((contact) => contact.id === contactId);
      return upsertContact(
        current,
        buildConversationPreviewContact(contactId, message, contactName, contactAvatar, existing)
      );
    });
  }, [contactAvatar, contactId, contactName, queryClient, user?.id]);

  useEffect(() => {
    const persistedIds = new Set(
      (chatHistory ?? []).flatMap((group) =>
        (group.messages ?? [])
          .map((message) => message.id)
          .filter((id): id is string => typeof id === 'string' && id.length > 0)
      )
    );
    if (persistedIds.size === 0) return;
    setLocalPendingMessages((current) => {
      const next = current.filter((message) => !message.id || !persistedIds.has(message.id));
      return next.length === current.length ? current : next;
    });
  }, [chatHistory]);

  useEffect(() => {
    if (!chatHistory) return;
    if (olderChatHistory.length > 0) return;
    setHasOlderHistory(countMessagesInHistory(chatHistory) >= CHAT_HISTORY_PAGE_LIMIT);
    setNextHistoryPage(2);
  }, [chatHistory, olderChatHistory.length]);

  const applyOlderHistoryChunk = useCallback((chunk: ChatHistoryChunk) => {
    if (chunk.history.length > 0) {
      isAppendingOlderHistoryRef.current = true;
      startTransition(() => {
        setOlderChatHistory((current) => mergeChatHistories(chunk.history, current));
      });
    } else {
      isAppendingOlderHistoryRef.current = false;
    }
    setHasOlderHistory(chunk.hasMore);
    setNextHistoryPage(chunk.page + 1);
  }, []);

  const maybePrefetchOlderHistory = useCallback(() => {
    if (
      !isScreenFocused ||
      isLoading ||
      !hasOlderHistory ||
      !isInitialLatestPositionReady ||
      isFetchingOlderHistoryRef.current ||
      isPrefetchingOlderHistoryRef.current
    ) {
      return;
    }

    const targetPage = nextHistoryPageRef.current;
    if (prefetchedOlderHistoryChunkRef.current?.page === targetPage) {
      return;
    }

    isPrefetchingOlderHistoryRef.current = true;
    void messageService
      .getChatHistoryChunk(contactId, {
        page: targetPage,
        limit: CHAT_HISTORY_PAGE_LIMIT,
      })
      .then((chunk) => {
        if (targetPage !== nextHistoryPageRef.current) return;
        prefetchedOlderHistoryChunkRef.current = chunk;
      })
      .catch(() => {
        // Ignore background prefetch failures to avoid interrupting the foreground flow.
      })
      .finally(() => {
        isPrefetchingOlderHistoryRef.current = false;
      });
  }, [contactId, hasOlderHistory, isInitialLatestPositionReady, isLoading, isScreenFocused]);

  useEffect(() => {
    if (
      !isScreenFocused ||
      isLoading ||
      !hasOlderHistory ||
      !isInitialLatestPositionReady ||
      isFetchingOlderHistoryRef.current ||
      isPrefetchingOlderHistoryRef.current
    ) {
      return;
    }

    let cancelled = false;
    const scheduledTask = InteractionManager.runAfterInteractions(() => {
      if (cancelled) return;
      maybePrefetchOlderHistory();
    });

    return () => {
      cancelled = true;
      scheduledTask.cancel?.();
    };
  }, [hasOlderHistory, isInitialLatestPositionReady, isLoading, isScreenFocused, maybePrefetchOlderHistory, nextHistoryPage]);

  const loadOlderHistory = useCallback(async () => {
    if (
      isFetchingOlderHistoryRef.current ||
      !hasOlderHistory ||
      !hasCompletedInitialLatestPositionRef.current ||
      !olderHistoryLoadArmedRef.current ||
      Date.now() < olderHistoryTriggerCooldownUntilRef.current
    ) {
      return;
    }
    isFetchingOlderHistoryRef.current = true;
    olderHistoryLoadArmedRef.current = false;
    isAppendingOlderHistoryRef.current = false;
    olderHistoryTriggerCooldownUntilRef.current = Date.now() + OLDER_HISTORY_TRIGGER_COOLDOWN_MS;
    try {
      const prefetchedChunk =
        prefetchedOlderHistoryChunkRef.current?.page === nextHistoryPage
          ? prefetchedOlderHistoryChunkRef.current
          : null;
      const shouldShowLoading = !prefetchedChunk;

      if (shouldShowLoading) {
        olderHistoryLoadingTimerRef.current = setTimeout(() => {
          setShowOlderHistoryLoading(true);
        }, OLDER_HISTORY_LOADING_DELAY_MS);
      }

      const chunk = prefetchedChunk ?? await messageService.getChatHistoryChunk(contactId, {
        page: nextHistoryPage,
        limit: CHAT_HISTORY_PAGE_LIMIT,
      });

      prefetchedOlderHistoryChunkRef.current = null;
      if (olderHistoryLoadingTimerRef.current) {
        clearTimeout(olderHistoryLoadingTimerRef.current);
        olderHistoryLoadingTimerRef.current = null;
      } else {
        setShowOlderHistoryLoading(false);
      }
      setShowOlderHistoryLoading(false);
      applyOlderHistoryChunk(chunk);
    } catch {
      if (olderHistoryLoadingTimerRef.current) {
        clearTimeout(olderHistoryLoadingTimerRef.current);
        olderHistoryLoadingTimerRef.current = null;
      }
      setShowOlderHistoryLoading(false);
      isAppendingOlderHistoryRef.current = false;
      showSnackbar({ message: t('dataLoadFailed'), type: 'error' });
    } finally {
      isFetchingOlderHistoryRef.current = false;
      olderHistoryTriggerCooldownUntilRef.current = Date.now() + OLDER_HISTORY_TRIGGER_COOLDOWN_MS;
    }
  }, [applyOlderHistoryChunk, contactId, hasOlderHistory, nextHistoryPage, showSnackbar, t]);

  const executePendingSend = useCallback(async (messageId: string, request: PendingSendRequest) => {
    updateLocalPendingMessageStatus(messageId, 'sending');
    const sendStartedAt = Date.now();

    try {
      let sentMessage: ChatMessage | undefined;
      if (request.kind === 'direct') {
        const result = await messageService.sendMessage(contactId, request.payload, request.images);
        sentMessage = result.message;
      } else if (request.kind === 'image-batch') {
        const uploadStartedAt = Date.now();
        const uploaded = await uploadService.uploadImages(request.files);
        recordTimedMessageMetric('image_upload_duration', uploadStartedAt, {
          count: request.files.length,
          mode: request.mode,
        });
        if (request.mode === 'album') {
          const result = await messageService.sendMessage(
            contactId,
            {
              imageAlbum: { count: uploaded.urls.length },
              ...(request.replyTo ? { replyTo: request.replyTo } : {}),
            },
            uploaded.urls
          );
          sentMessage = result.message;
        } else {
          const result = await messageService.sendMessage(
            contactId,
            {
              text: '',
              ...(request.replyTo ? { replyTo: request.replyTo } : {}),
            },
            uploaded.urls
          );
          sentMessage = result.message;
        }
      } else if (request.kind === 'image-single') {
        const uploadStartedAt = Date.now();
        const uploaded = await uploadService.uploadImage(request.file);
        recordTimedMessageMetric('image_upload_duration', uploadStartedAt, {
          count: 1,
          mode: 'single',
        });
        const result = await messageService.sendMessage(
          contactId,
          {
            text: '',
            ...(request.replyTo ? { replyTo: request.replyTo } : {}),
          },
          [uploaded.url]
        );
        sentMessage = result.message;
      } else {
        const uploadStartedAt = Date.now();
        const uploaded = await uploadService.uploadFile(request.file);
        recordTimedMessageMetric('audio_upload_duration', uploadStartedAt, {
          durationMs: request.durationMs ?? 0,
        });
        const result = await messageService.sendMessage(contactId, {
          ...(request.replyTo ? { replyTo: request.replyTo } : {}),
          audio: {
            url: uploaded.url,
            ...(typeof request.durationMs === 'number' ? { durationMs: request.durationMs } : {}),
          },
        });
        sentMessage = result.message;
      }

      if (sentMessage) {
        const resolvedMessage = mergeResolvedMessageWithPreview(messageId, sentMessage);
        resolveLocalPendingMessage(messageId, resolvedMessage);
        patchChatQueries(queryClient, user?.id, contactId, (current, language) =>
          replaceMessageInHistory(current, messageId, resolvedMessage) ??
          appendMessageToHistory(current, resolvedMessage, language)
        );
        patchConversationPreview(resolvedMessage);

        const previewUris =
          resolvedMessage.mediaMetas
            ?.map((meta) => meta?.uri)
            .filter((uri): uri is string => typeof uri === 'string' && uri.length > 0) ?? [];
        const remoteUris =
          resolvedMessage.images?.filter((uri): uri is string => typeof uri === 'string' && uri.length > 0) ?? [];
        const shouldWarmRemoteMedia =
          previewUris.length > 0 &&
          remoteUris.length > 0 &&
          previewUris.some((uri, index) => uri !== remoteUris[index]);

        if (shouldWarmRemoteMedia) {
          void ExpoImage.prefetch(remoteUris)
            .then(() => {
              releaseTransientMediaPreview(resolvedMessage);
            })
            .catch(() => {
              // Keep local preview when remote prefetch fails to avoid a visible flicker.
            });
        } else if (previewUris.length > 0) {
          releaseTransientMediaPreview(resolvedMessage);
        }
      } else {
        removeLocalPendingMessage(messageId);
      }
      recordTimedMessageMetric('message_send_latency', sendStartedAt, {
        kind: request.kind,
        contactId,
      });
      void refreshMessageQueries();
      return true;
    } catch (error) {
      updateLocalPendingMessageStatus(messageId, 'failed');
      recordMessageMetric('message_send_failed', {
        kind: request.kind,
        contactId,
      });
      const mediaKind = request.kind === 'audio'
        ? 'audio'
        : request.kind === 'image-batch' || request.kind === 'image-single'
          ? 'image'
          : undefined;
      showSnackbar({
        message: resolveSendErrorMessage(error, mediaKind),
        type: 'error',
      });
      return false;
    }
  }, [
    contactId,
    mergeResolvedMessageWithPreview,
    patchConversationPreview,
    queryClient,
    releaseTransientMediaPreview,
    refreshMessageQueries,
    removeLocalPendingMessage,
    resolveSendErrorMessage,
    resolveLocalPendingMessage,
    showSnackbar,
    user?.id,
    updateLocalPendingMessageStatus,
  ]);

  const retryFailedMessage = useCallback((message: ChatMessage) => {
    if (!message.id || message.status !== 'failed') return;
    const request = pendingRequestsRef.current[message.id];
    if (!request) return;
    hapticLight();
    anchorToLatestRef.current = true;
    void executePendingSend(message.id, request);
  }, [executePendingSend]);

  const visibleMessageKeySet = useMemo(() => new Set(hiddenMessageKeys), [hiddenMessageKeys]);

  const displayChatHistory = useMemo(() => {
    const mergedHistory = appendPendingMessagesToHistory(
      mergeChatHistories(olderChatHistory, chatHistory),
      localPendingMessages,
      todayLabel
    );
    const recalledMessageKeySet = new Set<string>();
    mergedHistory.forEach((group) => {
      group.messages.forEach((message) => {
        if (!message.isRecalled) return;
        if (message.id) recalledMessageKeySet.add(`id:${message.id}`);
        if (message.clientKey) recalledMessageKeySet.add(`client:${message.clientKey}`);
      });
    });

    if (visibleMessageKeySet.size === 0) {
      if (recalledMessageKeySet.size === 0) {
        return mergedHistory;
      }
      return mergedHistory.map((group) => ({
        ...group,
        messages: group.messages.map((message) => {
          if (!message.replyTo) return message;
          const replyTo = message.replyTo;
          const replySourceRecalled = Boolean(
            (replyTo.messageId && recalledMessageKeySet.has(`id:${replyTo.messageId}`)) ||
            (replyTo.clientKey && recalledMessageKeySet.has(`client:${replyTo.clientKey}`))
          );
          if (!replySourceRecalled) return message;
          return {
            ...message,
            replyTo: {
              ...replyTo,
              type: 'recalled' as const,
              text: t('replySourceUnavailable'),
              title: undefined,
              thumbnailUri: undefined,
              durationMs: undefined,
            },
          };
        }),
      }));
    }

    return mergedHistory
      .map((group) => ({
        ...group,
        messages: group.messages
          .filter((message) => !visibleMessageKeySet.has(resolveLocalVisibilityKey(message)))
          .map((message) => {
            if (!message.replyTo) return message;
            const replyTo = message.replyTo;
            const replySourceHidden = Boolean(
              (replyTo.messageId && visibleMessageKeySet.has(`id:${replyTo.messageId}`)) ||
              (replyTo.clientKey && visibleMessageKeySet.has(`client:${replyTo.clientKey}`))
            );
            if (replySourceHidden) {
              return {
                ...message,
                replyTo: {
                  ...replyTo,
                  type: 'deleted' as const,
                  text: t('replySourceDeleted'),
                  thumbnailUri: undefined,
                  durationMs: undefined,
                },
              };
            }
            const replySourceRecalled = Boolean(
              (replyTo.messageId && recalledMessageKeySet.has(`id:${replyTo.messageId}`)) ||
              (replyTo.clientKey && recalledMessageKeySet.has(`client:${replyTo.clientKey}`))
            );
            if (!replySourceRecalled) return message;
            return {
              ...message,
              replyTo: {
                ...replyTo,
                type: 'recalled' as const,
                text: t('replySourceUnavailable'),
                title: undefined,
                thumbnailUri: undefined,
                durationMs: undefined,
              },
            };
          }),
      }))
      .filter((group) => group.messages.length > 0);
  }, [chatHistory, localPendingMessages, olderChatHistory, t, todayLabel, visibleMessageKeySet]);

  /* ----- Chat trigger: disable input if the latest effective message is mine ----- */
  const waitingForReplyByHistory = useMemo(() => {
    const latestScopedHistory = appendPendingMessagesToHistory(
      chatHistory,
      localPendingMessages,
      todayLabel
    );
    if (!latestScopedHistory || latestScopedHistory.length === 0) return false;

    const latestMessage = latestScopedHistory
      .flatMap((group) => group.messages ?? [])
      .filter((message) => !message.isRecalled && message.status !== 'sending' && message.status !== 'failed')
      .sort((a, b) => {
        const aTs = Date.parse(a.createdAt ?? '') || 0;
        const bTs = Date.parse(b.createdAt ?? '') || 0;
        return bTs - aTs;
      })[0];

    if (!latestMessage) return false;
    return latestMessage.type === 'sent';
  }, [chatHistory, localPendingMessages, todayLabel]);
  const waitingForReply = canSendReason === 'WAITING_FOR_REPLY'
    ? true
    : canSendState
      ? false
      : waitingForReplyByHistory;
  const hkbuBindingRequired = canSendReason === 'HKBU_BIND_REQUIRED';
  const messageSendBlocked = canSendReason === 'BLOCKED' || canSendReason === 'SELF';
  const isContactTyping = Boolean(
    typingState?.isTyping &&
      typeof typingState?.updatedAt === 'number' &&
      Date.now() - typingState.updatedAt < TYPING_STALE_MS
  );
  const statusText = isContactTyping
    ? t('typing')
    : (presence?.isOnline
      ? t('onlineStatus')
      : t('offlineStatus'));
  const isOnlineStatus = isContactTyping || Boolean(presence?.isOnline);

  useEffect(() => {
    playingAudioMessageIdRef.current = playingAudioMessageId;
  }, [playingAudioMessageId]);

  useEffect(() => {
    if (waitingForReply && isVoiceMode) {
      setIsVoiceMode(false);
    }
  }, [isVoiceMode, waitingForReply]);

  // Ensure playback works on first entry (especially iOS silent mode).
  useEffect(() => {
    void Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      playThroughEarpieceAndroid: false,
    }).catch(() => {
      // Ignore initial audio mode setup failures.
    });
  }, []);

  useEffect(() => {
    if (!typingState?.isTyping || typeof typingState.updatedAt !== 'number') return;
    const elapsed = Date.now() - typingState.updatedAt;
    if (elapsed >= TYPING_STALE_MS) {
      clearTyping(contactId);
      return;
    }
    const timer = setTimeout(() => {
      clearTyping(contactId);
    }, TYPING_STALE_MS - elapsed + 50);
    return () => clearTimeout(timer);
  }, [clearTyping, contactId, typingState?.isTyping, typingState?.updatedAt]);

  /* ----- Build flat list data with date separators ----- */
  const listData = useMemo<ChatListItem[]>(() => {
    const items: ChatListItem[] = [];
    if (displayChatHistory) {
      const histories = [...(Array.isArray(displayChatHistory) ? displayChatHistory : [displayChatHistory])].reverse();
      histories.forEach((h: ChatHistory, gi: number) => {
        let currentGroupTime: ReturnType<typeof resolveMinuteTimeKey> = null;
        const dateKeySeed =
          h.messages
            .map((message) => message.createdAt)
            .find((createdAt) => {
              if (typeof createdAt !== 'string' || createdAt.length === 0) return false;
              const timestamp = Date.parse(createdAt);
              return Number.isFinite(timestamp);
            })
            ?.slice(0, 10) ?? h.date;
        const reversedMessages = [...h.messages].reverse();
        reversedMessages.forEach((m: ChatMessage, mi: number) => {
          const transientMediaMetas = resolveTransientMediaPreview(m);
          const renderMessage =
            transientMediaMetas && transientMediaMetas !== m.mediaMetas
              ? { ...m, mediaMetas: transientMediaMetas }
              : m;
          const messageKey = `msg-${resolveMessageRenderKey(
            renderMessage,
            renderKeyByServerIdRef.current,
            `${gi}-${mi}-${renderMessage.time}`
          )}`;
          const minuteTime = resolveMinuteTimeKey(renderMessage.createdAt, renderMessage.time);
          if (!currentGroupTime && minuteTime) {
            currentGroupTime = minuteTime;
          }
          items.push({ kind: 'message', message: renderMessage, key: messageKey });
          const nextOlderMessage = reversedMessages[mi + 1];
          const isMessageGroupEnd =
            !nextOlderMessage || !shouldMessagesShareGroup(renderMessage, nextOlderMessage);
          if (currentGroupTime && isMessageGroupEnd) {
            items.push({
              kind: 'time',
              timeLabel: currentGroupTime.timeLabel,
              key: `time-${currentGroupTime.minuteKey}-${messageKey}`,
            });
          }
          if (isMessageGroupEnd) {
            currentGroupTime = null;
          }
        });
        if (h.date) {
          items.push({ kind: 'date', date: h.date, key: `date-${h.date}-${dateKeySeed}` });
        }
      });
    }
    return items;
  }, [displayChatHistory, resolveTransientMediaPreview, transientMediaVersion]);
  const messageItemCount = useMemo(
    () => listData.reduce((count, item) => count + (item.kind === 'message' ? 1 : 0), 0),
    [listData]
  );
  const showInitialLoadingState = isLoading && listData.length === 0;

  useEffect(() => {
    olderHistoryLoadingOpacity.value = withTiming(showOlderHistoryLoading ? 1 : 0, {
      duration: showOlderHistoryLoading ? 180 : 120,
    });
    olderHistoryLoadingTranslateY.value = withTiming(showOlderHistoryLoading ? 0 : -6, {
      duration: showOlderHistoryLoading ? 180 : 120,
    });
  }, [olderHistoryLoadingOpacity, olderHistoryLoadingTranslateY, showOlderHistoryLoading]);

  useEffect(() => {
    newMessageHintOpacity.value = withTiming(pendingNewMessageCount > 0 ? 1 : 0, {
      duration: pendingNewMessageCount > 0 ? 180 : 120,
    });
    newMessageHintTranslateY.value = withTiming(pendingNewMessageCount > 0 ? 0 : 8, {
      duration: pendingNewMessageCount > 0 ? 180 : 120,
    });
  }, [newMessageHintOpacity, newMessageHintTranslateY, pendingNewMessageCount]);

  useEffect(() => {
    const visible = Boolean(replyTarget);
    replyComposerOpacity.value = withTiming(visible ? 1 : 0, {
      duration: visible ? 180 : 120,
    });
    replyComposerTranslateY.value = withTiming(visible ? 0 : 8, {
      duration: visible ? 180 : 120,
    });
    if (!visible) {
      replyComposerDragX.value = 0;
      replyComposerDragY.value = 0;
    }
  }, [replyComposerDragX, replyComposerDragY, replyComposerOpacity, replyComposerTranslateY, replyTarget]);

  const olderHistoryLoadingAnimatedStyle = useAnimatedStyle(() => ({
    opacity: olderHistoryLoadingOpacity.value,
    transform: [{ translateY: olderHistoryLoadingTranslateY.value }],
  }));

  const newMessageHintAnimatedStyle = useAnimatedStyle(() => ({
    opacity: newMessageHintOpacity.value,
    transform: [{ translateY: newMessageHintTranslateY.value }],
  }));

  const replyComposerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: replyComposerOpacity.value,
    transform: [
      { translateX: replyComposerDragX.value },
      { translateY: replyComposerTranslateY.value + replyComposerDragY.value },
    ],
  }));

  /* ----- Auto-scroll to bottom when data changes ----- */
  const scrollToLatest = useCallback((force = false) => {
    if (listData.length === 0) return;
    const shouldAutoScroll = force || isNearLatestRef.current || anchorToLatestRef.current;
    if (!shouldAutoScroll) return;
    if (pendingNewMessageCountRef.current > 0) {
      setPendingNewMessageCount(0);
    }
    requestAnimationFrame(() => {
      flatListRef.current?.scrollToOffset({ offset: 0, animated: false });
    });
  }, [listData.length]);

  const clearScrollRetryTimers = useCallback(() => {
    scrollRetryTimersRef.current.forEach((timer) => clearTimeout(timer));
    scrollRetryTimersRef.current = [];
  }, []);

  const forceScrollToLatest = useCallback(() => {
    if (listData.length === 0) return;
    clearScrollRetryTimers();
    const retryDelays = [0, 120, 280, 520];

    retryDelays.forEach((delay) => {
      const timer = setTimeout(() => {
        InteractionManager.runAfterInteractions(() => {
          scrollToLatest(true);
        });
      }, delay);
      scrollRetryTimersRef.current.push(timer);
    });
  }, [clearScrollRetryTimers, listData.length, scrollToLatest]);

  const handleListScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const nearLatest = contentOffset.y <= LATEST_PROXIMITY_PX;
    const distanceToOlderEdge = contentSize.height - (contentOffset.y + layoutMeasurement.height);
    isNearLatestRef.current = nearLatest;
    if (nearLatest) {
      anchorToLatestRef.current = true;
      if (pendingNewMessageCountRef.current > 0) {
        setPendingNewMessageCount(0);
      }
    } else if (hasUserDraggedRef.current) {
      anchorToLatestRef.current = false;
    }
    if (distanceToOlderEdge <= OLDER_HISTORY_PREFETCH_DISTANCE_PX) {
      maybePrefetchOlderHistory();
    }
  }, [maybePrefetchOlderHistory]);

  const handleListScrollBeginDrag = useCallback(() => {
    hasUserDraggedRef.current = true;
    if (hasCompletedInitialLatestPositionRef.current) {
      olderHistoryLoadArmedRef.current = true;
    }
  }, []);

  useEffect(() => {
    isNearLatestRef.current = true;
    anchorToLatestRef.current = true;
    hasUserDraggedRef.current = false;
    lastKnownListLengthRef.current = 0;
    lastKnownMessageCountRef.current = 0;
    isFetchingOlderHistoryRef.current = false;
    isAppendingOlderHistoryRef.current = false;
    hasCompletedInitialLatestPositionRef.current = false;
    olderHistoryLoadArmedRef.current = false;
    setIsInitialLatestPositionReady(false);
    prefetchedOlderHistoryChunkRef.current = null;
    isPrefetchingOlderHistoryRef.current = false;
    if (olderHistoryLoadingTimerRef.current) {
      clearTimeout(olderHistoryLoadingTimerRef.current);
      olderHistoryLoadingTimerRef.current = null;
    }
    shouldForceLatestOnReadyRef.current = true;
    clearScrollRetryTimers();
  }, [clearScrollRetryTimers, contactId]);

  useEffect(() => {
    if (!isScreenFocused || isLoading || listData.length === 0 || !shouldForceLatestOnReadyRef.current) return;
    forceScrollToLatest();
    shouldForceLatestOnReadyRef.current = false;
    hasCompletedInitialLatestPositionRef.current = true;
    setIsInitialLatestPositionReady(true);
    lastKnownListLengthRef.current = listData.length;
    lastKnownMessageCountRef.current = messageItemCount;
  }, [forceScrollToLatest, focusVersion, isLoading, isScreenFocused, listData.length, messageItemCount]);

  useEffect(
    () => () => {
      clearScrollRetryTimers();
      if (olderHistoryLoadingTimerRef.current) {
        clearTimeout(olderHistoryLoadingTimerRef.current);
        olderHistoryLoadingTimerRef.current = null;
      }
    },
    [clearScrollRetryTimers]
  );

  const handleContentSizeChange = useCallback(() => {
    if (listData.length === 0) return;
    const itemDelta = listData.length - lastKnownListLengthRef.current;
    const messageDelta = messageItemCount - lastKnownMessageCountRef.current;
    const hasNewItems = itemDelta > 0;
    const hasNewMessages = messageDelta > 0;
    if (hasNewItems) lastKnownListLengthRef.current = listData.length;
    if (hasNewMessages) lastKnownMessageCountRef.current = messageItemCount;
    if (isAppendingOlderHistoryRef.current) {
      isAppendingOlderHistoryRef.current = false;
      maybePrefetchOlderHistory();
      return;
    }
    if (
      shouldForceLatestOnReadyRef.current ||
      anchorToLatestRef.current ||
      (hasNewMessages && isNearLatestRef.current)
    ) {
      scrollToLatest(true);
      return;
    }
    if (hasNewMessages) {
      setPendingNewMessageCount((current) =>
        Math.min(MAX_NEW_MESSAGE_HINT_COUNT, current + Math.max(1, messageDelta))
      );
    }
  }, [listData.length, maybePrefetchOlderHistory, messageItemCount, scrollToLatest]);

  useEffect(() => {
    listData.forEach((item) => {
      if (item.kind !== 'message') return;
      const images = item.message.images ?? [];
      const mediaMetas = item.message.mediaMetas ?? [];
      const messageIdentity = item.message.clientKey || item.message.id || `message-${item.message.time}`;

      mediaMetas.forEach((meta, index) => {
        const width = Number(meta?.width);
        const height = Number(meta?.height);
        if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return;
        const maxWidth = images.length === 1 ? SINGLE_MEDIA_MAX_WIDTH : GRID_MEDIA_MAX_WIDTH;
        const maxHeight = images.length === 1 ? SINGLE_MEDIA_MAX_HEIGHT : GRID_MEDIA_MAX_HEIGHT;
        const cacheKey = `${messageIdentity}-${index}|${maxWidth}|${maxHeight}`;
        if (chatMediaSizeCache.has(cacheKey)) return;
        if (chatMediaSizeCache.size >= CHAT_MEDIA_SIZE_CACHE_MAX) {
          const oldestKey = chatMediaSizeCache.keys().next().value as string | undefined;
          if (oldestKey) chatMediaSizeCache.delete(oldestKey);
        }
        chatMediaSizeCache.set(cacheKey, getContainedMediaSize(width, height, maxWidth, maxHeight));
      });
    });
  }, [listData]);

  useEffect(() => {
    if (!isScreenFocused || listData.length === 0) return;
    const imageUris = listData
      .filter((item): item is Extract<ChatListItem, { kind: 'message' }> => item.kind === 'message')
      .flatMap((item) => item.message.images ?? [])
      .filter((uri) => typeof uri === 'string' && uri.length > 0);
    if (imageUris.length === 0) return;
    const latestFirstPrefetchTargets = Array.from(new Set(imageUris)).slice(0, 24);
    void ExpoImage.prefetch(latestFirstPrefetchTargets).catch(() => {
      // Ignore prefetch failures to avoid interrupting chat interactions.
    });
  }, [isScreenFocused, listData]);

  /* ----- Handle card press: navigate to detail ----- */
  const handleCardPress = useCallback(
    (card: NonNullable<ChatMessage['functionCard']>) => {
      if (card.type === 'post' && card.postId) {
        navigation.navigate('PostDetail', { postId: card.postId });
        return;
      }
      const screenMap = {
        partner: 'PartnerDetail',
        errand: 'ErrandDetail',
        secondhand: 'SecondhandDetail',
        rating: 'RatingDetail',
      } as const;
      if (card.type !== 'post') {
        const functionId = card.id ?? (card.index != null ? String(card.index) : undefined);
        if (!functionId) return;
        const detailParams =
          card.type === 'rating'
            ? {
                id: functionId,
                ...(card.ratingCategory ? { category: card.ratingCategory } : {}),
                backToChat: {
                  contactId,
                  contactName,
                  contactAvatar,
                },
              }
            : {
                id: functionId,
                backToChat: {
                  contactId,
                  contactName,
                  contactAvatar,
                },
              };
        const parentNavigation = navigation.getParent();
        if (parentNavigation) {
          parentNavigation.navigate('FunctionsTab', {
            screen: screenMap[card.type],
            params: detailParams,
          });
          return;
        }
        navigation.dispatch(
          CommonActions.navigate({
            name: 'FunctionsTab',
            params: {
              screen: screenMap[card.type],
              params: detailParams,
            },
          })
        );
      }
    },
    [navigation, contactId, contactName, contactAvatar]
  );

  const canRecallMessage = useCallback((message?: ChatMessage | null) => {
    if (!message || !message.id || message.type !== 'sent' || message.isRecalled) return false;
    if (isLocalMessageId(message.id) || message.status === 'sending' || message.status === 'failed') {
      return false;
    }
    if (!message.createdAt) return false;
    const sentTs = Date.parse(message.createdAt);
    if (!Number.isFinite(sentTs)) return false;
    return Date.now() - sentTs <= RECALL_WINDOW_MS;
  }, []);

  const doRecallMessage = useCallback(
    (message: ChatMessage) => {
      if (!canRecallMessage(message)) return;
      recallMessageMutation.mutate(message.id!, {
        onSuccess: () => {
          setActionTarget(null);
        },
        onError: () => {
          showSnackbar({ message: t('dataLoadFailed'), type: 'error' });
        },
      });
    },
    [canRecallMessage, recallMessageMutation, showSnackbar, t]
  );

  const hideMessageLocally = useCallback((message: ChatMessage) => {
    const visibilityKey = resolveLocalVisibilityKey(message);
    setHiddenMessageKeys((current) => {
      if (current.includes(visibilityKey)) {
        return current;
      }
      const next = [...current, visibilityKey];
      if (user?.id) {
        void persistHiddenChatMessages(user.id, contactId, next);
      }
      return next;
    });

    if (replyTarget && resolveLocalVisibilityKey(replyTarget) === visibilityKey) {
      setReplyTarget(null);
    }
    if (actionTarget && resolveLocalVisibilityKey(actionTarget) === visibilityKey) {
      setActionTarget(null);
    }
    if (playingAudioMessageId && message.id && playingAudioMessageId === message.id) {
      const sound = audioSoundRef.current;
      if (sound) {
        void sound.unloadAsync().catch(() => {
          // Ignore audio cleanup failures when hiding a local message.
        });
      }
      audioSoundRef.current = null;
      setPlayingAudioMessageId(null);
    }
  }, [actionTarget, contactId, playingAudioMessageId, replyTarget, user?.id]);

  const handleMessageActions = useCallback(
    (message: ChatMessage) => {
      if (message.status === 'sending' || message.status === 'failed') return;
      hapticLight();
      setActionTarget(message);
    },
    []
  );

  const actionCurrentReactionEmoji =
    actionTarget?.reactions?.find((reaction) => reaction.reactedByMe)?.emoji ?? null;
  const actionTargetIsRecalled = Boolean(actionTarget?.isRecalled);

  const handleSendReaction = useCallback(
    (emoji: string) => {
      if (!actionTarget?.id) return;
      const targetMessageId = actionTarget.id;
      const nextEmoji = actionCurrentReactionEmoji === emoji ? '' : emoji;
      setActionTarget(null);
      sendMessageMutation.mutate(
        { payload: { reaction: { messageId: targetMessageId, emoji: nextEmoji } } },
        {
          onError: () => {
            showSnackbar({ message: t('dataLoadFailed'), type: 'error' });
          },
        }
      );
    },
    [actionCurrentReactionEmoji, actionTarget, sendMessageMutation, showSnackbar, t]
  );

  const handlePressReaction = useCallback(
    (message: ChatMessage, emoji: string, reactedByMe: boolean) => {
      if (!message.id) return;
      sendMessageMutation.mutate(
        { payload: { reaction: { messageId: message.id, emoji: reactedByMe ? '' : emoji } } },
        {
          onError: () => {
            showSnackbar({ message: t('dataLoadFailed'), type: 'error' });
          },
        }
      );
    },
    [sendMessageMutation, showSnackbar, t]
  );

  /* ----- Send message ----- */
  const sendTypingState = useCallback(
    (isTyping: boolean) => {
      if (waitingForReply && isTyping) {
        typingSentRef.current = false;
        return;
      }
      if (typingSentRef.current === isTyping) return;
      void messageService
        .sendTyping(contactId, isTyping)
        .then(() => {
          typingSentRef.current = isTyping;
        })
        .catch(() => {
          // Ignore typing failures to avoid disrupting chat flow.
        });
    },
    [contactId, waitingForReply]
  );

  useEffect(() => {
    if (waitingForReply) {
      if (typingStopTimerRef.current) {
        clearTimeout(typingStopTimerRef.current);
        typingStopTimerRef.current = null;
      }
      if (typingSentRef.current) {
        sendTypingState(false);
      }
      return;
    }

    const hasTypingText = inputText.trim().length > 0;
    if (hasTypingText) {
      sendTypingState(true);
      if (typingStopTimerRef.current) {
        clearTimeout(typingStopTimerRef.current);
      }
      typingStopTimerRef.current = setTimeout(() => {
        sendTypingState(false);
      }, TYPING_STOP_DELAY_MS);
    } else {
      if (typingStopTimerRef.current) {
        clearTimeout(typingStopTimerRef.current);
        typingStopTimerRef.current = null;
      }
      sendTypingState(false);
    }
  }, [inputText, sendTypingState, waitingForReply]);

  useEffect(
    () => () => {
      if (typingStopTimerRef.current) {
        clearTimeout(typingStopTimerRef.current);
      }
      if (typingSentRef.current) {
        void messageService.sendTyping(contactId, false).catch(() => {
          // Ignore cleanup failures.
        });
      }
    },
    [contactId]
  );

  useEffect(
    () => () => {
      const sound = audioSoundRef.current;
      if (sound) {
        void sound.unloadAsync();
      }
      audioSoundRef.current = null;
      setPlayingAudioMessageId(null);
    },
    []
  );

  useEffect(
    () => () => {
      const recording = recordingRef.current;
      if (recording) {
        void recording.stopAndUnloadAsync().catch(() => {
          // Ignore recording cleanup failures.
        });
      }
      stopLiveSpeechRecognition(true);
      recordingRef.current = null;
      isRecordingRef.current = false;
    },
    [stopLiveSpeechRecognition]
  );

  const handleSend = useCallback(async () => {
    if (composerSendLockRef.current) return;
    const text = inputText.trim();
    const pendingForwardDraft =
      forwardedCardDraft && pendingForwardPreview?.dedupeKey === forwardedCardDraft.dedupeKey
        ? forwardedCardDraft
        : null;
    if (!text && !pendingForwardDraft) return;
    composerSendLockRef.current = true;
    if (typingStopTimerRef.current) {
      clearTimeout(typingStopTimerRef.current);
      typingStopTimerRef.current = null;
    }
    sendTypingState(false);
    hapticLight();
    anchorToLatestRef.current = true;
    const replyPayload = buildReplyPayload();
    setInputText('');
    setReplyTarget(null);

    try {
      if (pendingForwardDraft) {
        const localCardMessage = buildLocalPendingMessage({
          functionCard: {
            type: pendingForwardDraft.normalizedType,
            ...(pendingForwardDraft.resolvedId ? { id: pendingForwardDraft.resolvedId } : {}),
            title: pendingForwardDraft.cardTitle,
            posterName: pendingForwardDraft.posterName,
            ...(pendingForwardDraft.forwardedPostId ? { postId: pendingForwardDraft.forwardedPostId } : {}),
            ...(pendingForwardDraft.ratingCategory ? { ratingCategory: pendingForwardDraft.ratingCategory } : {}),
          },
          ...(replyPayload ? { replyTo: replyPayload } : {}),
        });
        const cardRequest: PendingSendRequest = {
          kind: 'direct',
          payload: {
            functionCard: {
              type: pendingForwardDraft.normalizedType,
              ...(pendingForwardDraft.resolvedId ? { id: pendingForwardDraft.resolvedId } : {}),
              title: pendingForwardDraft.cardTitle,
              posterName: pendingForwardDraft.posterName,
              ...(pendingForwardDraft.forwardedPostId ? { postId: pendingForwardDraft.forwardedPostId } : {}),
              ...(pendingForwardDraft.ratingCategory ? { ratingCategory: pendingForwardDraft.ratingCategory } : {}),
            },
            ...(replyPayload ? { replyTo: replyPayload } : {}),
          },
        };
        queueLocalPendingMessage(localCardMessage, cardRequest);
        const cardSent = await executePendingSend(localCardMessage.id!, cardRequest);
        if (!cardSent) return;
        setPendingForwardConfirmKey((current) =>
          current === pendingForwardDraft.dedupeKey ? null : current
        );
      }

      if (!text) return;

      const localMessage = buildLocalPendingMessage({
        text,
        ...(replyPayload ? { replyTo: replyPayload } : {}),
      });
      const textRequest: PendingSendRequest = {
        kind: 'direct',
        payload: {
          text,
          ...(replyPayload ? { replyTo: replyPayload } : {}),
        },
      };
      queueLocalPendingMessage(localMessage, textRequest);
      await executePendingSend(localMessage.id!, textRequest);
    } finally {
      composerSendLockRef.current = false;
    }
  }, [
    buildLocalPendingMessage,
    buildReplyPayload,
    executePendingSend,
    forwardedCardDraft,
    inputText,
    pendingForwardPreview?.dedupeKey,
    queueLocalPendingMessage,
    sendForwardedCard,
    sendTypingState,
  ]);

  /* ----- Camera: open device camera ----- */
  const handleCamera = useCallback(async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          t('permissionNeededTitle'),
          t('cameraPermissionMessage'),
          [
            { text: t('cancel'), style: 'cancel' },
            {
              text: t('settings'),
              onPress: () => {
                void Linking.openSettings().catch(() => {});
              },
            },
          ]
        );
        return;
      }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });
    if (!result.canceled && result.assets.length > 0) {
      hapticLight();
      const mediaGroupId = `media-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const files = result.assets.map((asset, index) => ({
        uri: asset.uri,
        type: asset.mimeType || 'image/jpeg',
        name: asset.fileName || `camera-${Date.now()}-${index}.jpg`,
      }));
      const replyPayload = buildReplyPayload();
      const localMessage = buildLocalPendingMessage({
        images: files.map((file) => file.uri),
        mediaMetas: buildLocalMediaMetas(
          result.assets.map((asset, index) => ({
            uri: asset.uri,
            width: asset.width,
            height: asset.height,
            localKey: files[index]?.name,
          }))
        ),
        mediaGroupId,
        ...(replyPayload ? { replyTo: replyPayload } : {}),
      });
      queueLocalPendingMessage(localMessage, {
        kind: 'image-batch',
        files,
        mode: 'plain',
        ...(replyPayload ? { replyTo: replyPayload } : {}),
      });
      anchorToLatestRef.current = true;
      setReplyTarget(null);
      void executePendingSend(localMessage.id!, {
        kind: 'image-batch',
        files,
        mode: 'plain',
        ...(replyPayload ? { replyTo: replyPayload } : {}),
      });
    }
  }, [buildLocalMediaMetas, buildLocalPendingMessage, buildReplyPayload, executePendingSend, queueLocalPendingMessage, t]);

  const clearPendingImageSelection = useCallback(() => {
    if (isSendingSelectedImages) return;
    setPendingImageAssets([]);
    setImageSendModeVisible(false);
  }, [isSendingSelectedImages]);

  const sendSelectedImages = useCallback(async (mode: ImageSendMode) => {
    if (pendingImageAssets.length === 0 || isSendingSelectedImages) return;
    setIsSendingSelectedImages(true);
    anchorToLatestRef.current = true;
    const files = pendingImageAssets.map((asset, index) => ({
      uri: asset.uri,
      type: asset.mimeType || 'image/jpeg',
      name: asset.fileName || `gallery-${Date.now()}-${index}.jpg`,
    }));
    const replyPayload = buildReplyPayload();

    if (mode === 'merged') {
      const mediaGroupId = `media-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const localMessage = buildLocalPendingMessage({
        images: files.map((file) => file.uri),
        mediaMetas: buildLocalMediaMetas(
          pendingImageAssets.map((asset, index) => ({
            uri: asset.uri,
            width: asset.width,
            height: asset.height,
            localKey: files[index]?.name,
          }))
        ),
        mediaGroupId,
        imageAlbum: { count: files.length },
        ...(replyPayload ? { replyTo: replyPayload } : {}),
      });
      const request: PendingSendRequest = {
        kind: 'image-batch',
        files,
        mode: 'album',
        ...(replyPayload ? { replyTo: replyPayload } : {}),
      };
      queueLocalPendingMessage(localMessage, request);
      void executePendingSend(localMessage.id!, request);
    } else {
      files.forEach((file, index) => {
        const localMessage = buildLocalPendingMessage({
          images: [file.uri],
          mediaMetas: buildLocalMediaMetas([
            {
              uri: pendingImageAssets[index]?.uri ?? file.uri,
              width: pendingImageAssets[index]?.width,
              height: pendingImageAssets[index]?.height,
              localKey: file.name,
            },
          ]),
          mediaGroupId: `media-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 6)}`,
          ...(index === 0 && replyPayload ? { replyTo: replyPayload } : {}),
        });
        const request: PendingSendRequest = {
          kind: 'image-single',
          file,
          ...(index === 0 && replyPayload ? { replyTo: replyPayload } : {}),
        };
        queueLocalPendingMessage(localMessage, request);
        void executePendingSend(localMessage.id!, request);
      });
    }

    setReplyTarget(null);
    setPendingImageAssets([]);
    setImageSendModeVisible(false);
    setIsSendingSelectedImages(false);
  }, [
    buildLocalMediaMetas,
    buildLocalPendingMessage,
    buildReplyPayload,
    executePendingSend,
    isSendingSelectedImages,
    pendingImageAssets,
    queueLocalPendingMessage,
  ]);

  /* ----- Image: open photo library ----- */
  const handlePickImage = useCallback(async () => {
    const { status } =
      await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        t('permissionNeededTitle'),
        t('photoPermissionMessage'),
        [
          { text: t('cancel'), style: 'cancel' },
          {
            text: t('settings'),
            onPress: () => {
              void Linking.openSettings().catch(() => {});
            },
          },
        ]
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: 9,
      quality: 0.8,
    });
    if (!result.canceled && result.assets.length > 0) {
      hapticLight();
      setPendingImageAssets(result.assets.slice(0, 9));
      setImageSendModeVisible(true);
    }
  }, [t]);

  const startRecordingSession = useCallback(async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          t('permissionNeededTitle'),
          t('microphonePermissionMessage')
        );
        return false;
      }
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
      const recording = new Audio.Recording();
      const fallbackRecordingOptions: RecordingOptionsInput = {
        android: {
          extension: '.m4a',
          outputFormat: 4,
          audioEncoder: 3,
          sampleRate: 44100,
          numberOfChannels: 2,
          bitRate: 128000,
        },
        ios: {
          extension: '.m4a',
          audioQuality: 127,
          sampleRate: 44100,
          numberOfChannels: 2,
          bitRate: 128000,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
        web: {},
      };
      await recording.prepareToRecordAsync(
        Audio.RecordingOptionsPresets
          ? Audio.RecordingOptionsPresets.HIGH_QUALITY
          : fallbackRecordingOptions
      );
      await recording.startAsync();
      recordingRef.current = recording;
      isRecordingRef.current = true;
      recordingStartTimeRef.current = Date.now();
      clearLiveTranscription();
      setIsRecording(true);
      setVoiceReleaseAction('send');
      setRecordingDurationMs(0);
      hapticLight();
      void startLiveSpeechRecognition();

      recordingDurationIntervalRef.current = setInterval(() => {
        const elapsed = Date.now() - recordingStartTimeRef.current;
        setRecordingDurationMs(elapsed);

        // Auto-stop when max recording duration is reached.
        if (elapsed >= MAX_RECORD_DURATION_MS) {
          if (recordingDurationIntervalRef.current) {
            clearInterval(recordingDurationIntervalRef.current);
            recordingDurationIntervalRef.current = null;
          }
          pendingReleaseActionRef.current = 'send';
          setVoiceReleaseAction('send');
          void handleHoldToTalkReleaseRef.current?.();
        }
      }, 100);

      return true;
    } catch {
      stopLiveSpeechRecognition(true);
      Alert.alert(
        t('errorTitle'),
        t('recordingStartFailed')
      );
      return false;
    }
  }, [clearLiveTranscription, setVoiceReleaseAction, startLiveSpeechRecognition, stopLiveSpeechRecognition, t]);

  const stopRecordingSession = useCallback(async () => {
    let recordedUri: string | null = null;
    let durationMs: number | undefined;
    const fallbackDurationMs =
      recordingStartTimeRef.current > 0
        ? Math.max(0, Date.now() - recordingStartTimeRef.current)
        : 0;

    if (recordingDurationIntervalRef.current) {
      clearInterval(recordingDurationIntervalRef.current);
      recordingDurationIntervalRef.current = null;
    }

    try {
      if (recordingRef.current) {
        const status = await recordingRef.current.getStatusAsync();
        if (typeof status.durationMillis === 'number') {
          durationMs = status.durationMillis;
        }
        await recordingRef.current.stopAndUnloadAsync();
        recordedUri = recordingRef.current.getURI();
      }
    } catch {
      // Ignore stop failures.
    } finally {
      recordingRef.current = null;
      isRecordingRef.current = false;
      setIsRecording(false);
      setRecordingDurationMs(0);
      recordingStartTimeRef.current = 0;
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: true,
        });
      } catch {
        // Ignore audio mode reset failures.
      }
    }
    if (!recordedUri) return null;
    const normalizedDurationMs = Math.max(durationMs ?? 0, fallbackDurationMs);
    return { uri: recordedUri, durationMs: normalizedDurationMs };
  }, []);

  const sendRecordedAudio = useCallback(async (uri: string, durationMs?: number) => {
    const uploadMeta = getAudioUploadMetaFromUri(uri);
    const replyPayload = buildReplyPayload();
    const localMessage = buildLocalPendingMessage({
      audio: { url: uri, ...(typeof durationMs === 'number' ? { durationMs } : {}) },
      ...(replyPayload ? { replyTo: replyPayload } : {}),
    });
    const request: PendingSendRequest = {
      kind: 'audio',
      file: {
        uri,
        type: uploadMeta.type,
        name: uploadMeta.name,
      },
      ...(typeof durationMs === 'number' ? { durationMs } : {}),
      ...(replyPayload ? { replyTo: replyPayload } : {}),
    };
    queueLocalPendingMessage(localMessage, request);
    setReplyTarget(null);
    await executePendingSend(localMessage.id!, request);
  }, [buildLocalPendingMessage, buildReplyPayload, executePendingSend, queueLocalPendingMessage]);

  const transcribeRecordedAudioToText = useCallback(async (uri: string, durationMs: number) => {
    setIsTranscribingVoice(true);
    try {
      const recognizedText = await transcribeAudioFileWithNativeSpeech({
        uri,
        languageHint: i18n.language,
        timeoutMs: Math.max(6000, Math.min(18000, durationMs + 4000)),
      });
      const normalizedText = recognizedText.trim();
      if (normalizedText.length > 0) {
        setInputText((prev) => (prev.trim().length > 0 ? `${prev} ${normalizedText}` : normalizedText));
        setIsVoiceMode(false);
      } else {
        showSnackbar({ message: t('voiceTranscribeFailed'), type: 'error' });
      }
    } catch {
      showSnackbar({ message: t('voiceTranscribeFailed'), type: 'error' });
    } finally {
      setIsTranscribingVoice(false);
    }
  }, [i18n.language, showSnackbar, t]);

  const handleToggleVoiceMode = useCallback(() => {
    if (isRecordingRef.current) return;
    setIsVoiceMode((prev) => !prev);
  }, []);

  const handleHoldToTalkPressIn = useCallback(async () => {
    if (waitingForReply || isTranscribingVoice) return;
    await startRecordingSession();
  }, [isTranscribingVoice, startRecordingSession, waitingForReply]);

  const handleHoldToTalkMove = useCallback((event: GestureResponderEvent) => {
    if (!isRecordingRef.current) return;
    recordingOverlayRef.current?.handleTouchMove(
      event.nativeEvent.pageX,
      event.nativeEvent.pageY
    );
  }, []);

  const handleHoldToTalkRelease = useCallback(async () => {
    if (!isRecordingRef.current) return;
    const result = await stopRecordingSession();
    const releaseAction = pendingReleaseActionRef.current ?? voiceReleaseActionRef.current;
    pendingReleaseActionRef.current = null;
    setVoiceReleaseAction('send');
    if (!result) return;
    const effectiveDurationMs = Math.min(MAX_RECORD_DURATION_MS, result.durationMs ?? 0);

    if (releaseAction === 'cancel') {
      stopLiveSpeechRecognition(true);
      clearLiveTranscription();
      return;
    }

    if (effectiveDurationMs < MIN_RECORD_DURATION_MS) {
      stopLiveSpeechRecognition(true);
      clearLiveTranscription();
      showSnackbar({ message: t('voiceTooShort'), type: 'error' });
      return;
    }

    if (releaseAction === 'transcribe') {
      stopLiveSpeechRecognition(false);
      await new Promise((resolve) => setTimeout(resolve, 180));
      const realtimeTranscript = (
        liveTranscriptionFinalRef.current || liveTranscriptionTextRef.current
      ).trim();
      if (realtimeTranscript) {
        setInputText((prev) =>
          prev.trim().length > 0 ? `${prev} ${realtimeTranscript}` : realtimeTranscript
        );
        clearLiveTranscription();
        setIsVoiceMode(false);
        return;
      }
      await transcribeRecordedAudioToText(result.uri, effectiveDurationMs);
      clearLiveTranscription();
      return;
    }

    stopLiveSpeechRecognition(true);
    clearLiveTranscription();
    await sendRecordedAudio(result.uri, effectiveDurationMs);
  }, [clearLiveTranscription, sendRecordedAudio, setVoiceReleaseAction, showSnackbar, stopLiveSpeechRecognition, stopRecordingSession, t, transcribeRecordedAudioToText]);

  useEffect(() => {
    handleHoldToTalkReleaseRef.current = handleHoldToTalkRelease;
  }, [handleHoldToTalkRelease]);

  const handlePlayAudio = useCallback(async (message: ChatMessage) => {
    if (!message.audio?.url) return;
    const resolvedAudioUrl = normalizeMediaUrl(message.audio.url) ?? message.audio.url;
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        playThroughEarpieceAndroid: false,
      });

      if (audioSoundRef.current) {
        await audioSoundRef.current.unloadAsync();
        audioSoundRef.current = null;
      }

      const currentPlayingId = playingAudioMessageIdRef.current;
      if (currentPlayingId && message.id && currentPlayingId === message.id) {
        setPlayingAudioMessageId(null);
        return;
      }

      const { sound } = await Audio.Sound.createAsync(
        { uri: resolvedAudioUrl },
        { shouldPlay: true }
      );
      audioSoundRef.current = sound;
      setPlayingAudioMessageId(message.id ?? null);
      sound.setOnPlaybackStatusUpdate((status) => {
        if (!status.isLoaded) return;
        if (status.didJustFinish) {
          setPlayingAudioMessageId(null);
          void sound.unloadAsync();
          if (audioSoundRef.current === sound) {
            audioSoundRef.current = null;
          }
        }
      });
    } catch {
      showSnackbar({ message: t('dataLoadFailed'), type: 'error' });
      setPlayingAudioMessageId(null);
    }
  }, [showSnackbar, t]);

  const handleOpenImagePreview = useCallback((images: string[], index: number) => {
    setPreviewImages(images);
    setPreviewIndex(index);
    setPreviewVisible(true);
  }, []);

  const handlePressNewMessageHint = useCallback(() => {
    anchorToLatestRef.current = true;
    scrollToLatest(true);
  }, [scrollToLatest]);

  const beginReplyingToMessage = useCallback((message: ChatMessage) => {
    anchorToLatestRef.current = true;
    setActionTarget(null);
    setReplyTarget(message);
  }, []);

  const handleSwipeReply = useCallback((message: ChatMessage) => {
    beginReplyingToMessage(message);
  }, [beginReplyingToMessage]);

  const clearReplyComposerGesture = useCallback(() => {
    setReplyTarget(null);
  }, []);

  const replyComposerGesture = useMemo(
    () =>
      Gesture.Pan()
        .enabled(Boolean(replyTarget))
        .activeOffsetX([18, 999])
        .activeOffsetY([18, 999])
        .failOffsetX([-18, 999])
        .onUpdate((event) => {
          replyComposerDragX.value = Math.max(0, Math.min(event.translationX, 72));
          replyComposerDragY.value = Math.max(0, Math.min(event.translationY, 42));
        })
        .onEnd((event) => {
          const shouldDismiss = event.translationX >= 52 || event.translationY >= 28;
          if (shouldDismiss) {
            replyComposerDragX.value = withTiming(0, { duration: 120 });
            replyComposerDragY.value = withTiming(0, { duration: 120 });
            runOnJS(clearReplyComposerGesture)();
            return;
          }
          replyComposerDragX.value = withTiming(0, { duration: 180 });
          replyComposerDragY.value = withTiming(0, { duration: 180 });
        })
        .onFinalize(() => {
          replyComposerDragX.value = withTiming(0, { duration: 180 });
          replyComposerDragY.value = withTiming(0, { duration: 180 });
        }),
    [clearReplyComposerGesture, replyComposerDragX, replyComposerDragY, replyTarget]
  );

  useEffect(() => {
    if (!replyTarget || waitingForReply) return;

    if (isVoiceMode) {
      setIsVoiceMode(false);
    }
    anchorToLatestRef.current = true;
    scrollToLatest(true);

    const focusTask = InteractionManager.runAfterInteractions(() => {
      requestAnimationFrame(() => {
        textInputRef.current?.focus();
      });
    });

    return () => {
      focusTask.cancel?.();
    };
  }, [isVoiceMode, replyTarget, scrollToLatest, waitingForReply]);

  /* ----- Render list item ----- */
  const renderItem = useCallback(
    ({ item }: { item: ChatListItem }) => {
      if (item.kind === 'date') {
        return (
          <View style={styles.invertedListItem}>
            <DateSeparator date={item.date} />
          </View>
        );
      }
      if (item.kind === 'time') {
        return (
          <View style={[styles.invertedListItem, styles.chatListItem]}>
            <View style={styles.minuteTimeWrap}>
              <Text style={styles.minuteTimeText}>{item.timeLabel}</Text>
            </View>
          </View>
        );
      }
      return (
        <View style={[styles.invertedListItem, styles.chatListItem]}>
          <ChatBubble
            message={item.message}
            myAvatarText={myAvatarText}
            myAvatarUri={myAvatarUri}
            theirAvatarText={theirAvatarText}
            theirAvatarUri={theirAvatarUri}
            onCardPress={handleCardPress}
            onLongPressMessage={handleMessageActions}
            onSwipeReply={handleSwipeReply}
            onPlayAudio={handlePlayAudio}
            onImagePress={handleOpenImagePreview}
            onPressReaction={handlePressReaction}
            onRetryFailedMessage={retryFailedMessage}
            isAudioPlaying={Boolean(item.message.id && playingAudioMessageId === item.message.id)}
            t={t}
          />
        </View>
      );
    },
    [
      myAvatarText,
      myAvatarUri,
      theirAvatarText,
      theirAvatarUri,
      handleCardPress,
      handleMessageActions,
      handleSwipeReply,
      handlePlayAudio,
      handleOpenImagePreview,
      handlePressReaction,
      playingAudioMessageId,
      retryFailedMessage,
      t,
    ]
  );

  const actionCanRecall = canRecallMessage(actionTarget);
  const canSubmitComposer = hasText || Boolean(pendingForwardPreview);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={handleBack}
          style={styles.iconBtn}
        >
          <BackIcon size={24} color={colors.onSurface} />
        </TouchableOpacity>
        <View style={styles.topBarTitleWrap}>
          <Text style={styles.topBarTitle} numberOfLines={1}>
            {contactName}
          </Text>
          <View style={styles.topBarStatusRow}>
            <Text style={[styles.topBarSubtitle, isContactTyping ? styles.topBarSubtitleTyping : undefined]}>
              {statusText}
            </Text>
            <View
              style={[
                styles.topBarStatusDot,
                isOnlineStatus ? styles.topBarStatusDotOnline : styles.topBarStatusDotOffline,
              ]}
            />
          </View>
        </View>
        <View style={styles.iconBtn} />
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <FlashList
          ref={flatListRef}
          data={listData}
          style={styles.invertedList}
          renderItem={renderItem}
          keyExtractor={(item) => item.key}
          contentContainerStyle={styles.listContent}
          onContentSizeChange={handleContentSizeChange}
          onScroll={handleListScroll}
          onScrollBeginDrag={handleListScrollBeginDrag}
          onEndReached={() => {
            void loadOlderHistory();
          }}
          onEndReachedThreshold={0.03}
          scrollEventThrottle={16}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          drawDistance={CHAT_LIST_DRAW_DISTANCE}
          removeClippedSubviews={Platform.OS === 'android'}
          getItemType={(item) => item.kind}
          ListEmptyComponent={
            showInitialLoadingState ? (
              <View style={[styles.invertedListItem, styles.loadingContainer]}>
                <View style={styles.loadingInline}>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text style={styles.loadingText}>{t('loading')}</Text>
                </View>
              </View>
            ) : null
          }
        />
        {showOlderHistoryLoading ? (
          <Animated.View
            pointerEvents="none"
            style={[styles.loadingOlderOverlay, olderHistoryLoadingAnimatedStyle]}
          >
            <View style={styles.loadingOlderChip}>
              <ActivityIndicator size="small" color={colors.onSurfaceVariant} />
              <Text style={styles.loadingOlderText}>{t('loading')}</Text>
            </View>
          </Animated.View>
        ) : null}

        {pendingNewMessageCount > 0 ? (
          <Animated.View
            style={[
              styles.newMessageHintWrap,
              { bottom: composerBottomInset + 72 },
              newMessageHintAnimatedStyle,
            ]}
          >
            <TouchableOpacity
              style={styles.newMessageHintButton}
              activeOpacity={0.88}
              onPress={handlePressNewMessageHint}
            >
              <Text style={styles.newMessageHintArrow}>{'\u2193'}</Text>
              <Text style={styles.newMessageHintCount}>
                {pendingNewMessageCount > MAX_NEW_MESSAGE_HINT_COUNT
                  ? `${MAX_NEW_MESSAGE_HINT_COUNT}+`
                  : pendingNewMessageCount}
              </Text>
            </TouchableOpacity>
          </Animated.View>
        ) : null}

        {/* Input Bar */}
        {hkbuBindingRequired ? (
          <View style={styles.noticeBar}>
            <Text style={styles.waitingText}>{t('messageEmailBindingRequired')}</Text>
            <TouchableOpacity style={styles.noticeButton} onPress={handleOpenManageEmails}>
              <Text style={styles.noticeButtonText}>{t('bindNow')}</Text>
            </TouchableOpacity>
          </View>
        ) : waitingForReply ? (
          <View style={styles.waitingBar}>
            <Text style={styles.waitingText}>{t('waitingForReply')}</Text>
          </View>
        ) : messageSendBlocked ? (
          <View style={styles.waitingBar}>
            <Text style={styles.waitingText}>{t('cannotMessageUser')}</Text>
          </View>
        ) : (
          <View>
            {replyTarget ? (
              <GestureDetector gesture={replyComposerGesture}>
                <Animated.View style={[styles.replyComposer, replyComposerAnimatedStyle]}>
                  <View style={styles.replyComposerTextWrap}>
                    <Text style={styles.replyComposerLabel}>
                      {`${t('replyAction')} ${activeReplyPayload?.fromName || (activeReplyPayload?.from === 'me' ? myAvatarText : theirAvatarText)}`}
                    </Text>
                    <Text numberOfLines={1} style={styles.replyComposerText}>
                      {activeReplyPayload ? formatReplyReferenceText(activeReplyPayload, t) : buildReplyPreview(replyTarget)}
                    </Text>
                  </View>
                  {activeReplyPayload ? <ReplyReferenceAccessory replyTo={activeReplyPayload} /> : null}
                  <TouchableOpacity
                    style={styles.replyComposerClose}
                    onPress={() => setReplyTarget(null)}
                    activeOpacity={0.7}
                  >
                    <CloseIcon size={18} color={colors.onSurfaceVariant} />
                  </TouchableOpacity>
                </Animated.View>
              </GestureDetector>
            ) : null}
            {pendingForwardPreview ? (
              <View style={styles.pendingForwardComposer}>
                <View style={styles.pendingForwardCard}>
                  <View style={styles.pendingForwardCardTopRow}>
                    <View style={styles.pendingForwardIconCircle}>
                      {(() => {
                        const IconComp = TYPE_ICONS[pendingForwardPreview.type];
                        return <IconComp size={16} color={CARD_THEME.iconColor} />;
                      })()}
                    </View>
                    <Text style={styles.pendingForwardLabel}>{pendingForwardPreview.typeLabel}</Text>
                    <TouchableOpacity
                      style={styles.replyComposerClose}
                      onPress={() => setPendingForwardConfirmKey(null)}
                      activeOpacity={0.7}
                    >
                      <CloseIcon size={18} color={colors.onSurfaceVariant} />
                    </TouchableOpacity>
                  </View>
                  <Text numberOfLines={2} style={styles.pendingForwardText}>
                    {pendingForwardPreview.title}
                  </Text>
                </View>
              </View>
            ) : null}
          <View style={[styles.inputBar, { paddingBottom: composerBottomInset }]}>
            {isVoiceMode ? (
              <>
                <TouchableOpacity
                  style={[styles.mediaBtn, styles.voiceModeBtn]}
                  activeOpacity={0.7}
                  onPress={handleToggleVoiceMode}
                >
                  <KeyboardIcon size={22} color={PURE_BLACK} />
                </TouchableOpacity>
                <VoiceButton
                  state={isRecording ? 'recording' : 'idle'}
                  onPressIn={handleHoldToTalkPressIn}
                  onPressOut={handleHoldToTalkRelease}
                  onTouchMove={handleHoldToTalkMove}
                  disabled={waitingForReply || isTranscribingVoice}
                  showIcon={false}
                />
                <TouchableOpacity
                  style={styles.mediaBtn}
                  activeOpacity={0.6}
                  onPress={handlePickImage}
                >
                  <ImageIcon size={22} color={PURE_BLACK} />
                </TouchableOpacity>
              </>
            ) : (
              <>
                {!hasText && (
                  <TouchableOpacity
                    style={styles.mediaBtn}
                    activeOpacity={0.6}
                    onPress={handleCamera}
                  >
                    <CameraIcon size={22} color={PURE_BLACK} />
                  </TouchableOpacity>
                )}

                <View style={[styles.textInputShell, { height: chatInputHeight }]}>
                  <TextInput
                    ref={textInputRef}
                    style={styles.textInput}
                    placeholder={t('inputMessage')}
                    placeholderTextColor={PURE_BLACK}
                    value={inputText}
                    onChangeText={handleChatInputTextChange}
                    onContentSizeChange={handleChatInputContentSizeChange}
                    multiline
                    scrollEnabled={isChatInputScrollEnabled}
                    textAlignVertical="top"
                  />
                </View>

                {canSubmitComposer ? (
                  <TouchableOpacity
                    style={styles.sendBtn}
                    onPress={handleSend}
                    activeOpacity={0.7}
                  >
                    <SendIcon size={20} color="#FFFFFF" />
                  </TouchableOpacity>
                ) : (
                  <>
                    <TouchableOpacity
                      style={styles.mediaBtn}
                      activeOpacity={0.6}
                      onPress={handleToggleVoiceMode}
                    >
                      <MicIcon size={22} color={PURE_BLACK} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.mediaBtn}
                      activeOpacity={0.6}
                      onPress={handlePickImage}
                    >
                      <ImageIcon size={22} color={PURE_BLACK} />
                    </TouchableOpacity>
                  </>
                )}
              </>
            )}
          </View>
          </View>
        )}
      </KeyboardAvoidingView>

      <RecordingOverlay
        ref={recordingOverlayRef}
        visible={isRecording}
        currentAction={voiceReleaseAction}
        onActionChange={setVoiceReleaseAction}
        durationMs={recordingDurationMs}
        transcriptText={liveTranscriptionText}
        onRelease={(action) => {
          pendingReleaseActionRef.current = action;
          void handleHoldToTalkReleaseRef.current?.();
        }}
      />

      <ImagePreviewModal
        visible={previewVisible}
        images={previewImages}
        initialIndex={previewIndex}
        onClose={() => setPreviewVisible(false)}
      />

      <Modal
        visible={imageSendModeVisible}
        transparent
        animationType="fade"
        onRequestClose={clearPendingImageSelection}
      >
        <Pressable
          style={styles.imageSendModeOverlay}
          onPress={clearPendingImageSelection}
        >
          <Pressable style={styles.imageSendModeSheet} onPress={() => {}}>
            <Text style={styles.imageSendModeTitle}>
              {t('imageSendModeTitle', { count: pendingImageAssets.length })}
            </Text>
            <TouchableOpacity
              style={[
                styles.imageSendModeOption,
                isSendingSelectedImages ? styles.imageSendModeOptionDisabled : undefined,
              ]}
              activeOpacity={0.7}
              disabled={isSendingSelectedImages}
              onPress={() => {
                void sendSelectedImages('separate');
              }}
            >
              <Text style={styles.imageSendModeOptionText}>{t('sendImagesSeparately')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.imageSendModeOption,
                isSendingSelectedImages ? styles.imageSendModeOptionDisabled : undefined,
              ]}
              activeOpacity={0.7}
              disabled={isSendingSelectedImages}
              onPress={() => {
                void sendSelectedImages('merged');
              }}
            >
              <Text style={styles.imageSendModeOptionText}>{t('sendImagesMerged')}</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={!!actionTarget}
        transparent
        animationType="fade"
        onRequestClose={() => setActionTarget(null)}
      >
        <Pressable
          style={styles.actionOverlay}
          onPress={() => setActionTarget(null)}
        >
          <Pressable style={styles.actionSheet} onPress={() => {}}>
            {!actionTargetIsRecalled ? (
              <>
                <View style={styles.actionEmojiRow}>
                  {REACTION_OPTIONS.map((emoji) => (
                    <TouchableOpacity
                      key={emoji}
                      style={[
                        styles.actionEmojiBtn,
                        actionCurrentReactionEmoji === emoji ? styles.actionEmojiBtnActive : undefined,
                      ]}
                      activeOpacity={0.7}
                      onPress={() => handleSendReaction(emoji)}
                    >
                      <Text style={styles.actionEmojiText}>{emoji}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <View style={styles.actionDivider} />
              </>
            ) : null}

            {!actionTargetIsRecalled ? (
                <TouchableOpacity
                  style={styles.actionItem}
                  activeOpacity={0.7}
                  onPress={() => {
                    if (actionTarget) beginReplyingToMessage(actionTarget);
                  }}
                >
                  <Text style={styles.actionText}>
                    {t('replyAction')}
                  </Text>
                </TouchableOpacity>
            ) : null}

            {!actionTargetIsRecalled && actionCanRecall ? (
              <>
                <View style={styles.actionDivider} />
                <TouchableOpacity
                  style={styles.actionItem}
                  activeOpacity={0.7}
                  onPress={() => {
                    if (!actionTarget) return;
                    const targetMessage = actionTarget;
                    setActionTarget(null);
                    Alert.alert(
                      t('recallMessage'),
                      t('recallMessageConfirm'),
                      [
                        { text: t('cancel'), style: 'cancel' },
                        {
                          text: t('confirmBtn'),
                          style: 'destructive',
                          onPress: () => doRecallMessage(targetMessage),
                        },
                      ]
                    );
                  }}
                >
                  <Text style={[styles.actionText, styles.actionTextDanger]}>
                    {t('recallMessage')}
                  </Text>
                </TouchableOpacity>
              </>
            ) : null}

            <View style={styles.actionDivider} />

            <TouchableOpacity
              style={styles.actionItem}
              activeOpacity={0.7}
              onPress={() => {
                if (!actionTarget) return;
                const targetMessage = actionTarget;
                setActionTarget(null);
                Alert.alert(
                  t('deleteLocalMessageTitle'),
                  t('deleteLocalMessageConfirm'),
                  [
                    { text: t('cancel'), style: 'cancel' },
                    {
                      text: t('deleteLocalMessageAction'),
                      style: 'destructive',
                      onPress: () => hideMessageLocally(targetMessage),
                    },
                  ]
                );
              }}
            >
              <Text style={[styles.actionText, styles.actionTextDanger]}>
                {t('deleteLocalMessageAction')}
              </Text>
            </TouchableOpacity>

            <View style={styles.actionDivider} />

            <TouchableOpacity
              style={styles.actionItem}
              activeOpacity={0.7}
              onPress={() => setActionTarget(null)}
            >
              <Text style={[styles.actionText, styles.actionTextMuted]}>
                {t('cancel')}
              </Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topBar: {
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
  topBarTitleWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarTitle: {
    ...typography.titleMedium,
    color: colors.onSurface,
  },
  topBarSubtitle: {
    ...typography.bodySmall,
    color: colors.onSurfaceVariant,
  },
  topBarStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    gap: 6,
  },
  topBarStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  topBarStatusDotOnline: {
    backgroundColor: colors.success,
  },
  topBarStatusDotOffline: {
    backgroundColor: colors.onSurfaceVariant,
  },
  topBarSubtitleTyping: {
    color: colors.primary,
  },
  keyboardView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  loadingText: {
    ...typography.bodyMedium,
    color: colors.onSurfaceVariant,
  },
  loadingOlderOverlay: {
    position: 'absolute',
    top: spacing.sm,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingOlderChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  loadingOlderText: {
    ...typography.bodySmall,
    color: colors.onSurfaceVariant,
  },
  newMessageHintWrap: {
    position: 'absolute',
    right: spacing.lg,
    alignItems: 'flex-end',
  },
  newMessageHintButton: {
    minWidth: 44,
    height: 44,
    paddingHorizontal: spacing.sm,
    borderRadius: 22,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.outlineVariant,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  newMessageHintArrow: {
    ...typography.bodyMedium,
    color: colors.onSurface,
    fontWeight: '700',
    lineHeight: 18,
  },
  newMessageHintCount: {
    ...typography.labelMedium,
    color: colors.onSurface,
    fontWeight: '700',
  },
  listContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
  },
  invertedList: {
    transform: [{ scaleY: -1 }],
  },
  invertedListItem: {
    transform: [{ scaleY: -1 }],
  },
  chatListItem: {
    marginBottom: CHAT_ITEM_VERTICAL_SPACING,
  },
  minuteTimeWrap: {
    alignSelf: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(60,60,67,0.08)',
  },
  minuteTimeText: {
    ...typography.labelSmall,
    color: colors.onSurfaceVariant,
    fontWeight: '600',
  },

  /* ----- Date separator ----- */
  dateSeparator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.md,
    gap: spacing.sm,
  },
  dateLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.outlineVariant,
  },
  dateText: {
    ...typography.labelSmall,
    color: colors.onSurfaceVariant,
    paddingHorizontal: spacing.sm,
  },
  recalledNoticeRow: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 0,
  },
  recalledNoticeText: {
    ...typography.bodySmall,
    color: colors.onSurfaceVariant,
    backgroundColor: colors.surface2,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
  },

  /* ----- Bubble row (avatar + bubble) ----- */
  bubbleRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 0,
    maxWidth: '85%',
  },
  bubbleRowRight: {
    alignSelf: 'flex-end',
  },
  bubbleRowLeft: {
    alignSelf: 'flex-start',
  },
  avatarWrap: {
    marginBottom: 14,
  },
  bubbleCol: {
    position: 'relative',
    flexShrink: 1,
    marginHorizontal: spacing.sm,
  },
  replySwipeHintWrap: {
    position: 'absolute',
    top: 10,
    width: 24,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  replySwipeHintWrapLeft: {
    left: -20,
  },
  replySwipeHintWrapRight: {
    left: -20,
  },
  replySwipeHint: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  replySwipeHintText: {
    ...typography.bodySmall,
    color: colors.onSurfaceVariant,
    fontWeight: '700',
    lineHeight: 16,
  },
  bubbleBodyWrap: {
    position: 'relative',
    alignSelf: 'flex-start',
  },
  bubbleFooterRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  bubbleMetaRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minHeight: 16,
  },
  bubble: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
  },
  mediaBubble: {
    gap: spacing.xs,
    alignItems: 'flex-start',
  },
  messageContentStack: {
    gap: spacing.xs,
    alignSelf: 'flex-start',
    minWidth: 0,
    maxWidth: '100%',
  },
  messageContentStackMine: {
    alignItems: 'flex-end',
  },
  messageContentStackTheirs: {
    alignItems: 'flex-start',
  },
  albumBubble: {
    width: SINGLE_MEDIA_MAX_WIDTH,
    minHeight: 88,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  albumBubbleMine: {
    backgroundColor: '#D9FDD3',
  },
  albumBubbleTheirs: {
    backgroundColor: colors.surface2,
  },
  albumCoverImage: {
    width: 88,
    height: 88,
  },
  albumBubbleContent: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    justifyContent: 'center',
    gap: spacing.xxs,
  },
  albumBubbleTitle: {
    ...typography.titleSmall,
    fontWeight: '700',
  },
  albumBubbleTitleMine: {
    color: colors.onSurface,
  },
  albumBubbleTitleTheirs: {
    color: colors.onSurface,
  },
  albumBubbleMeta: {
    ...typography.bodySmall,
  },
  albumBubbleMetaMine: {
    color: colors.onSurfaceVariant,
  },
  albumBubbleMetaTheirs: {
    color: colors.onSurfaceVariant,
  },
  mediaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    maxWidth: SINGLE_MEDIA_MAX_WIDTH,
  },
  mediaPressTarget: {
    alignSelf: 'flex-start',
  },
  mediaImage: {
    borderRadius: borderRadius.md,
  },
  bubbleMine: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: borderRadius.xs,
  },
  bubbleTheirs: {
    backgroundColor: colors.surface2,
    borderBottomLeftRadius: borderRadius.xs,
  },
  bubbleText: {
    ...typography.bodyMedium,
    lineHeight: 20,
  },
  bubbleTextMine: {
    color: colors.onPrimary,
  },
  bubbleTextTheirs: {
    color: colors.onSurface,
  },
  bubbleTextRecalled: {
    fontStyle: 'italic',
    opacity: 0.85,
  },
  replyBlock: {
    marginTop: 2,
    minWidth: 0,
    maxWidth: '100%',
    alignSelf: 'flex-start',
    borderRadius: 10,
    paddingHorizontal: spacing.sm,
    paddingVertical: 7,
  },
  replyBlockMine: {
    backgroundColor: 'rgba(0,0,0,0.06)',
  },
  replyBlockTheirs: {
    backgroundColor: 'rgba(0,0,0,0.06)',
  },
  replyInlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 0,
    gap: spacing.xs,
  },
  replyInlineText: {
    ...typography.bodySmall,
    minWidth: 0,
    lineHeight: 18,
    color: '#111111',
  },
  replyInlineAuthor: {
    ...typography.bodySmall,
    fontWeight: '700',
    color: '#111111',
  },
  replyInlineBody: {
    ...typography.bodySmall,
    color: '#111111',
  },
  replyInlineThumbnail: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: colors.surface3,
    flexShrink: 0,
  },
  replyInlineAudio: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minWidth: 0,
  },
  replyInlineAudioText: {
    ...typography.bodySmall,
    color: '#111111',
    fontWeight: '600',
  },
  replyThumbnail: {
    width: 38,
    height: 38,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.surface3,
    flexShrink: 0,
  },
  replyAccessoryIconWrap: {
    width: 38,
    height: 38,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.surface3,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  audioBubble: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    minWidth: 150,
  },
  audioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  audioLabel: {
    ...typography.bodyMedium,
  },
  bubbleTime: {
    ...typography.bodySmall,
    fontSize: 10,
    color: colors.onSurfaceVariant,
  },
  messageStatusWrap: {
    width: 14,
    height: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  messageSpinnerTrack: {
    width: 12,
    height: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(60, 60, 67, 0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  messageSpinnerArc: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: 'transparent',
    borderTopColor: '#8B95A3',
    borderRightColor: 'rgba(139, 149, 163, 0.72)',
  },
  messageFailedBadge: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.error,
    alignItems: 'center',
    justifyContent: 'center',
  },
  messageFailedBadgeText: {
    ...typography.labelSmall,
    color: colors.onError,
    fontWeight: '700',
    fontSize: 9,
    lineHeight: 10,
  },

  reactionList: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  reactionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.outlineVariant,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  reactionChipMine: {
    borderColor: colors.primary,
    backgroundColor: colors.surface1,
  },
  reactionEmoji: {
    fontSize: 13,
  },
  reactionCount: {
    ...typography.labelSmall,
    fontSize: 10,
    color: colors.onSurfaceVariant,
  },
  cardBubble: {
    borderRadius: 16,
    overflow: 'hidden',
    maxWidth: 264,
    minWidth: 224,
    backgroundColor: CARD_THEME.bg,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.12)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 2,
  },
  cardContent: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  cardIconCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: CARD_THEME.iconBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTypeText: {
    ...typography.labelSmall,
    color: CARD_THEME.accent,
    fontWeight: '600',
    flex: 1,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  cardTitle: {
    ...typography.titleSmall,
    color: '#000000',
    fontWeight: '700',
    lineHeight: 22,
  },
  cardDivider: {
    height: 1,
    backgroundColor: CARD_THEME.divider,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  cardPosterText: {
    ...typography.bodySmall,
    fontSize: 11,
    color: '#AAAAAA',
    flexShrink: 1,
  },
  cardDot: {
    ...typography.bodySmall,
    fontSize: 11,
    color: '#CCCCCC',
  },
  cardFooterText: {
    ...typography.bodySmall,
    fontSize: 11,
    color: '#CCCCCC',
  },

  replyComposer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.outlineVariant,
    backgroundColor: colors.surface1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  replyComposerTextWrap: {
    flex: 1,
  },
  replyComposerThumbnail: {
    width: 34,
    height: 34,
    borderRadius: borderRadius.sm,
    marginLeft: spacing.sm,
    backgroundColor: colors.surface3,
  },
  replyComposerLabel: {
    ...typography.labelSmall,
    color: colors.primary,
  },
  replyComposerText: {
    ...typography.bodySmall,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  replyComposerClose: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pendingForwardComposer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.outlineVariant,
    backgroundColor: colors.surface1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  pendingForwardCard: {
    flex: 1,
    borderRadius: 16,
    backgroundColor: CARD_THEME.bg,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  pendingForwardCardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  pendingForwardIconCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: CARD_THEME.iconBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pendingForwardLabel: {
    ...typography.labelSmall,
    color: CARD_THEME.accent,
    fontWeight: '700',
    flex: 1,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  pendingForwardText: {
    ...typography.bodyMedium,
    color: colors.onSurface,
    lineHeight: 20,
  },
  pendingForwardSendBtn: {
    minWidth: 72,
    height: 40,
    borderRadius: 20,
    backgroundColor: PURE_BLACK,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  pendingForwardSendBtnDisabled: {
    opacity: 0.6,
  },
  pendingForwardSendText: {
    ...typography.labelMedium,
    color: '#FFFFFF',
  },
  imageSendModeOverlay: {
    flex: 1,
    backgroundColor: colors.scrim,
    justifyContent: 'flex-end',
  },
  imageSendModeSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
    alignItems: 'center',
    gap: spacing.md,
  },
  imageSendModeTitle: {
    ...typography.titleSmall,
    color: colors.onSurface,
    textAlign: 'center',
    fontWeight: '700',
  },
  imageSendModeOption: {
    width: '100%',
    minHeight: 52,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: PURE_BLACK,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.surface,
  },
  imageSendModeOptionDisabled: {
    opacity: 0.6,
  },
  imageSendModeOptionText: {
    ...typography.titleSmall,
    color: PURE_BLACK,
    textAlign: 'center',
    fontWeight: '600',
  },

  /* ----- Input bar ----- */
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#D9D9D9',
    backgroundColor: '#FFFFFF',
    gap: spacing.xs,
  },
  mediaBtn: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: PURE_BLACK,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  voiceModeBtn: {
    borderRadius: borderRadius.full,
  },
  textInputShell: {
    flex: 1,
    minHeight: CHAT_INPUT_MIN_HEIGHT,
    maxHeight: CHAT_INPUT_MAX_HEIGHT,
    borderRadius: borderRadius.xl,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: PURE_BLACK,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    justifyContent: 'center',
  },
  textInput: {
    flex: 1,
    ...typography.bodyMedium,
    lineHeight: CHAT_INPUT_LINE_HEIGHT,
    color: PURE_BLACK,
    padding: 0,
    margin: 0,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: PURE_BLACK,
    backgroundColor: PURE_BLACK,
    alignItems: 'center',
    justifyContent: 'center',
  },
  holdToTalkBtn: {
    flex: 1,
    minHeight: 40,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface2,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  holdToTalkBtnRecording: {
    backgroundColor: colors.surface3,
  },
  holdToTalkBtnCancel: {
    backgroundColor: colors.errorContainer,
  },
  holdToTalkBtnTranscribe: {
    backgroundColor: colors.surface1,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  holdToTalkText: {
    ...typography.labelLarge,
    color: colors.onSurface,
  },
  voiceRecordingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
  },
  voiceRecordingCenter: {
    marginHorizontal: spacing.xxl,
    borderRadius: borderRadius.xl,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    gap: spacing.xs,
  },
  voiceRecordingTitle: {
    ...typography.titleMedium,
    color: colors.onPrimary,
  },
  voiceRecordingHint: {
    ...typography.bodySmall,
    color: 'rgba(255,255,255,0.8)',
  },
  voiceActionZone: {
    position: 'absolute',
    bottom: VOICE_ACTION_ZONE_BOTTOM,
    width: VOICE_ACTION_ZONE_WIDTH,
    height: VOICE_ACTION_ZONE_HEIGHT,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  voiceActionZoneLeft: {
    left: VOICE_ACTION_ZONE_SIDE,
  },
  voiceActionZoneRight: {
    right: VOICE_ACTION_ZONE_SIDE,
  },
  voiceActionZoneActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  voiceActionText: {
    ...typography.labelSmall,
    color: colors.onPrimary,
  },
  voiceActionTextActive: {
    color: colors.onPrimary,
  },
  actionOverlay: {
    flex: 1,
    backgroundColor: colors.scrim,
    justifyContent: 'flex-end',
  },
  actionSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    paddingBottom: 34,
  },
  actionEmojiRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  actionEmojiBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface2,
  },
  actionEmojiBtnActive: {
    backgroundColor: colors.surface1,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  actionEmojiText: {
    fontSize: 22,
  },
  actionDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.outlineVariant,
    marginHorizontal: spacing.lg,
  },
  actionItem: {
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
  },
  actionText: {
    ...typography.bodyLarge,
    color: colors.onSurface,
  },
  actionTextDanger: {
    color: colors.error,
  },
  actionTextMuted: {
    color: colors.onSurfaceVariant,
  },

  /* ----- Waiting for reply ----- */
  waitingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  noticeBar: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  noticeButton: {
    borderRadius: borderRadius.full,
    backgroundColor: colors.onSurface,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  noticeButtonText: {
    ...typography.labelLarge,
    color: colors.surface,
    fontWeight: '600',
  },
  waitingText: {
    ...typography.titleMedium,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
  },

  waveformContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    height: 24,
  },
  waveBar: {
    width: 3,
    borderRadius: 1.5,
  },
});
