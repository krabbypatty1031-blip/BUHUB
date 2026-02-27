import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import Svg, { Path, Polygon } from 'react-native-svg';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { typography } from '../../theme/typography';

interface VoiceMessageBubbleProps {
  isMine: boolean;
  durationMs: number;
  isPlaying?: boolean;
  isRead?: boolean;
  onPress?: () => void;
  onLongPress?: () => void;
}

const AnimatedPath = Animated.createAnimatedComponent(Path);

const AnimatedSpeakerIcon = ({
  isMine,
  isPlaying,
  size = 18,
}: {
  isMine: boolean;
  isPlaying: boolean;
  size?: number;
}) => {
  const anim1 = useRef(new Animated.Value(0)).current;
  const anim2 = useRef(new Animated.Value(0)).current;
  const anim3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!isPlaying) {
      anim1.setValue(0);
      anim2.setValue(0);
      anim3.setValue(0);
      return;
    }

    const createLoop = (anim: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
          }),
        ])
      );

    const loop1 = createLoop(anim1, 0);
    const loop2 = createLoop(anim2, 150);
    const loop3 = createLoop(anim3, 300);

    loop1.start();
    loop2.start();
    loop3.start();

    return () => {
      loop1.stop();
      loop2.stop();
      loop3.stop();
    };
  }, [isPlaying, anim1, anim2, anim3]);

  const iconColor = isMine ? colors.onPrimary : colors.onSurface;

  return (
    <View
      style={{
        width: size + 6,
        height: size,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'visible',
        transform: isMine ? [{ scaleX: -1 }] : undefined,
      }}
    >
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Polygon points="6,8 12,4 12,20 6,16" fill={iconColor} />
        <Path d="M6 8H3v8h3V8z" fill={iconColor} />
        <AnimatedPath
          d="M15 6c2 2 2 10 0 12"
          stroke={iconColor}
          strokeWidth={2}
          fill="none"
          strokeLinecap="round"
          opacity={anim1.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] })}
        />
        <AnimatedPath
          d="M18 4c3 3 3 13 0 16"
          stroke={iconColor}
          strokeWidth={2}
          fill="none"
          strokeLinecap="round"
          opacity={anim2.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] })}
        />
        <AnimatedPath
          d="M21 2c4 4 4 16 0 20"
          stroke={iconColor}
          strokeWidth={2}
          fill="none"
          strokeLinecap="round"
          opacity={anim3.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] })}
        />
      </Svg>
    </View>
  );
};

const formatDuration = (ms: number): string => {
  const seconds = Math.max(1, Math.round(ms / 1000));
  return `${seconds}"`;
};

export const VoiceMessageBubble: React.FC<VoiceMessageBubbleProps> = ({
  isMine,
  durationMs,
  isPlaying = false,
  isRead = true,
  onPress,
  onLongPress,
}) => {
  const bubbleWidth = Math.min(200, Math.max(100, 60 + durationMs / 100));
  const skipNextPressRef = useRef(false);

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={() => {
        if (skipNextPressRef.current) {
          skipNextPressRef.current = false;
          return;
        }
        onPress?.();
      }}
      onLongPress={() => {
        skipNextPressRef.current = true;
        onLongPress?.();
      }}
      delayLongPress={300}
      style={[
        styles.container,
        isMine ? styles.containerMine : styles.containerTheirs,
        { width: bubbleWidth },
      ]}
    >
      {isMine ? (
        <>
          <Text style={[styles.duration, styles.durationMine]}>{formatDuration(durationMs)}</Text>
          <View style={styles.iconSlot}>
            <AnimatedSpeakerIcon isMine={isMine} isPlaying={isPlaying} />
          </View>
        </>
      ) : (
        <>
          <View style={styles.iconSlot}>
            <AnimatedSpeakerIcon isMine={isMine} isPlaying={isPlaying} />
          </View>
          <Text style={[styles.duration, styles.durationTheirs]}>{formatDuration(durationMs)}</Text>
        </>
      )}

      {!isMine && !isRead && <View style={styles.unreadDot} />}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    minHeight: 44,
  },
  containerMine: {
    backgroundColor: colors.primary,
    borderTopRightRadius: borderRadius.xs,
    justifyContent: 'flex-end',
  },
  containerTheirs: {
    backgroundColor: colors.surface2,
    borderTopLeftRadius: borderRadius.xs,
    justifyContent: 'flex-start',
  },
  duration: {
    ...typography.bodyMedium,
    fontSize: 14,
    fontVariant: ['tabular-nums'],
  },
  durationMine: {
    color: colors.onPrimary,
    marginRight: spacing.xs,
  },
  durationTheirs: {
    color: colors.onSurface,
    marginLeft: spacing.xs,
  },
  iconSlot: {
    width: 24,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  unreadDot: {
    position: 'absolute',
    right: -10,
    top: '50%',
    marginTop: -4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.error,
  },
});

export default VoiceMessageBubble;
