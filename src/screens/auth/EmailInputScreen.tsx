import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Animated,
  PanResponder,
  Dimensions,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '../../types/navigation';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { useUIStore } from '../../store/uiStore';
import { BackIcon, CheckIcon } from '../../components/common/icons';

type Props = NativeStackScreenProps<AuthStackParamList, 'EmailInput'>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const TRACK_WIDTH = Math.min(SCREEN_WIDTH - 32 - 32, 340); // paddingHorizontal 16*2
const SLIDER_WIDTH = 46;
const SUCCESS_THRESHOLD = TRACK_WIDTH - SLIDER_WIDTH - 4;

export default function EmailInputScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const showSnackbar = useUIStore((s) => s.showSnackbar);

  const [email, setEmail] = useState('');
  const [showCaptcha, setShowCaptcha] = useState(false);
  const [captchaVerified, setCaptchaVerified] = useState(false);

  const emailRef = useRef(email);
  emailRef.current = email;

  const pan = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const onCaptchaSuccess = useCallback(() => {
    const currentEmail = emailRef.current;
    showSnackbar({ message: t('codeSent'), type: 'success' });
    setTimeout(() => {
      navigation.navigate('VerifyCode', { email: currentEmail });
    }, 400);
  }, [navigation, showSnackbar, t]);

  const onCaptchaSuccessRef = useRef(onCaptchaSuccess);
  onCaptchaSuccessRef.current = onCaptchaSuccess;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gestureState) => {
        const dx = Math.max(0, Math.min(gestureState.dx, SUCCESS_THRESHOLD));
        pan.setValue(dx);
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx >= SUCCESS_THRESHOLD) {
          Animated.spring(pan, {
            toValue: SUCCESS_THRESHOLD,
            useNativeDriver: false,
          }).start(() => {
            setCaptchaVerified(true);
            setTimeout(() => {
              onCaptchaSuccessRef.current();
            }, 500);
          });
        } else {
          Animated.spring(pan, {
            toValue: 0,
            useNativeDriver: false,
          }).start();
        }
      },
      onPanResponderTerminationRequest: () => false,
    })
  ).current;

  const handleRequestCode = useCallback(() => {
    const trimmed = email.trim();
    if (!trimmed) return;
    if (!trimmed.includes('@') || !trimmed.includes('.')) {
      showSnackbar({ message: t('emailPlaceholder'), type: 'error' });
      return;
    }
    setShowCaptcha(true);
    pan.setValue(0);
    setCaptchaVerified(false);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 250,
      useNativeDriver: false,
    }).start();
  }, [email, showSnackbar, t, pan, fadeAnim]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <BackIcon size={24} color={colors.onSurface} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={styles.content}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <Text style={styles.title}>{t('emailInputTitle')}</Text>
          <Text style={styles.desc}>{t('emailInputDesc')}</Text>
        </View>

        <View style={styles.form}>
          {/* Email Input */}
          <View style={[styles.inputField, showCaptcha && styles.inputFieldLocked]}>
            <TextInput
              style={styles.emailInput}
              placeholder={t('emailPlaceholder')}
              placeholderTextColor={colors.onSurfaceVariant}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!showCaptcha}
            />
          </View>

          {/* Inline Captcha */}
          {showCaptcha && (
            <Animated.View style={[styles.captchaInline, { opacity: fadeAnim }]}>
              <Text style={styles.captchaHint}>
                {captchaVerified ? t('captchaSuccess') : t('captchaDesc')}
              </Text>

              <View style={styles.sliderTrackWrapper}>
                <View style={styles.track}>
                  <Animated.View
                    style={[
                      styles.trackFill,
                      {
                        width: pan.interpolate({
                          inputRange: [0, SUCCESS_THRESHOLD],
                          outputRange: [0, SUCCESS_THRESHOLD + SLIDER_WIDTH],
                          extrapolate: 'clamp',
                        }),
                      },
                    ]}
                  />
                  <Text style={styles.trackText}>
                    {captchaVerified ? t('captchaSuccess') : t('dragToVerify')}
                  </Text>
                </View>

                <Animated.View
                  style={[
                    styles.slider,
                    captchaVerified && styles.sliderSuccess,
                    { transform: [{ translateX: pan }] },
                  ]}
                  {...panResponder.panHandlers}
                >
                  {captchaVerified ? (
                    <CheckIcon size={22} color={colors.onPrimary} />
                  ) : (
                    <Text style={styles.sliderArrow}>{'>>'}</Text>
                  )}
                </Animated.View>
              </View>
            </Animated.View>
          )}

          {/* Send Code Button */}
          <TouchableOpacity
            style={[styles.sendBtn, (!email.trim() || showCaptcha) && styles.sendBtnDisabled]}
            activeOpacity={0.8}
            onPress={handleRequestCode}
            disabled={!email.trim() || showCaptcha}
          >
            <Text style={[styles.sendBtnText, (!email.trim() || showCaptcha) && styles.sendBtnTextDisabled]}>
              {t('sendCode')}
            </Text>
          </TouchableOpacity>
        </View>
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
  },
  backBtn: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  header: {
    marginBottom: spacing.xxxl,
  },
  title: {
    ...typography.headlineMedium,
    color: colors.onSurface,
    fontWeight: '600',
  },
  desc: {
    ...typography.bodyLarge,
    color: colors.onSurfaceVariant,
    marginTop: spacing.sm,
  },
  form: {
    gap: spacing.lg,
  },
  inputField: {
    borderWidth: 1,
    borderColor: colors.outline,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: 4,
  },
  inputFieldLocked: {
    borderColor: colors.outlineVariant,
    backgroundColor: colors.surface1,
  },
  emailInput: {
    ...typography.bodyLarge,
    color: colors.onSurface,
    height: 48,
  },
  sendBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: borderRadius.xl,
    alignItems: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: colors.surfaceVariant,
  },
  sendBtnText: {
    ...typography.labelLarge,
    color: colors.onPrimary,
    fontWeight: '600',
  },
  sendBtnTextDisabled: {
    color: colors.onSurfaceVariant,
  },

  /* Inline Captcha */
  captchaInline: {
    backgroundColor: colors.surface1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    gap: spacing.md,
  },
  captchaHint: {
    ...typography.bodySmall,
    color: colors.onSurfaceVariant,
  },

  /* Slider */
  sliderTrackWrapper: {
    width: TRACK_WIDTH,
    height: SLIDER_WIDTH,
    alignSelf: 'center',
  },
  track: {
    width: TRACK_WIDTH,
    height: SLIDER_WIDTH,
    backgroundColor: colors.surfaceVariant,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  trackFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: colors.primaryContainer,
    borderRadius: borderRadius.full,
  },
  trackText: {
    ...typography.bodyMedium,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    fontWeight: '500',
  },
  slider: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: SLIDER_WIDTH,
    height: SLIDER_WIDTH,
    backgroundColor: colors.primary,
    borderRadius: SLIDER_WIDTH / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sliderSuccess: {
    backgroundColor: colors.success,
  },
  sliderArrow: {
    color: colors.onPrimary,
    fontWeight: '700',
    fontSize: 15,
    letterSpacing: -2,
  },
});
