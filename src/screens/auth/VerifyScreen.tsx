import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '../../types/navigation';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { BackIcon } from '../../components/common/icons';

type Props = NativeStackScreenProps<AuthStackParamList, 'Verify'>;

const CODE_LENGTH = 6;

export default function VerifyScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [code, setCode] = useState<string[]>(Array(CODE_LENGTH).fill(''));
  const [countdown, setCountdown] = useState(0);
  const inputRefs = useRef<(TextInput | null)[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const handleSendCode = useCallback(() => {
    if (!email.trim()) return;
    setCodeSent(true);
    setCountdown(60);
    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [email]);

  const handleCodeChange = useCallback(
    (text: string, index: number) => {
      const newCode = [...code];
      newCode[index] = text;
      setCode(newCode);

      if (text.length === 1 && index < CODE_LENGTH - 1) {
        inputRefs.current[index + 1]?.focus();
      }
    },
    [code]
  );

  const handleCodeKeyPress = useCallback(
    (key: string, index: number) => {
      if (key === 'Backspace' && code[index] === '' && index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
    },
    [code]
  );

  const handleVerify = useCallback(() => {
    navigation.navigate('ProfileSetup');
  }, [navigation]);

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
          <Text style={styles.title}>{t('verifyTitle')}</Text>
          <Text style={styles.desc}>{t('verifyDesc')}</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputField}>
            <TextInput
              style={styles.emailInput}
              placeholder={t('emailPlaceholder')}
              placeholderTextColor={colors.onSurfaceVariant}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <TouchableOpacity
            style={[styles.sendBtn, !email.trim() && styles.sendBtnDisabled]}
            activeOpacity={0.8}
            onPress={handleSendCode}
            disabled={!email.trim()}
          >
            <Text style={[styles.sendBtnText, !email.trim() && styles.sendBtnTextDisabled]}>
              {t('sendCode')}
            </Text>
          </TouchableOpacity>

          {codeSent && (
            <View style={styles.codeSection}>
              <View style={styles.codeInputs}>
                {Array.from({ length: CODE_LENGTH }).map((_, i) => (
                  <TextInput
                    key={i}
                    ref={(ref) => {
                      inputRefs.current[i] = ref;
                    }}
                    style={[
                      styles.codeInput,
                      code[i] !== '' && styles.codeInputFilled,
                    ]}
                    maxLength={1}
                    keyboardType="number-pad"
                    value={code[i]}
                    onChangeText={(text) => handleCodeChange(text, i)}
                    onKeyPress={({ nativeEvent }) =>
                      handleCodeKeyPress(nativeEvent.key, i)
                    }
                  />
                ))}
              </View>

              <TouchableOpacity
                style={styles.verifyBtn}
                activeOpacity={0.8}
                onPress={handleVerify}
              >
                <Text style={styles.verifyBtnText}>{t('verify')}</Text>
              </TouchableOpacity>

              <View style={styles.resendRow}>
                <Text style={styles.resendText}>{t('resendCode')} </Text>
                <Text style={styles.resendLink}>
                  {countdown > 0 ? `${countdown}s` : t('resendCode')}
                </Text>
              </View>
            </View>
          )}
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
  emailInput: {
    ...typography.bodyLarge,
    color: colors.onSurface,
    height: 48,
  },
  sendBtn: {
    backgroundColor: colors.secondaryContainer,
    paddingVertical: 14,
    borderRadius: borderRadius.xl,
    alignItems: 'center',
  },
  sendBtnDisabled: {
    opacity: 0.5,
  },
  sendBtnText: {
    ...typography.labelLarge,
    color: colors.onSecondaryContainer,
  },
  sendBtnTextDisabled: {
    color: colors.onSurfaceVariant,
  },
  codeSection: {
    marginTop: spacing.xxl,
    gap: spacing.xxl,
  },
  codeInputs: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  codeInput: {
    width: 48,
    height: 56,
    borderWidth: 1,
    borderColor: colors.outline,
    borderRadius: borderRadius.sm,
    textAlign: 'center',
    fontSize: 24,
    fontWeight: '600',
    color: colors.onSurface,
  },
  codeInputFilled: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryContainer + '20',
  },
  verifyBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: borderRadius.xl,
    alignItems: 'center',
  },
  verifyBtnText: {
    ...typography.labelLarge,
    color: colors.onPrimary,
  },
  resendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  resendText: {
    ...typography.bodySmall,
    color: colors.onSurfaceVariant,
  },
  resendLink: {
    ...typography.bodySmall,
    color: colors.primary,
    fontWeight: '500',
  },
});
