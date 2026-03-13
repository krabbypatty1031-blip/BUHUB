import React, { useEffect, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Easing } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
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
const WAVE_PATHS = [
  'M8 16C11 14 11 10 8 8',
  'M12 19C17 16 17 8 12 5',
  'M16 22C23 18 23 6 16 2',
];

const formatDuration = (ms: number): string => {
  const seconds = Math.max(1, Math.round(ms / 1000));
  return `${seconds}"`;
};

function VoiceWaveGlyph({
  isMine,
  isPlaying,
}: {
  isMine: boolean;
  isPlaying: boolean;
}) {
  const animatedValuesRef = useRef(WAVE_PATHS.map(() => new Animated.Value(0.56)));
  const strokeColor = isMine ? colors.onPrimary : colors.onSurface;

  useEffect(() => {
    if (!isPlaying) {
      animatedValuesRef.current.forEach((value) => {
        value.stopAnimation();
        value.setValue(0.56);
      });
      return;
    }

    const loops = animatedValuesRef.current.map((value, index) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(index * 90),
          Animated.timing(value, {
            toValue: 1,
            duration: 260,
            easing: Easing.out(Easing.quad),
            useNativeDriver: false,
          }),
          Animated.timing(value, {
            toValue: 0.38,
            duration: 260,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: false,
          }),
        ])
      )
    );

    loops.forEach((loop) => loop.start());

    return () => {
      loops.forEach((loop) => loop.stop());
      animatedValuesRef.current.forEach((value) => value.setValue(0.56));
    };
  }, [isPlaying]);

  return (
    <View style={[styles.waveGlyphWrap, isMine ? styles.waveGlyphWrapMine : styles.waveGlyphWrapTheirs]}>
      <Svg
        width={28}
        height={24}
        viewBox="0 0 28 24"
        style={isMine ? styles.waveGlyphSvgMine : undefined}
      >
        {WAVE_PATHS.map((path, index) => (
          <AnimatedPath
            key={path}
            d={path}
            fill="none"
            stroke={strokeColor}
            strokeWidth={2.3}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={animatedValuesRef.current[index]}
          />
        ))}
      </Svg>
    </View>
  );
}

export const VoiceMessageBubble: React.FC<VoiceMessageBubbleProps> = ({
  isMine,
  durationMs,
  isPlaying = false,
  isRead = true,
  onPress,
  onLongPress,
}) => {
  const bubbleWidth = useMemo(() => {
    const seconds = Math.max(1, Math.round(durationMs / 1000));
    return Math.min(216, Math.max(116, 104 + seconds * 4));
  }, [durationMs]);
  const skipNextPressRef = useRef(false);

  return (
    <TouchableOpacity
      activeOpacity={0.82}
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
      style={[styles.row, isMine ? styles.rowMine : styles.rowTheirs]}
    >
      <View
        style={[
          styles.bubble,
          isMine ? styles.bubbleMine : styles.bubbleTheirs,
          { width: bubbleWidth },
        ]}
      >
        {isMine ? (
          <>
            <Text style={[styles.duration, styles.durationMine]}>{formatDuration(durationMs)}</Text>
            <VoiceWaveGlyph isMine={isMine} isPlaying={isPlaying} />
          </>
        ) : (
          <>
            <VoiceWaveGlyph isMine={isMine} isPlaying={isPlaying} />
            <Text style={[styles.duration, styles.durationTheirs]}>{formatDuration(durationMs)}</Text>
          </>
        )}
      </View>

      {!isMine ? (
        <View style={styles.trailingMeta}>
          {!isRead ? <View style={styles.unreadDot} /> : null}
        </View>
      ) : null}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    minHeight: 42,
  },
  rowMine: {
    alignSelf: 'flex-end',
  },
  rowTheirs: {
    alignSelf: 'flex-start',
  },
  bubble: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 42,
    borderRadius: 18,
    paddingHorizontal: 12,
    justifyContent: 'flex-start',
  },
  bubbleMine: {
    backgroundColor: colors.primary,
    borderTopRightRadius: 6,
    paddingLeft: 12,
    paddingRight: 10,
  },
  bubbleTheirs: {
    backgroundColor: colors.surface2,
    borderTopLeftRadius: 6,
    paddingLeft: 10,
    paddingRight: 12,
  },
  waveGlyphWrap: {
    flex: 1,
    minWidth: 34,
    height: 24,
    justifyContent: 'center',
  },
  waveGlyphWrapMine: {
    alignItems: 'flex-end',
  },
  waveGlyphWrapTheirs: {
    alignItems: 'flex-start',
  },
  waveGlyphSvgMine: {
    transform: [{ scaleX: -1 }],
  },
  duration: {
    ...typography.bodyMedium,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.2,
    fontVariant: ['tabular-nums'],
    width: 28,
    textAlign: 'center',
  },
  durationMine: {
    color: colors.onPrimary,
    marginRight: 8,
  },
  durationTheirs: {
    color: colors.onSurface,
    marginLeft: 8,
  },
  trailingMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 6,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.error,
    marginLeft: 6,
  },
});

export default VoiceMessageBubble;
