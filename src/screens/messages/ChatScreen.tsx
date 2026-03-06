import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
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
import { FlashList, type FlashListRef } from '@shopify/flash-list';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import * as ImagePicker from 'expo-image-picker';
import { Audio } from 'expo-av';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  cancelAnimation,
} from 'react-native-reanimated';
import { CommonActions, useFocusEffect, useIsFocused } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { MessagesStackParamList } from '../../types/navigation';
import type { ChatMessage, ChatHistory } from '../../types';
import { useCanSendMessage, useChatHistory, usePresence, useRecallMessage, useSendMessage } from '../../hooks/useMessages';
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
  EditIcon,
} from '../../components/common/icons';
import { showTabBar, useTabBarAnimation } from '../../hooks/TabBarAnimationContext';
import { hapticLight } from '../../utils/haptics';
import { transcribeAudioFileWithNativeSpeech } from '../../utils/nativeSpeechToText';
import { getSpeechRecognitionModule } from '../../utils/speechRecognition';
import { normalizeImageUrl as normalizeMediaUrl } from '../../utils/imageUrl';

const MIN_RECORD_DURATION_MS = 1000;
const MAX_RECORD_DURATION_MS = 60000;
const TYPING_STOP_DELAY_MS = 2500;
const TYPING_STALE_MS = 6000;
const RECALL_WINDOW_MS = 2 * 60 * 1000;
const VOICE_ACTION_ZONE_WIDTH = 132;
const VOICE_ACTION_ZONE_HEIGHT = 80;
const VOICE_ACTION_ZONE_SIDE = 20;
const VOICE_ACTION_ZONE_BOTTOM = 90;
const PURE_BLACK = '#000000';
const REACTION_OPTIONS = [
  '\u{1F44D}',
  '\u{2764}\u{FE0F}',
  '\u{1F602}',
  '\u{1F62E}',
  '\u{1F622}',
  '\u{1F44F}',
];

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
  const anyErr = error as any;
  return anyErr.errorCode || anyErr?.error?.code || anyErr.code;
}

function looksLikeContentViolation(error: unknown): boolean {
  const code = getApiErrorCode(error);
  if (code === 'CONTENT_VIOLATION') return true;
  const msg = error && typeof error === 'object' && 'message' in (error as any) ? (error as any).message : '';
  return typeof msg === 'string' && (msg.includes('CONTENT_VIOLATION') || msg.includes('violates community guidelines'));
}

function looksLikeImageViolation(error: unknown): boolean {
  const msg = error && typeof error === 'object' && 'message' in (error as any) ? (error as any).message : '';
  return typeof msg === 'string' && (msg.includes('"code":"CONTENT_VIOLATION"') || msg.includes('Image contains content'));
}

type Props = NativeStackScreenProps<MessagesStackParamList, 'Chat'>;

/* ----- Union type for FlatList data ----- */
type ChatListItem =
  | { kind: 'date'; date: string; key: string }
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
  onPlayAudio?: (message: ChatMessage) => void;
  onImagePress?: (images: string[], index: number) => void;
  onPressReaction?: (message: ChatMessage, emoji: string, reactedByMe: boolean) => void;
  isAudioPlaying?: boolean;
  t: (key: string, options?: Record<string, unknown>) => string;
};

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
const TYPE_LABEL_KEYS: Record<string, string> = { partner: 'findPartner', errand: 'errands', secondhand: 'secondhand', post: 'forum' };

/* ----- Card theme: unified monochrome ----- */
const CARD_THEME = {
  bg: '#FFFFFF',
  iconBg: '#F5F5F5',
  iconColor: '#000000',
  accent: '#999999',
  divider: 'rgba(0,0,0,0.06)',
};

const TYPE_ICONS = { partner: UsersIcon, errand: TruckIcon, secondhand: ShoppingBagIcon, post: EditIcon };

const SINGLE_MEDIA_MAX_WIDTH = 220;
const SINGLE_MEDIA_MAX_HEIGHT = 280;
const GRID_MEDIA_MAX_WIDTH = 110;
const GRID_MEDIA_MAX_HEIGHT = 140;
const CHAT_MEDIA_SIZE_CACHE_MAX = 800;
const chatMediaSizeCache = new Map<string, { width: number; height: number }>();

