import { TextStyle } from 'react-native';

// Source Han Sans CN weight-to-family mapping
const sourceHan = {
  light: 'SourceHanSansCN-Light',
  regular: 'SourceHanSansCN-Regular',
  medium: 'SourceHanSansCN-Medium',
  bold: 'SourceHanSansCN-Bold',
  heavy: 'SourceHanSansCN-Heavy',
} as const;

export const fontFamily = sourceHan;

export const typography: Record<string, TextStyle> = {
  displayLarge: {
    fontSize: 57,
    lineHeight: 64,
    fontFamily: sourceHan.heavy,
    letterSpacing: -0.25,
  },
  displayMedium: {
    fontSize: 45,
    lineHeight: 52,
    fontFamily: sourceHan.bold,
  },
  displaySmall: {
    fontSize: 36,
    lineHeight: 44,
    fontFamily: sourceHan.bold,
  },
  headlineLarge: {
    fontSize: 32,
    lineHeight: 40,
    fontFamily: sourceHan.bold,
  },
  headlineMedium: {
    fontSize: 28,
    lineHeight: 36,
    fontFamily: sourceHan.bold,
  },
  headlineSmall: {
    fontSize: 24,
    lineHeight: 32,
    fontFamily: sourceHan.bold,
  },
  titleLarge: {
    fontSize: 22,
    lineHeight: 28,
    fontFamily: sourceHan.bold,
  },
  titleMedium: {
    fontSize: 16,
    lineHeight: 24,
    fontFamily: sourceHan.medium,
    letterSpacing: 0,
  },
  titleSmall: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: sourceHan.medium,
    letterSpacing: 0,
  },
  bodyLarge: {
    fontSize: 16,
    lineHeight: 24,
    fontFamily: sourceHan.regular,
    letterSpacing: 0,
  },
  bodyMedium: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: sourceHan.regular,
    letterSpacing: 0,
  },
  bodySmall: {
    fontSize: 12,
    lineHeight: 16,
    fontFamily: sourceHan.regular,
    letterSpacing: 0,
  },
  labelLarge: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: sourceHan.medium,
    letterSpacing: 0,
  },
  labelMedium: {
    fontSize: 12,
    lineHeight: 16,
    fontFamily: sourceHan.medium,
    letterSpacing: 0,
  },
  labelSmall: {
    fontSize: 11,
    lineHeight: 16,
    fontFamily: sourceHan.medium,
    letterSpacing: 0,
  },
};

export type TypographyKey = keyof typeof typography;
