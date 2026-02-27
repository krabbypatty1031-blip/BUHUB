import React, { useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  type GestureResponderEvent,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { spacing, borderRadius } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { MicIcon } from '../common/icons';

type ButtonState = 'idle' | 'pressing' | 'recording';

interface VoiceButtonProps {
  state: ButtonState;
  onPressIn?: (e: GestureResponderEvent) => void;
  onPressOut?: (e: GestureResponderEvent) => void;
  onPress?: () => void;
  onTouchMove?: (e: GestureResponderEvent) => void;
  disabled?: boolean;
  showIcon?: boolean;
}

export const VoiceButton: React.FC<VoiceButtonProps> = ({
  state,
  onPressIn,
  onPressOut,
  onPress,
  onTouchMove,
  disabled = false,
  showIcon = true,
}) => {
  const { t } = useTranslation();
  const isPressedRef = useRef(false);
  const isPressed = state === 'pressing' || state === 'recording';
  const getContainerStyle = () => {
    if (disabled) {
      return [styles.container, styles.containerDisabled];
    } else if (isPressed) {
      return [styles.container, styles.containerPressed];
    }
    return [styles.container];
  };
  const getButtonText = () => {
    switch (state) {
      case 'recording':
      case 'pressing':
        return t('voiceReleaseToFinish');
      default:
        return t('voiceHoldToTalk');
    }
  };

  const handlePressIn = (e: GestureResponderEvent) => {
    isPressedRef.current = true;
    onPressIn?.(e);
  };

  const handlePressOut = (e: GestureResponderEvent) => {
    isPressedRef.current = false;
    onPressOut?.(e);
  };

  const handleTouchMove = (e: GestureResponderEvent) => {
    if (isPressedRef.current) {
      onTouchMove?.(e);
    }
  };

  return (
    <View
      style={getContainerStyle()}
      onStartShouldSetResponder={() => !disabled}
      onMoveShouldSetResponder={() => false}
      onResponderTerminationRequest={() => false}
      onResponderGrant={handlePressIn}
      onResponderMove={handleTouchMove}
      onResponderRelease={handlePressOut}
      onResponderTerminate={handlePressOut}
    >
      {showIcon ? (
        <MicIcon
          size={20}
          color={disabled ? '#7A7A7A' : (isPressed ? '#FFFFFF' : '#000000')}
        />
      ) : null}
      <Text style={[styles.text, isPressed && styles.textPressed, disabled && styles.textDisabled]}>
        {getButtonText()}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: spacing.xs,
    height: 40,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.lg,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#000000',
  },
  containerPressed: {
    backgroundColor: '#000000',
  },
  containerDisabled: {
    backgroundColor: '#F5F5F5',
    borderColor: '#BDBDBD',
    opacity: 0.6,
  },
  text: {
    ...typography.labelLarge,
    color: '#000000',
    fontSize: 15,
    fontWeight: '500',
  },
  textPressed: {
    color: '#FFFFFF',
  },
  textDisabled: {
    color: '#7A7A7A',
  },
});

export default VoiceButton;
