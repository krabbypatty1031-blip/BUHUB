import React, { useCallback, forwardRef, useImperativeHandle, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  useWindowDimensions,
  Animated,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { typography } from '../../theme/typography';

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
}

const ACTION_PILL_WIDTH = 112;
const ACTION_ZONE_BOTTOM = 96;
const ACTION_ZONE_HEIGHT = 84;
const WAVE_BAR_COUNT = 9;

function WaveBars({ active }: { active: boolean }) {
  const bars = useRef(Array.from({ length: WAVE_BAR_COUNT }, () => new Animated.Value(8))).current;

  useEffect(() => {
    if (!active) {
      bars.forEach((bar) => bar.setValue(8));
      return;
    }

    const loops = bars.map((bar, index) => {
      const peak = 18 + (index % 4) * 5;
      const duration = 260 + (index % 3) * 80;
      return Animated.loop(
        Animated.sequence([
          Animated.delay(index * 45),
          Animated.timing(bar, { toValue: peak, duration, useNativeDriver: false }),
          Animated.timing(bar, { toValue: 8, duration, useNativeDriver: false }),
        ])
      );
    });
    loops.forEach((loop) => loop.start());
    return () => {
      loops.forEach((loop) => loop.stop());
    };
  }, [active, bars]);

  return (
    <View style={styles.waveRow}>
      {bars.map((height, index) => (
        <Animated.View
          // eslint-disable-next-line react/no-array-index-key
          key={index}
          style={[styles.waveBar, { height }]}
        />
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
    },
    ref
  ) {
    const { t } = useTranslation();
    const { width: screenWidth, height: screenHeight } = useWindowDimensions();

    const actionZoneTop = screenHeight - ACTION_ZONE_BOTTOM - ACTION_ZONE_HEIGHT;
    const actionLeft = spacing.xl;
    const actionRight = screenWidth - spacing.xl - ACTION_PILL_WIDTH;
    const actionBottom = screenHeight - ACTION_ZONE_BOTTOM;

    const handleTouchMove = useCallback(
      (pageX: number, pageY: number) => {
        if (pageY < actionZoneTop) {
          onActionChange('send');
          return;
        }
        if (pageY > actionBottom) {
          onActionChange('send');
          return;
        }

        const inTranscribeZone = pageX >= actionLeft && pageX <= actionLeft + ACTION_PILL_WIDTH;
        const inCancelZone = pageX >= actionRight && pageX <= actionRight + ACTION_PILL_WIDTH;

        if (inCancelZone) {
          onActionChange('cancel');
        } else if (inTranscribeZone) {
          onActionChange('transcribe');
        } else {
          onActionChange('send');
        }
      },
      [actionBottom, actionLeft, actionRight, actionZoneTop, onActionChange]
    );

    useImperativeHandle(ref, () => ({
      handleTouchMove,
    }));

    const hintText =
      currentAction === 'cancel'
        ? t('voiceReleaseToCancel')
        : currentAction === 'transcribe'
          ? t('voiceReleaseToTranscribe')
          : '';

    if (!visible) return null;

    return (
      <View style={styles.overlay} pointerEvents="none">
        <View style={styles.centerCard}>
          <WaveBars active={durationMs >= 0} />
          {hintText ? (
            <Text
              style={[
                styles.hintText,
                currentAction === 'cancel' ? styles.hintCancel : undefined,
                currentAction === 'transcribe' ? styles.hintTranscribe : undefined,
              ]}
            >
              {hintText}
            </Text>
          ) : null}
        </View>

        <View style={styles.actionZoneContainer}>
          <View
            style={[
              styles.actionPill,
              currentAction === 'transcribe' ? styles.actionPillFocused : undefined,
            ]}
          >
            <Text style={styles.actionLabel}>{t('voiceToText')}</Text>
          </View>
          <View
            style={[
              styles.actionPill,
              currentAction === 'cancel' ? styles.actionPillFocused : undefined,
            ]}
          >
            <Text style={styles.actionLabel}>{t('cancel')}</Text>
          </View>
        </View>
      </View>
    );
  }
);

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    flex: 1,
    backgroundColor: colors.scrimHeavy,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerCard: {
    width: 188,
    height: 132,
    borderRadius: borderRadius.lg,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.34)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  waveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    height: 34,
  },
  waveBar: {
    width: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.92)',
  },
  hintText: {
    ...typography.bodyMedium,
    color: 'rgba(255,255,255,0.88)',
    textAlign: 'center',
  },
  hintCancel: {
    color: '#FF7A7A',
  },
  hintTranscribe: {
    color: '#6FE7A7',
  },
  actionZoneContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: ACTION_ZONE_BOTTOM,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
  },
  actionPill: {
    width: ACTION_PILL_WIDTH,
    height: 52,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.34)',
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionPillFocused: {
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderColor: 'rgba(255,255,255,0.54)',
  },
  actionLabel: {
    ...typography.labelLarge,
    color: '#FFFFFF',
  },
});

export default RecordingOverlay;
