import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
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
import { CommonActions, useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { MessagesStackParamList } from '../../types/navigation';
import type { ChatMessage, ChatHistory } from '../../types';
import { useChatHistory, useSendMessage } from '../../hooks/useMessages';
import { useAuthStore } from '../../store/authStore';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import Avatar from '../../components/common/Avatar';
import {
  BackIcon,
  SendIcon,
  CameraIcon,
  MicIcon,
  ImageIcon,
  CloseIcon,
  ChevronRightIcon,
  UsersIcon,
  TruckIcon,
  ShoppingBagIcon,
  EditIcon,
} from '../../components/common/icons';
import { useTabBarAnimation } from '../../hooks/TabBarAnimationContext';
import { hapticLight } from '../../utils/haptics';

const TAB_BAR_HEIGHT = 80;

type Props = NativeStackScreenProps<MessagesStackParamList, 'Chat'>;

/* ── Union type for FlatList data ── */
type ChatListItem =
  | { kind: 'date'; date: string; key: string }
  | { kind: 'message'; message: ChatMessage; key: string };

/* ── Date separator ── */
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

/* ── Type label keys ── */
const TYPE_LABEL_KEYS: Record<string, string> = { partner: 'findPartner', errand: 'errands', secondhand: 'secondhand', post: 'forum' };

/* ── Card theme – unified monochrome ── */
const CARD_THEME = {
  bg: '#FFFFFF',
  iconBg: '#F5F5F5',
  iconColor: '#000000',
  accent: '#999999',
  divider: 'rgba(0,0,0,0.06)',
};

const TYPE_ICONS = { partner: UsersIcon, errand: TruckIcon, secondhand: ShoppingBagIcon, post: EditIcon };

/* ── Chat bubble with avatar ── */
const ChatBubble = React.memo(function ChatBubble({
  message,
  myAvatar,
  theirAvatar,
  onCardPress,
  t,
}: {
  message: ChatMessage;
  myAvatar: string;
  theirAvatar: string;
  onCardPress?: (card: NonNullable<ChatMessage['functionCard']>) => void;
  t: (key: string, options?: Record<string, unknown>) => string;
}) {
  const isMine = message.type === 'sent';
  const card = message.functionCard;

  return (
    <View
      style={[
        styles.bubbleRow,
        isMine ? styles.bubbleRowRight : styles.bubbleRowLeft,
      ]}
    >
      {!isMine && (
        <View style={styles.avatarWrap}>
          <Avatar text={theirAvatar} size="sm" />
        </View>
      )}
      <View style={styles.bubbleCol}>
        {card ? (() => {
          const IconComp = TYPE_ICONS[card.type];
          const shareCount = (card.index * 7 + 3) % 18 + 3;
          return (
            <TouchableOpacity
              style={styles.cardBubble}
              activeOpacity={0.8}
              onPress={() => onCardPress?.(card)}
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
                  <Text style={styles.cardDot}>·</Text>
                  <Text style={styles.cardFooterText}>{t('sharedCount', { count: shareCount })}</Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        })() : (
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
              ]}
            >
              {message.text}
            </Text>
          </View>
        )}
        <Text
          style={[
            styles.bubbleTime,
            isMine ? styles.bubbleTimeRight : styles.bubbleTimeLeft,
          ]}
        >
          {message.time}
        </Text>
      </View>
      {isMine && (
        <View style={styles.avatarWrap}>
          <Avatar text={myAvatar} size="sm" />
        </View>
      )}
    </View>
  );
});

/* ── Waveform color palette ── */
const WAVE_COLORS = [colors.error];

/* ── Waveform bar (single animated bar with staggered start) ── */
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

/* ── Waveform bars container ── */
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

