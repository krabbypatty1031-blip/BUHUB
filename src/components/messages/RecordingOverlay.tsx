import React, { useCallback, forwardRef, useImperativeHandle, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import ReAnimated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { spacing } from '../../theme/spacing';

export type ActionType = 'send' | 'cancel' | 'transcribe';

export interface RecordingOverlayRef {
  handleTouchMove: (pageX: number, pageY: number) => void;
}

interface RecordingOverlayProps {
  visible: boolean;
  onRelease: (action: ActionType) => void;
  currentAction: ActionType;
  onActionChange: (action: ActionType) => void;
  durationMs?: number;
  transcriptText?: string;
}

const WAVE_BAR_COUNT = 13;
const BAR_BASE_HEIGHT = 36;

/* Phase offsets for each bar — creates wave illusion from a single driver */
const BAR_PHASES = Array.from({ length: WAVE_BAR_COUNT }, (_, i) => {
  const center = (WAVE_BAR_COUNT - 1) / 2;
  const dist = Math.abs(i - center) / center; // 0 at center, 1 at edges
  return {
    phase: (i / WAVE_BAR_COUNT) * Math.PI * 2,
    amplitude: 0.35 + (1 - dist) * 0.45, // center bars taller
  };
});

/* All bars driven by ONE shared progress value — minimal overhead */
function WaveBarAnimated({ progress, index }: { progress: ReAnimated.SharedValue<number>; index: number }) {
  const { phase, amplitude } = BAR_PHASES[index];

  const animStyle = useAnimatedStyle(() => {
    'worklet';
    const wave = Math.sin(progress.value + phase);
    const scaleY = 0.15 + amplitude * (0.5 + 0.5 * wave);
    return { transform: [{ scaleY }] };
  });

  return <ReAnimated.View style={[styles.waveBar, animStyle]} />;
}

/* Wave container — single progress drives all bars */
function WaveBars({ active }: { active: boolean }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    if (!active) {
      progress.value = withTiming(0, { duration: 200 });
      return;
    }
    // Single infinite animation: 0 → 2π over 1.2s, repeating
    progress.value = 0;
    progress.value = withRepeat(
      withTiming(Math.PI * 2, { duration: 1200, easing: Easing.linear }),
      -1,
      false,
    );
  }, [active, progress]);

  return (
    <View style={styles.waveRow}>
      {BAR_PHASES.map((_, i) => (
        <WaveBarAnimated key={i} progress={progress} index={i} />
      ))}
    </View>
  );
}


export const RecordingOverlay = forwardRef<RecordingOverlayRef, RecordingOverlayProps>(
  function RecordingOverlay(
    {
      visible,
      onRelease: _onRelease,
      currentAction,
      onActionChange,
      durationMs = 0,
      transcriptText = '',
    },
    ref
  ) {
    const { t } = useTranslation();
    const { width: screenWidth, height: screenHeight } = useWindowDimensions();

    const ZONE_TOP_RATIO = 0.38;
    const zoneMid = screenWidth / 2;

    const handleTouchMove = useCallback(
      (pageX: number, pageY: number) => {
        // Upper area = send
        if (pageY < screenHeight * ZONE_TOP_RATIO) {
          onActionChange('send');
          return;
        }
        // Bottom area: left = cancel, right = transcribe
        if (pageX <= zoneMid) {
          onActionChange('cancel');
        } else {
          onActionChange('transcribe');
        }
      },
      [zoneMid, screenHeight, onActionChange]
    );

    useImperativeHandle(ref, () => ({
      handleTouchMove,
    }));

    const hintText =
      currentAction === 'cancel'
        ? t('voiceReleaseToCancel')
        : currentAction === 'transcribe'
          ? t('voiceReleaseToTranscribe')
          : t('voiceSlideHint');

    if (!visible) return null;

    return (
      <View style={styles.overlay} pointerEvents="none">
        {/* Centered column: bubble → transcript → buttons → hint */}
        <View style={styles.centerColumn}>
          {/* Speech bubble with waveform */}
          <View style={styles.bubbleWrap}>
            <View style={styles.bubble}>
              <WaveBars active={durationMs >= 0} />
            </View>
            <View style={styles.bubbleTail} />
          </View>

          {/* Transcript text (if speech-to-text is active) */}
          {transcriptText ? (
            <Text style={styles.transcriptText} numberOfLines={3}>
              {transcriptText}
            </Text>
          ) : null}

          {/* Action buttons */}
          <View style={styles.actionRow}>
            <View
              style={[
                styles.actionBtn,
                currentAction === 'cancel' && styles.actionBtnFocused,
              ]}
            >
              <Text style={[styles.actionBtnText, currentAction === 'cancel' && styles.actionBtnTextCancel]}>
                {t('cancel')}
              </Text>
            </View>
            <View
              style={[
                styles.actionBtn,
                currentAction === 'transcribe' && styles.actionBtnFocused,
              ]}
            >
              <Text style={[styles.actionBtnText, currentAction === 'transcribe' && styles.actionBtnTextTranscribe]}>
                {t('voiceToText')}
              </Text>
            </View>
          </View>

          {/* Hint */}
          <Text
            style={[
              styles.hintText,
              currentAction === 'cancel' && styles.hintCancel,
              currentAction === 'transcribe' && styles.hintTranscribe,
            ]}
          >
            {hintText}
          </Text>
        </View>
      </View>
    );
  }
);

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
  },

  /* Column layout — lower half */
  centerColumn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 100,
    gap: 28,
  },
  bubbleWrap: {
    alignItems: 'center',
  },
  bubble: {
    backgroundColor: '#0C1015',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 24,
    paddingHorizontal: 28,
    paddingVertical: 22,
    minWidth: 200,
    minHeight: 68,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 10,
  },
  bubbleTail: {
    width: 14,
    height: 14,
    backgroundColor: '#0C1015',
    borderRightWidth: 1.5,
    borderBottomWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.12)',
    transform: [{ rotate: '45deg' }],
    marginTop: -8,
  },

  /* Wave bars */
  waveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    height: 40,
  },
  waveBar: {
    width: 3,
    height: BAR_BASE_HEIGHT,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.6)',
  },

  /* Transcript text */
  transcriptText: {
    fontSize: 18,
    lineHeight: 21,
    fontFamily: 'SourceHanSansCN-Medium',
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 16,
  },
  actionBtn: {
    width: 120,
    paddingVertical: 10,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 20,
    alignItems: 'center',
  },
  actionBtnFocused: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    transform: [{ scale: 1.06 }],
  },
  actionBtnText: {
    fontSize: 15,
    fontFamily: 'Poppins-SemiBold',
    color: 'rgba(255,255,255,0.6)',
  },
  actionBtnTextCancel: {
    color: '#FF6B6B',
  },
  actionBtnTextTranscribe: {
    color: '#6FE7A7',
  },

  /* Hint */
  hintText: {
    fontSize: 14,
    fontFamily: 'Poppins-Medium',
    color: 'rgba(255,255,255,0.3)',
  },
  hintCancel: {
    color: 'rgba(255,107,107,0.6)',
  },
  hintTranscribe: {
    color: 'rgba(111,231,167,0.6)',
  },
});

export default RecordingOverlay;
