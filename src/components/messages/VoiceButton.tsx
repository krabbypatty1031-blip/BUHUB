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
import { ChatMicIcon } from '../functions/DetailInfoIcons';

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
        <ChatMicIcon
          size={20}
          color={disabled ? '#86909C' : (isPressed ? '#FFFFFF' : '#0C1015')}
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
    gap: 6,
    height: 38,
    borderRadius: 19,
    paddingHorizontal: 16,
    backgroundColor: '#F5F5F5',
  },
  containerPressed: {
    backgroundColor: '#0C1015',
  },
  containerDisabled: {
    backgroundColor: '#F5F5F5',
    opacity: 0.4,
  },
  text: {
    fontSize: 14,
    fontFamily: 'SourceHanSansCN-Medium',
    color: '#0C1015',
  },
  textPressed: {
    color: '#FFFFFF',
  },
  textDisabled: {
    color: '#86909C',
  },
});

export default VoiceButton;