export default function ChatScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const { contactName, contactAvatar, forwardedType, forwardedTitle, forwardedPosterName, forwardedIndex, forwardedPostId, forwardedMessage } = route.params;
  const { data: chatHistory, isLoading } = useChatHistory(contactName);
  const sendMessage = useSendMessage(contactName);
  const user = useAuthStore((s) => s.user);
  const { tabBarTranslateY } = useTabBarAnimation();

  // Hide tab bar when chat is focused, restore when leaving
  useFocusEffect(
    useCallback(() => {
      tabBarTranslateY.value = withTiming(TAB_BAR_HEIGHT, { duration: 250 });
      return () => {
        tabBarTranslateY.value = withTiming(0, { duration: 250 });
      };
    }, [tabBarTranslateY])
  );

  const [inputText, setInputText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [cardMessages, setCardMessages] = useState<ChatMessage[]>([]);
  const cardSentRef = useRef<string | null>(null);

  // Auto-send card message when forwarded params are present
  useEffect(() => {
    if (forwardedType && forwardedTitle && forwardedPosterName && forwardedIndex != null) {
      const key = `${forwardedType}:${forwardedIndex}:${forwardedTitle}:${forwardedPostId || ''}`;
      if (cardSentRef.current !== key) {
        cardSentRef.current = key;
        const now = new Date();
        const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
        const newMessages: ChatMessage[] = [];
        // If there's a forwarded message, create a text message first
        if (forwardedMessage?.trim()) {
          newMessages.push({
            type: 'sent',
            text: forwardedMessage.trim(),
            time: timeStr,
          });
        }
        // Create the card message
        newMessages.push({
          type: 'sent',
          text: '',
          time: timeStr,
          functionCard: {
            type: forwardedType as 'partner' | 'errand' | 'secondhand' | 'post',
            index: forwardedIndex,
            title: forwardedTitle,
            posterName: forwardedPosterName,
            ...(forwardedPostId ? { postId: forwardedPostId } : {}),
          },
        });
        setCardMessages((prev) => [...prev, ...newMessages]);
      }
    }
  }, [forwardedType, forwardedTitle, forwardedPosterName, forwardedIndex, forwardedPostId, forwardedMessage]);

  const recordingRef = useRef<Audio.Recording | null>(null);
  const flatListRef = useRef<FlatList<ChatListItem>>(null);

  const myAvatar = user?.name?.charAt(0) || user?.nickname?.charAt(0) || '我';
  const hasText = inputText.trim().length > 0;

  /* ── Chat trigger: disable input if last message is 'sent' (waiting for reply) ── */
  const waitingForReply = useMemo(() => {
    if (!chatHistory) return false;
    const histories = Array.isArray(chatHistory) ? chatHistory : [chatHistory];
    if (histories.length === 0) return false;
    const lastGroup = histories[histories.length - 1];
    if (!lastGroup.messages || lastGroup.messages.length === 0) return false;
    const lastMsg = lastGroup.messages[lastGroup.messages.length - 1];
    return lastMsg.type === 'sent';
  }, [chatHistory]);

  /* ── Build flat list data with date separators ── */
  const listData = useMemo<ChatListItem[]>(() => {
    const items: ChatListItem[] = [];
    if (chatHistory) {
      const histories = Array.isArray(chatHistory) ? chatHistory : [chatHistory];
      histories.forEach((h: ChatHistory, gi: number) => {
        if (h.date) {
          items.push({ kind: 'date', date: h.date, key: `date-${gi}` });
        }
        h.messages.forEach((m: ChatMessage, mi: number) => {
          items.push({ kind: 'message', message: m, key: `msg-${gi}-${mi}` });
        });
      });
    }
    cardMessages.forEach((m, i) => {
      items.push({ kind: 'message', message: m, key: `card-${i}` });
    });
    return items;
  }, [chatHistory, cardMessages]);

  /* ── Auto-scroll to bottom when data changes ── */
  const scrollToBottom = useCallback(() => {
    if (listData.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: false });
      }, 100);
    }
  }, [listData.length]);

  /* ── Handle card press: navigate to detail ── */
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
        navigation.dispatch(
          CommonActions.navigate({
            name: 'FunctionsTab',
            params: {
              screen: screenMap[card.type],
              params: { index: card.index },
            },
          })
        );
      }
    },
    [navigation]
  );

  /* ── Send message ── */
  const handleSend = useCallback(() => {
    const text = inputText.trim();
    if (!text) return;
    hapticLight();
    sendMessage.mutate(text);
    setInputText('');
  }, [inputText, sendMessage]);

  /* ── Camera: open device camera ── */
  const handleCamera = useCallback(async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission needed',
        'Please grant camera access to take photos.'
      );
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });
    if (!result.canceled && result.assets.length > 0) {
      hapticLight();
    }
  }, []);

  /* ── Image: open photo library ── */
  const handlePickImage = useCallback(async () => {
    const { status } =
      await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission needed',
        'Please grant photo library access to select images.'
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });
    if (!result.canceled && result.assets.length > 0) {
      hapticLight();
    }
  }, []);

  /* ── Mic: start / stop recording ── */
  const handleMicPress = useCallback(async () => {
    if (isRecording) {
      // Stop recording
      try {
        if (recordingRef.current) {
          await recordingRef.current.stopAndUnloadAsync();
          recordingRef.current = null;
        }
      } catch {
        // ignore
      }
      setIsRecording(false);
      hapticLight();
      Alert.alert(
        t('voiceNotSupported') || 'Voice-to-text coming soon'
      );
      return;
    }

    // Start recording
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission needed',
          'Please grant microphone access to record audio.'
        );
        return;
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
      setIsRecording(true);
      hapticLight();
    } catch {
      Alert.alert('Error', 'Failed to start recording');
    }
  }, [isRecording, t]);

  /* ── Render list item ── */
  const renderItem = useCallback(
    ({ item }: { item: ChatListItem }) => {
      if (item.kind === 'date') {
        return <DateSeparator date={item.date} />;
      }
      return (
        <ChatBubble
          message={item.message}
          myAvatar={myAvatar}
          theirAvatar={contactAvatar}
          onCardPress={handleCardPress}
          t={t}
        />
      );
    },
    [myAvatar, contactAvatar, handleCardPress, t]
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.iconBtn}
        >
          <BackIcon size={24} color={colors.onSurface} />
        </TouchableOpacity>
        <Text style={styles.topBarTitle} numberOfLines={1}>
          {contactName}
        </Text>
        <View style={styles.iconBtn} />
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={listData}
            renderItem={renderItem}
            keyExtractor={(item) => item.key}
            contentContainerStyle={styles.listContent}
            onContentSizeChange={scrollToBottom}
            onLayout={scrollToBottom}
          />
        )}

        {/* Input Bar */}
        {waitingForReply ? (
          /* ── Waiting for reply: disabled input with hint ── */
          <View style={styles.waitingBar}>
            <Text style={styles.waitingText}>{t('waitingForReply')}</Text>
          </View>
        ) : (
          <View style={styles.inputBar}>
            {isRecording ? (
              /* ── Recording mode: waveform + stop button ── */
              <>
                <TouchableOpacity
                  style={styles.mediaBtn}
                  activeOpacity={0.6}
                  onPress={handleMicPress}
                >
                  <CloseIcon size={22} color={colors.error} />
                </TouchableOpacity>
                <View style={styles.recordingArea}>
                  <WaveformBars />
                  <Text style={styles.recordingText}>
                    {t('recording') || 'Recording...'}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.sendBtn}
                  onPress={handleMicPress}
                  activeOpacity={0.7}
                >
                  <SendIcon size={20} color={colors.onPrimary} />
                </TouchableOpacity>
              </>
            ) : (
              /* ── Normal mode ── */
              <>
                {/* Left icon: camera (hidden when typing) */}
                {!hasText && (
                  <TouchableOpacity
                    style={styles.mediaBtn}
                    activeOpacity={0.6}
                    onPress={handleCamera}
                  >
                    <CameraIcon size={22} color={colors.onSurfaceVariant} />
                  </TouchableOpacity>
                )}

                {/* Text input */}
                <TextInput
                  style={styles.textInput}
                  placeholder={t('inputMessage') || 'Type a message...'}
                  placeholderTextColor={colors.onSurfaceVariant}
                  value={inputText}
                  onChangeText={setInputText}
                  returnKeyType="send"
                  onSubmitEditing={handleSend}
                />

                {/* Right icons: mic + image (hidden when typing), or send button */}
                {hasText ? (
                  <TouchableOpacity
                    style={styles.sendBtn}
                    onPress={handleSend}
                    activeOpacity={0.7}
                  >
                    <SendIcon size={20} color={colors.onPrimary} />
                  </TouchableOpacity>
                ) : (
                  <>
                    <TouchableOpacity
                      style={styles.mediaBtn}
                      activeOpacity={0.6}
                      onPress={handleMicPress}
                    >
                      <MicIcon size={22} color={colors.onSurfaceVariant} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.mediaBtn}
                      activeOpacity={0.6}
                      onPress={handlePickImage}
                    >
                      <ImageIcon size={22} color={colors.onSurfaceVariant} />
                    </TouchableOpacity>
                  </>
                )}
              </>
            )}
          </View>
        )}
      </KeyboardAvoidingView>
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
  topBarTitle: {
    flex: 1,
    textAlign: 'center',
    ...typography.titleMedium,
    color: colors.onSurface,
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

  /* ── Date separator ── */
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

  /* ── Bubble row (avatar + bubble) ── */
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
  bubble: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
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
  bubbleTime: {
    ...typography.bodySmall,
    fontSize: 10,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  bubbleTimeRight: {
    textAlign: 'right',
  },
  bubbleTimeLeft: {
    textAlign: 'left',
  },

  /* ── Function card bubble ── */
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

  /* ── Input bar ── */
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.outlineVariant,
    backgroundColor: colors.surface,
    gap: spacing.xs,
  },
  mediaBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textInput: {
    flex: 1,
    height: 40,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface2,
    paddingHorizontal: spacing.lg,
    ...typography.bodyMedium,
    color: colors.onSurface,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* ── Waiting for reply ── */
  waitingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.outlineVariant,
    backgroundColor: colors.surface1,
  },
  waitingText: {
    ...typography.bodySmall,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
  },

  /* ── Recording mode ── */
  recordingArea: {
    flex: 1,
    height: 40,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface2,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
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
  recordingText: {
    ...typography.labelSmall,
    color: colors.error,
  },
});
