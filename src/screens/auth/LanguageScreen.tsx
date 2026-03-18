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

const LANGUAGE_OPTIONS: Array<{
  value: Language;
  labelKey: 'traditionalChinese' | 'simplifiedChinese' | 'english';
}> = [
  { value: 'tc', labelKey: 'traditionalChinese' },
  { value: 'sc', labelKey: 'simplifiedChinese' },
  { value: 'en', labelKey: 'english' },
];

type Props = NativeStackScreenProps<AuthStackParamList, 'Language'>;

export default function LanguageScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const setLanguage = useAuthStore((s) => s.setLanguage);
  const currentLanguage = useAuthStore((s) => s.language);
  const [selected, setSelected] = useState<Language>((currentLanguage as Language) || 'tc');

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
          <Text style={styles.subtitle}>{t('selectLanguage')}</Text>
        </View>

        <View style={styles.options}>
          {LANGUAGE_OPTIONS.map((option) => {
            const isSelected = selected === option.value;
            return (
              <TouchableOpacity
                key={option.value}
                style={[styles.option, isSelected && styles.optionSelected]}
                activeOpacity={0.7}
                onPress={() => handleSelect(option.value)}
              >
                <Text style={styles.namePrimary}>{t(option.labelKey)}</Text>
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
    fontFamily: 'SourceHanSansCN-Bold',
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
