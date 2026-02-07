// Material Design 3 Color System - Purple Theme
// Extracted from styles.css :root variables

export const colors = {
  // Primary
  primary: '#6750A4',
  onPrimary: '#FFFFFF',
  primaryContainer: '#EADDFF',
  onPrimaryContainer: '#21005D',

  // Secondary
  secondary: '#625B71',
  onSecondary: '#FFFFFF',
  secondaryContainer: '#E8DEF8',
  onSecondaryContainer: '#1D192B',

  // Tertiary
  tertiary: '#7D5260',
  onTertiary: '#FFFFFF',
  tertiaryContainer: '#FFD8E4',
  onTertiaryContainer: '#31111D',

  // Error
  error: '#B3261E',
  onError: '#FFFFFF',
  errorContainer: '#F9DEDC',
  onErrorContainer: '#410E0B',

  // Background & Surface
  background: '#FFFBFE',
  onBackground: '#1C1B1F',
  surface: '#FFFBFE',
  onSurface: '#1C1B1F',
  surfaceVariant: '#E7E0EC',
  onSurfaceVariant: '#49454F',

  // Outline
  outline: '#79747E',
  outlineVariant: '#CAC4D0',

  // Surface Levels (MD3 Elevation Tint)
  surface1: '#F7F2FA',
  surface2: '#F3EDF7',
  surface3: '#EFE9F4',
  surface4: '#EDE7F2',
  surface5: '#EBE5F0',

  // Gender Colors
  genderMale: '#4A90D9',
  genderFemale: '#E91E8C',
  genderOther: '#9C27B0',

  // Status Colors
  success: '#2E7D32',
  warning: '#F57C00',
  info: '#0288D1',

  // Accent / CTA (for prominent actions like "Join", "Create", "Submit")
  accent: '#22C55E',
  onAccent: '#FFFFFF',
  accentContainer: '#DCFCE7',
  onAccentContainer: '#14532D',

  // Scrim (modal overlay)
  scrim: 'rgba(0,0,0,0.45)',

  // Additional
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
} as const;

export type ColorKey = keyof typeof colors;
