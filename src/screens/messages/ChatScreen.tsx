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
} from '../../components/common/icons';
import { hapticLight } from '../../utils/haptics';

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

/* ── Chat bubble with avatar ── */
const ChatBubble = React.memo(function ChatBubble({
  message,
  myAvatar,
  theirAvatar,
}: {
  message: ChatMessage;
  myAvatar: string;
  theirAvatar: string;
}) {
  const isMine = message.type === 'sent';

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

/* ── Waveform bar (single animated bar) ── */
const WaveBar = React.memo(function WaveBar({ index }: { index: number }) {
  const height = useSharedValue(4);

  useEffect(() => {
    const dur = 150 + (index % 5) * 60;
    const maxH = 8 + (index % 4) * 6;
    height.value = withRepeat(
      withSequence(
        withTiming(maxH, { duration: dur }),
        withTiming(4, { duration: dur })
      ),
      -1,
      true
    );
    return () => {
      cancelAnimation(height);
    };
  }, [height, index]);

  const barStyle = useAnimatedStyle(() => ({
    height: height.value,
  }));

  return <Animated.View style={[styles.waveBar, barStyle]} />;
});

/* ── Waveform bars container ── */
const WAVE_BAR_COUNT = 24;
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
  const { contactName, contactAvatar } = route.params;
  const { data: chatHistory, isLoading } = useChatHistory(contactName);
  const sendMessage = useSendMessage(contactName);
  const user = useAuthStore((s) => s.user);
  const [inputText, setInputText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
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
    if (!chatHistory) return [];
    const histories = Array.isArray(chatHistory) ? chatHistory : [chatHistory];
    const items: ChatListItem[] = [];
    histories.forEach((h: ChatHistory, gi: number) => {
      if (h.date) {
        items.push({ kind: 'date', date: h.date, key: `date-${gi}` });
      }
      h.messages.forEach((m: ChatMessage, mi: number) => {
        items.push({ kind: 'message', message: m, key: `msg-${gi}-${mi}` });
      });
    });
    return items;
  }, [chatHistory]);

  /* ── Auto-scroll to bottom when data changes ── */
  const scrollToBottom = useCallback(() => {
    if (listData.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: false });
      }, 100);
    }
  }, [listData.length]);

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
        />
      );
    },
    [myAvatar, contactAvatar]
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
    gap: 2,
    height: 24,
  },
  waveBar: {
    width: 3,
    borderRadius: 1.5,
    backgroundColor: colors.primary,
  },
  recordingText: {
    ...typography.labelSmall,
    color: colors.error,
  },
});
