import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '../../types/navigation';
import { useAuthStore } from '../../store/authStore';
import { changeLanguage } from '../../i18n';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { CheckIcon } from '../../components/common/icons';

type Language = 'tc' | 'sc' | 'en';

// 各语言下的显示名称
const LANGUAGE_LABELS: Record<Language, Record<Language, string>> = {
  tc: { tc: '粵語', sc: '普通話', en: '英文' },
  sc: { tc: '粤语', sc: '普通话', en: '英文' },
  en: { tc: 'Cantonese', sc: 'Mandarin', en: 'English' },
};

// "请选择语言" 各语言版本
const SELECT_LANGUAGE_LABELS: Record<Language, string> = {
  tc: '請選擇語言',
  sc: '请选择语言',
  en: 'Select Language',
};

type Props = NativeStackScreenProps<AuthStackParamList, 'Language'>;

export default function LanguageScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const setLanguage = useAuthStore((s) => s.setLanguage);
  const [selected, setSelected] = useState<Language>('tc');

  const handleSelect = async (lang: Language) => {
    setSelected(lang);
    setLanguage(lang);
    await changeLanguage(lang);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.logoSection}>
          <Text style={styles.logoText}>UHUB</Text>
          <Text style={styles.subtitle}>{SELECT_LANGUAGE_LABELS[selected]}</Text>
        </View>

        <View style={styles.options}>
          {(['tc', 'sc', 'en'] as Language[]).map((lang) => {
            const isSelected = selected === lang;
            const label = LANGUAGE_LABELS[selected][lang];
            return (
              <TouchableOpacity
                key={lang}
                style={[styles.option, isSelected && styles.optionSelected]}
                activeOpacity={0.7}
                onPress={() => handleSelect(lang)}
              >
                <Text style={styles.namePrimary}>{label}</Text>
                {isSelected && (
                  <CheckIcon size={24} color={colors.primary} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.continueBtn}
          activeOpacity={0.8}
          onPress={() => navigation.navigate('Login')}
        >
          <Text style={styles.continueBtnText}>{t('continue')}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  logoSection: {
    alignItems: 'center',
    marginTop: 80,
    marginBottom: 48,
  },
  logoText: {
    fontSize: 26,
    lineHeight: 32,
    color: colors.onSurface,
    fontFamily: 'Poppins_900Black',
    letterSpacing: -0.5,
  },
  subtitle: {
    ...typography.bodyLarge,
    color: colors.onSurfaceVariant,
    marginTop: spacing.sm,
  },
  options: {
    gap: spacing.md,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  optionSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryContainer + '30',
  },
  namePrimary: {
    ...typography.titleMedium,
    color: colors.onSurface,
  },
  footer: {
    padding: spacing.lg,
  },
  continueBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: borderRadius.xl,
    alignItems: 'center',
  },
  continueBtnText: {
    ...typography.labelLarge,
    color: colors.onPrimary,
  },
});
