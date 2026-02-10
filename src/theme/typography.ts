import { TextStyle } from 'react-native';

// Font families for three languages
export const fontFamily = {
  tc: 'NotoSansTC',
  sc: 'NotoSansSC',
  en: 'Inter',
} as const;

// Inter weight-to-family mapping (custom fonts require explicit family per weight)
const inter = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
} as const;

// Typography scale — Instagram-style: Inter font, tight spacing, strong weight contrast
export const typography: Record<string, TextStyle> = {
  displayLarge: {
    fontSize: 57,
    lineHeight: 64,
    fontFamily: inter.bold,
    letterSpacing: -0.25,
  },
  displayMedium: {
    fontSize: 45,
    lineHeight: 52,
    fontFamily: inter.bold,
  },
  displaySmall: {
    fontSize: 36,
    lineHeight: 44,
    fontFamily: inter.bold,
  },
  headlineLarge: {
    fontSize: 32,
    lineHeight: 40,
    fontFamily: inter.bold,
  },
  headlineMedium: {
    fontSize: 28,
    lineHeight: 36,
    fontFamily: inter.bold,
  },
  headlineSmall: {
    fontSize: 24,
    lineHeight: 32,
    fontFamily: inter.bold,
  },
  titleLarge: {
    fontSize: 22,
    lineHeight: 28,
    fontFamily: inter.bold,
  },
  titleMedium: {
    fontSize: 16,
    lineHeight: 24,
    fontFamily: inter.semibold,
    letterSpacing: 0,
  },
  titleSmall: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: inter.semibold,
    letterSpacing: 0,
  },
  bodyLarge: {
    fontSize: 16,
    lineHeight: 24,
    fontFamily: inter.regular,
    letterSpacing: 0,
  },
  bodyMedium: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: inter.regular,
    letterSpacing: 0,
  },
  bodySmall: {
    fontSize: 12,
    lineHeight: 16,
    fontFamily: inter.regular,
    letterSpacing: 0,
  },
  labelLarge: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: inter.semibold,
    letterSpacing: 0,
  },
  labelMedium: {
    fontSize: 12,
    lineHeight: 16,
    fontFamily: inter.semibold,
    letterSpacing: 0,
  },
  labelSmall: {
    fontSize: 11,
    lineHeight: 16,
    fontFamily: inter.semibold,
    letterSpacing: 0,
  },
};

export type TypographyKey = keyof typeof typography;