const ChatMediaThumbnail = React.memo(function ChatMediaThumbnail({
  uri,
  totalCount,
  onPress,
  onLongPress,
}: {
  uri: string;
  totalCount: number;
  onPress: () => void;
  onLongPress?: () => void;
}) {
  const maxWidth = totalCount === 1 ? SINGLE_MEDIA_MAX_WIDTH : GRID_MEDIA_MAX_WIDTH;
  const maxHeight = totalCount === 1 ? SINGLE_MEDIA_MAX_HEIGHT : GRID_MEDIA_MAX_HEIGHT;
  const cacheKey = `${uri}|${maxWidth}|${maxHeight}`;
  const cachedSize = chatMediaSizeCache.get(cacheKey);
  const [size, setSize] = useState(() =>
    cachedSize ??
    getContainedMediaSize(
      maxWidth,
      maxHeight,
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
      maxWidth,
      maxHeight,
      maxWidth,
      maxHeight
    );
    setSize((prev) =>
      prev.width === fallbackSize.width && prev.height === fallbackSize.height ? prev : fallbackSize
    );
  }, [cacheKey, cachedSize, maxHeight, maxWidth, uri]);

  const handleImageLoad = useCallback((event: any) => {
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
        recyclingKey={uri}
        onLoad={handleImageLoad}
      />
    </TouchableOpacity>
  );
});

const ChatAlbumBubble = React.memo(function ChatAlbumBubble({
  images,
  count,
  isMine,
  onPress,
  onLongPress,
  t,
}: {
  images: string[];
  count: number;
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
          recyclingKey={coverImage}
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

function isSameReplyTo(a?: ChatMessage['replyTo'], b?: ChatMessage['replyTo']) {
  if (a === b) return true;
  if (!a || !b) return !a && !b;
  return a.text === b.text && a.from === b.from;
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
    isSameReactions(a.reactions, b.reactions)
  );
}

type MessageReplyBlockProps = {
  replyTo?: ChatMessage['replyTo'];
  isMine: boolean;
  t: (key: string, options?: Record<string, unknown>) => string;
};

const MessageReplyBlock = React.memo(function MessageReplyBlock({
  replyTo,
  isMine,
  t,
}: MessageReplyBlockProps) {
  if (!replyTo) return null;
  const replyFromLabel = replyTo.from === 'me' ? t('youLabel') : t('themLabel');

  return (
    <View style={[styles.replyBlock, isMine ? styles.replyBlockMine : styles.replyBlockTheirs]}>
      <Text style={[styles.replyAuthor, isMine ? styles.replyAuthorMine : styles.replyAuthorTheirs]}>
        {replyFromLabel}
      </Text>
      <Text style={[styles.replyText, isMine ? styles.replyTextMine : styles.replyTextTheirs]} numberOfLines={2}>
        {replyTo.text}
      </Text>
    </View>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.isMine === nextProps.isMine &&
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
      <MessageReplyBlock replyTo={message.replyTo} isMine={isMine} t={t} />
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
    prevProps.message.isRecalled === nextProps.message.isRecalled &&
    isSameReplyTo(prevProps.message.replyTo, nextProps.message.replyTo)
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

  return (
    <View style={styles.mediaBubble}>
      <MessageReplyBlock replyTo={message.replyTo} isMine={isMine} t={t} />
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
          images={images}
          count={message.imageAlbum.count}
          isMine={isMine}
          onPress={() => onImagePress?.(images, 0)}
          onLongPress={() => onLongPressMessage?.(message)}
          t={t}
        />
      ) : (
        <View style={styles.mediaGrid}>
          {images.slice(0, 4).map((uri, index) => (
            <ChatMediaThumbnail
              key={`${uri}-${index}`}
              uri={uri}
              totalCount={images.length}
              onPress={() => onImagePress?.(images, index)}
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
    isSameReplyTo(prevProps.message.replyTo, nextProps.message.replyTo) &&
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

/* ----- Chat bubble with avatar ----- */
const ChatBubble = React.memo(function ChatBubble({
  message,
  myAvatarText,
  myAvatarUri,
  theirAvatarText,
  theirAvatarUri,
  onCardPress,
  onLongPressMessage,
  onPlayAudio,
  onImagePress,
  onPressReaction,
  isAudioPlaying,
  t,
}: ChatBubbleProps) {
  const isMine = message.type === 'sent';
  const card = message.functionCard;
  const isRecalled = Boolean(message.isRecalled);
  const hasImages = Array.isArray(message.images) && message.images.length > 0;
  const hasAudio = Boolean(message.audio?.url);
  const hasReactions = Array.isArray(message.reactions) && message.reactions.length > 0;

  if (isRecalled) {
    const recalledText = isMine
      ? t('messageYouRecalled')
      : t('messagePeerRecalled');
    return (
      <View style={styles.recalledNoticeRow}>
        <Text style={styles.recalledNoticeText}>{recalledText}</Text>
      </View>
    );
  }

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
      <View style={styles.bubbleCol}>
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
                  {/* Top row: icon + type label + arrow */}
                  <View style={styles.cardTopRow}>
                    <View style={styles.cardIconCircle}>
                      <IconComp size={13} color={CARD_THEME.iconColor} />
                    </View>
                    <Text style={styles.cardTypeText}>
                      {t(TYPE_LABEL_KEYS[card.type]) || card.type}
                    </Text>
                    <ChevronRightIcon size={12} color="#CCCCCC" />
                  </View>
                  {/* Title */}
                  <Text style={styles.cardTitle} numberOfLines={2}>{card.title}</Text>
                  {/* Divider */}
                  <View style={styles.cardDivider} />
                  {/* Footer */}
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
            <TextMessageContent message={message} isMine={isMine} t={t} />
          )}
        </View>
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
          <Text style={styles.bubbleTime}>{message.time}</Text>
        </View>
      </View>
      {isMine && (
        <View style={styles.avatarWrap}>
          <Avatar text={myAvatarText} uri={myAvatarUri} size="sm" />
        </View>
      )}
    </View>
  );

  if (onLongPressMessage) {
    return (
      <TouchableOpacity
        activeOpacity={1}
        onLongPress={() => onLongPressMessage(message)}
        delayLongPress={300}
      >
        {bubbleNode}
      </TouchableOpacity>
    );
  }

  return bubbleNode;
}, (prevProps, nextProps) => {
  return (
    prevProps.myAvatarText === nextProps.myAvatarText &&
    prevProps.myAvatarUri === nextProps.myAvatarUri &&
    prevProps.theirAvatarText === nextProps.theirAvatarText &&
    prevProps.theirAvatarUri === nextProps.theirAvatarUri &&
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
    forwardedRequiresConfirm,
    backTo,
  } = route.params;
  const isScreenFocused = useIsFocused();
  const { data: chatHistory, isLoading } = useChatHistory(contactId, {
    enabled: isScreenFocused,
    polling: isScreenFocused,
  });
  const { data: canSendMessage } = useCanSendMessage(contactId);
  const { data: presence } = usePresence(contactId);
  const sendMessageMutation = useSendMessage(contactId);
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
  const isNearBottomRef = useRef(true);
  const anchorToLatestRef = useRef(true);
  const hasUserDraggedRef = useRef(false);
  const lastKnownListLengthRef = useRef(0);

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
      const parent = navigation.getParent() as any;
      navigation.reset({
        index: 0,
        routes: [{ name: 'MessagesList' }],
      });
      if (!parent) return;
      if (backTo.screen) {
        parent.navigate(backTo.tab, {
          screen: backTo.screen,
          params: backTo.params,
        });
        return;
      }
      parent.navigate(backTo.tab);
      return;
    }
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    navigation.getParent()?.navigate('MessagesTab', { screen: 'MessagesList' });
  }, [navigation, backTo]);

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
      isNearBottomRef.current = true;
      anchorToLatestRef.current = true;
      hasUserDraggedRef.current = false;
      lastKnownListLengthRef.current = 0;
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
  const [focusVersion, setFocusVersion] = useState(0);
  const [pendingImageAssets, setPendingImageAssets] = useState<ImagePicker.ImagePickerAsset[]>([]);
  const [imageSendModeVisible, setImageSendModeVisible] = useState(false);
  const [isSendingSelectedImages, setIsSendingSelectedImages] = useState(false);
  const [isTranscribingVoice, setIsTranscribingVoice] = useState(false);
  const [liveTranscriptionText, setLiveTranscriptionText] = useState('');
  const recordingDurationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const handleHoldToTalkReleaseRef = useRef<(() => Promise<void>) | null>(null);
  const liveTranscriptionTextRef = useRef('');
  const liveTranscriptionFinalRef = useRef('');
  const liveSpeechActiveRef = useRef(false);

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

  const forwardedCardDraft = useMemo(() => {
    if (!forwardedType || !forwardedPosterName) return null;
    if (!['partner', 'errand', 'secondhand', 'post'].includes(forwardedType)) return null;
    const normalizedType = forwardedType as 'partner' | 'errand' | 'secondhand' | 'post';
    const resolvedId =
      forwardedId ??
      (typeof forwardedIndex === 'number' ? String(forwardedIndex) : undefined);
    const cardTitle =
      (forwardedTitle ?? '').trim() || (normalizedType === 'post' ? t('messageImagePreview') : '-');
    const posterName = forwardedPosterName.trim() || t('themLabel');
    const dedupeKey =
      forwardedNonce?.trim() ||
      `${normalizedType}:${resolvedId ?? ''}:${cardTitle}:${forwardedPostId ?? ''}:${forwardedMessage?.trim() ?? ''}`;
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
    };
  }, [
    forwardedId,
    forwardedIndex,
    forwardedMessage,
    forwardedNonce,
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
    if (isLoading || canSendMessage === false || !forwardedCardDraft) return;
    if (cardSentRef.current === forwardedCardDraft.dedupeKey) {
      setPendingForwardConfirmKey(null);
      return;
    }
    if (forwardedCardDraft.requiresConfirm) {
      setPendingForwardConfirmKey(forwardedCardDraft.dedupeKey);
      return;
    }
    void (async () => {
      const textSent = await sendForwardedText(forwardedCardDraft);
      if (!textSent) return;
      await sendForwardedCard(forwardedCardDraft);
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
  const buildReplyPayload = useCallback(() => {
    if (!replyTarget) return undefined;
    return {
      text: buildReplyPreview(replyTarget),
      from: (replyTarget.type === 'sent' ? 'me' : 'them') as 'me' | 'them',
    };
  }, [buildReplyPreview, replyTarget]);

  /* ----- Chat trigger: disable input if last message is 'sent' (waiting for reply) ----- */
  const waitingForReplyByHistory = useMemo(() => {
    if (!chatHistory) return false;
    const histories = Array.isArray(chatHistory) ? chatHistory : [chatHistory];
    if (histories.length === 0) return false;
    const allMessages = histories.flatMap((h) => h.messages ?? []);
    const hasSent = allMessages.some((m) => m.type === 'sent');
    const hasReceived = allMessages.some((m) => m.type === 'received');
    return hasSent && !hasReceived;
  }, [chatHistory]);
  const waitingForReply = canSendMessage === false ? true : waitingForReplyByHistory;
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
    if (chatHistory) {
      const histories = Array.isArray(chatHistory) ? chatHistory : [chatHistory];
      histories.forEach((h: ChatHistory, gi: number) => {
        if (h.date) {
          items.push({ kind: 'date', date: h.date, key: `date-${h.date}-${gi}` });
        }
        h.messages.forEach((m: ChatMessage, mi: number) => {
          const messageKey = m.id ? `msg-${m.id}` : `msg-${gi}-${mi}-${m.time}`;
          items.push({ kind: 'message', message: m, key: messageKey });
        });
      });
    }
    return items;
  }, [chatHistory]);

  /* ----- Auto-scroll to bottom when data changes ----- */
  const scrollToBottom = useCallback((force = false) => {
    if (listData.length === 0) return;
    const shouldAutoScroll = force || isNearBottomRef.current || anchorToLatestRef.current;
    if (!shouldAutoScroll) return;
    requestAnimationFrame(() => {
      flatListRef.current?.scrollToEnd({ animated: false });
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
          scrollToBottom(true);
        });
      }, delay);
      scrollRetryTimersRef.current.push(timer);
    });
  }, [clearScrollRetryTimers, listData.length, scrollToBottom]);

  const handleListScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const distanceFromBottom = contentSize.height - (contentOffset.y + layoutMeasurement.height);
    const nearBottom = distanceFromBottom <= 96;
    isNearBottomRef.current = nearBottom;
    if (nearBottom) {
      anchorToLatestRef.current = true;
    } else if (hasUserDraggedRef.current) {
      anchorToLatestRef.current = false;
    }
  }, []);

  const handleListScrollBeginDrag = useCallback(() => {
    hasUserDraggedRef.current = true;
  }, []);

  useEffect(() => {
    isNearBottomRef.current = true;
    anchorToLatestRef.current = true;
    hasUserDraggedRef.current = false;
    lastKnownListLengthRef.current = 0;
    shouldForceLatestOnReadyRef.current = true;
    clearScrollRetryTimers();
  }, [clearScrollRetryTimers, contactId]);

  useEffect(() => {
    if (!isScreenFocused || isLoading || listData.length === 0 || !shouldForceLatestOnReadyRef.current) return;
    forceScrollToLatest();
    shouldForceLatestOnReadyRef.current = false;
    lastKnownListLengthRef.current = listData.length;
  }, [forceScrollToLatest, focusVersion, isLoading, isScreenFocused, listData.length]);

  useEffect(
    () => () => {
      clearScrollRetryTimers();
    },
    [clearScrollRetryTimers]
  );

  const handleContentSizeChange = useCallback(() => {
    if (listData.length === 0) return;
    const hasNewItems = listData.length > lastKnownListLengthRef.current;
    if (hasNewItems) {
      lastKnownListLengthRef.current = listData.length;
    }
    if (hasNewItems || anchorToLatestRef.current || shouldForceLatestOnReadyRef.current) {
      scrollToBottom(true);
    }
  }, [listData.length, scrollToBottom]);

  useEffect(() => {
    if (!isScreenFocused || listData.length === 0) return;
    const imageUris = listData
      .filter((item): item is Extract<ChatListItem, { kind: 'message' }> => item.kind === 'message')
      .flatMap((item) => item.message.images ?? [])
      .filter((uri) => typeof uri === 'string' && uri.length > 0);
    if (imageUris.length === 0) return;
    const prefetchTargets = Array.from(new Set(imageUris)).slice(-24);
    void ExpoImage.prefetch(prefetchTargets).catch(() => {
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
      } as const;
      if (card.type !== 'post') {
        const functionId = card.id ?? (card.index != null ? String(card.index) : undefined);
        if (!functionId) return;
        navigation.dispatch(
          CommonActions.navigate({
            name: 'FunctionsTab',
            params: {
              screen: screenMap[card.type],
              params: {
                id: functionId,
                backToChat: {
                  contactId,
                  contactName,
                  contactAvatar,
                },
              },
            },
          })
        );
      }
    },
    [navigation, contactId, contactName, contactAvatar]
  );

  const canRecallMessage = useCallback((message?: ChatMessage | null) => {
    if (!message || !message.id || message.type !== 'sent' || message.isRecalled) return false;
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

  const handleMessageActions = useCallback(
    (message: ChatMessage) => {
      if (message.isRecalled) return;
      hapticLight();
      setActionTarget(message);
    },
    []
  );

  const actionCurrentReactionEmoji =
    actionTarget?.reactions?.find((reaction) => reaction.reactedByMe)?.emoji ?? null;

  const handleSendReaction = useCallback(
    (emoji: string) => {
      if (!actionTarget?.id) return;
      const nextEmoji = actionCurrentReactionEmoji === emoji ? '' : emoji;
      sendMessageMutation.mutate(
        { payload: { reaction: { messageId: actionTarget.id, emoji: nextEmoji } } },
        {
          onSuccess: () => {
            setActionTarget(null);
          },
          onError: () => {
            showSnackbar({ message: t('dataLoadFailed'), type: 'error' });
          },
        }
      );
    },
    [actionCurrentReactionEmoji, actionTarget?.id, sendMessageMutation, showSnackbar, t]
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
    const text = inputText.trim();
    if (!text) return;
    if (sendMessageMutation.isPending) return;
    if (typingStopTimerRef.current) {
      clearTimeout(typingStopTimerRef.current);
      typingStopTimerRef.current = null;
    }
    sendTypingState(false);
    hapticLight();
    anchorToLatestRef.current = true;
    const replyPayload = buildReplyPayload();
    const previousReplyTarget = replyTarget;
    const pendingForwardDraft =
      forwardedCardDraft && pendingForwardPreview?.dedupeKey === forwardedCardDraft.dedupeKey
        ? forwardedCardDraft
        : null;
    setInputText('');
    setReplyTarget(null);
    try {
      await sendMessage({
        payload: { text, ...(replyPayload ? { replyTo: replyPayload } : {}) },
      });
      if (pendingForwardDraft) {
        const cardSent = await sendForwardedCard(pendingForwardDraft);
        if (cardSent) {
          setPendingForwardConfirmKey((current) =>
            current === pendingForwardDraft.dedupeKey ? null : current
          );
        }
      }
    } catch (err: any) {
      setInputText(text);
      setReplyTarget(previousReplyTarget);
      const code = err?.errorCode || err?.code;
      const msg = code === 'CONTENT_VIOLATION' ? t('contentViolation') : t('dataLoadFailed');
      showSnackbar({ message: msg, type: 'error' });
    }
  }, [
    buildReplyPayload,
    forwardedCardDraft,
    inputText,
    pendingForwardPreview?.dedupeKey,
    replyTarget,
    sendForwardedCard,
    sendMessage,
    sendMessageMutation.isPending,
    sendTypingState,
    showSnackbar,
    t,
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
      try {
        const uploaded = await uploadService.uploadImages(
          result.assets.map((asset, index) => ({
            uri: asset.uri,
            type: asset.mimeType || 'image/jpeg',
            name: asset.fileName || `camera-${Date.now()}-${index}.jpg`,
          }))
        );
        const replyPayload = buildReplyPayload();
        anchorToLatestRef.current = true;
        sendMessageMutation.mutate(
          { payload: { text: '', ...(replyPayload ? { replyTo: replyPayload } : {}) }, images: uploaded.urls },
          {
            onSuccess: () => {
              setReplyTarget(null);
            },
            onError: (error: unknown) => {
              const msg = looksLikeImageViolation(error)
                ? t('imageViolation')
                : looksLikeContentViolation(error)
                  ? t('contentViolation')
                  : extractErrorMessage(error, t('dataLoadFailed'));
              showSnackbar({ message: msg, type: 'error' });
            },
          }
        );
      } catch (error) {
        const msg = looksLikeImageViolation(error)
          ? t('imageViolation')
          : looksLikeContentViolation(error)
            ? t('contentViolation')
            : extractErrorMessage(error, t('dataLoadFailed'));
        showSnackbar({ message: msg, type: 'error' });
      }
    }
  }, [buildReplyPayload, sendMessageMutation, showSnackbar, t]);

  const clearPendingImageSelection = useCallback(() => {
    if (isSendingSelectedImages) return;
    setPendingImageAssets([]);
    setImageSendModeVisible(false);
  }, [isSendingSelectedImages]);

  const sendSelectedImages = useCallback(async (mode: ImageSendMode) => {
    if (pendingImageAssets.length === 0 || isSendingSelectedImages) return;
    setIsSendingSelectedImages(true);
    anchorToLatestRef.current = true;
    try {
      const uploaded = await uploadService.uploadImages(
        pendingImageAssets.map((asset, index) => ({
          uri: asset.uri,
          type: asset.mimeType || 'image/jpeg',
          name: asset.fileName || `gallery-${Date.now()}-${index}.jpg`,
        }))
      );

      const replyPayload = buildReplyPayload();

      if (mode === 'merged') {
        await sendMessage({
          payload: {
            imageAlbum: { count: uploaded.urls.length },
            ...(replyPayload ? { replyTo: replyPayload } : {}),
          },
          images: uploaded.urls,
        });
      } else {
        for (let index = 0; index < uploaded.urls.length; index += 1) {
          const imageUrl = uploaded.urls[index];
          await sendMessage({
            payload: {
              text: '',
              ...(index === 0 && replyPayload ? { replyTo: replyPayload } : {}),
            },
            images: [imageUrl],
          });
        }
      }

      setReplyTarget(null);
      setPendingImageAssets([]);
      setImageSendModeVisible(false);
      setIsSendingSelectedImages(false);
    } catch (error) {
      setIsSendingSelectedImages(false);
      const msg = looksLikeImageViolation(error)
        ? t('imageViolation')
        : looksLikeContentViolation(error)
          ? t('contentViolation')
          : extractErrorMessage(error, t('dataLoadFailed'));
      showSnackbar({ message: msg, type: 'error' });
    }
  }, [
    buildReplyPayload,
    isSendingSelectedImages,
    pendingImageAssets,
    sendMessage,
    showSnackbar,
    t,
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
      await recording.prepareToRecordAsync(
        Audio.RecordingOptionsPresets
          ? Audio.RecordingOptionsPresets.HIGH_QUALITY
          : ({
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
            } as any)
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
    try {
      const uploadMeta = getAudioUploadMetaFromUri(uri);
      const uploaded = await uploadService.uploadFile({
        uri,
        type: uploadMeta.type,
        name: uploadMeta.name,
      });
      const replyPayload = replyTarget
        ? {
            text: buildReplyPreview(replyTarget),
            from: (replyTarget.type === 'sent' ? 'me' : 'them') as 'me' | 'them',
          }
        : undefined;
      await sendMessage({
        payload: {
          ...(replyPayload ? { replyTo: replyPayload } : {}),
          audio: { url: uploaded.url, ...(typeof durationMs === 'number' ? { durationMs } : {}) },
        },
      });
      setReplyTarget(null);
    } catch (error) {
      if (__DEV__) {
        console.log('[Voice] sendRecordedAudio failed:', extractErrorMessage(error, 'unknown error'));
      }
      showSnackbar({ message: extractErrorMessage(error, t('dataLoadFailed')), type: 'error' });
    }
  }, [buildReplyPreview, replyTarget, sendMessage, showSnackbar, t]);

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

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
      });

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

  /* ----- Render list item ----- */
  const renderItem = useCallback(
    ({ item }: { item: ChatListItem }) => {
      if (item.kind === 'date') {
        return <DateSeparator date={item.date} />;
      }
      return (
        <ChatBubble
          message={item.message}
          myAvatarText={myAvatarText}
          myAvatarUri={myAvatarUri}
          theirAvatarText={theirAvatarText}
          theirAvatarUri={theirAvatarUri}
          onCardPress={handleCardPress}
          onLongPressMessage={handleMessageActions}
          onPlayAudio={handlePlayAudio}
          onImagePress={handleOpenImagePreview}
          onPressReaction={handlePressReaction}
          isAudioPlaying={Boolean(item.message.id && playingAudioMessageId === item.message.id)}
          t={t}
        />
      );
    },
    [
      myAvatarText,
      myAvatarUri,
      theirAvatarText,
      theirAvatarUri,
      handleCardPress,
      handleMessageActions,
      handlePlayAudio,
      handleOpenImagePreview,
      handlePressReaction,
      playingAudioMessageId,
      t,
    ]
  );

  const actionCanRecall = canRecallMessage(actionTarget);

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
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <FlashList
            ref={flatListRef}
            data={listData}
            renderItem={renderItem}
            keyExtractor={(item) => item.key}
            contentContainerStyle={styles.listContent}
            onContentSizeChange={handleContentSizeChange}
            onScroll={handleListScroll}
            onScrollBeginDrag={handleListScrollBeginDrag}
            scrollEventThrottle={16}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            drawDistance={700}
            removeClippedSubviews={Platform.OS === 'android'}
            getItemType={(item) => item.kind}
            maintainVisibleContentPosition={{
              startRenderingFromBottom: true,
              autoscrollToBottomThreshold: 0.02,
              animateAutoScrollToBottom: false,
            }}
          />
        )}

        {/* Input Bar */}
        {waitingForReply ? (
          /* ----- Waiting for reply: disabled input with hint ----- */
          <View style={styles.waitingBar}>
            <Text style={styles.waitingText}>{t('waitingForReply')}</Text>
          </View>
        ) : (
          <View>
            {replyTarget ? (
              <View style={styles.replyComposer}>
                <View style={styles.replyComposerTextWrap}>
                  <Text style={styles.replyComposerLabel}>
                    {t('replyAction')}
                  </Text>
                  <Text numberOfLines={1} style={styles.replyComposerText}>
                    {buildReplyPreview(replyTarget)}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.replyComposerClose}
                  onPress={() => setReplyTarget(null)}
                  activeOpacity={0.7}
                >
                  <CloseIcon size={18} color={colors.onSurfaceVariant} />
                </TouchableOpacity>
              </View>
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

                <TextInput
                  style={styles.textInput}
                  placeholder={t('inputMessage')}
                  placeholderTextColor={PURE_BLACK}
                  value={inputText}
                  onChangeText={setInputText}
                  multiline
                  textAlignVertical="top"
                />

                {hasText ? (
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

            <TouchableOpacity
              style={styles.actionItem}
              activeOpacity={0.7}
              onPress={() => {
                if (actionTarget) setReplyTarget(actionTarget);
                setActionTarget(null);
              }}
            >
              <Text style={styles.actionText}>
                {t('replyAction')}
              </Text>
            </TouchableOpacity>

            {actionCanRecall ? (
              <>
                <View style={styles.actionDivider} />
                <TouchableOpacity
                  style={styles.actionItem}
                  activeOpacity={0.7}
                  onPress={() => {
                    if (!actionTarget) return;
                    Alert.alert(
                      t('recallMessage'),
                      t('recallMessageConfirm'),
                      [
                        { text: t('cancel'), style: 'cancel' },
                        {
                          text: t('confirmBtn'),
                          style: 'destructive',
                          onPress: () => doRecallMessage(actionTarget),
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
  listContent: {
    padding: spacing.lg,
    gap: spacing.sm,
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
    marginVertical: spacing.xs,
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
    marginBottom: spacing.xs,
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
    flexShrink: 1,
    marginHorizontal: spacing.sm,
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
  bubble: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
  },
  mediaBubble: {
    gap: spacing.xs,
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
    borderLeftWidth: 2,
    paddingLeft: spacing.xs,
    marginBottom: spacing.xs,
  },
  replyBlockMine: {
    borderLeftColor: 'rgba(255,255,255,0.45)',
  },
  replyBlockTheirs: {
    borderLeftColor: colors.outline,
  },
  replyAuthor: {
    ...typography.labelSmall,
    marginBottom: 2,
  },
  replyAuthorMine: {
    color: 'rgba(255,255,255,0.85)',
  },
  replyAuthorTheirs: {
    color: colors.onSurfaceVariant,
  },
  replyText: {
    ...typography.bodySmall,
  },
  replyTextMine: {
    color: 'rgba(255,255,255,0.95)',
  },
  replyTextTheirs: {
    color: colors.onSurface,
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
    marginLeft: spacing.sm,
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
    alignItems: 'center',
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
  textInput: {
    flex: 1,
    height: 40,
    minHeight: 40,
    maxHeight: 120,
    borderRadius: borderRadius.full,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: PURE_BLACK,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    ...typography.bodyMedium,
    color: PURE_BLACK,
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
