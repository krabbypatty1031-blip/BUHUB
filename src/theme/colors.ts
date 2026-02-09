// Deep Blue + Lemon Yellow Theme
// Primary: #1E40AF (Deep Blue), Accent: #FDD835 (Lemon Yellow)

export const colors = {
  // Primary (Deep Blue)
  primary: '#1E40AF',
  onPrimary: '#FFFFFF',
  primaryContainer: '#DBEAFE',
  onPrimaryContainer: '#1E3A8A',

  // Secondary (Neutral Gray)
  secondary: '#6B7280',
  onSecondary: '#FFFFFF',
  secondaryContainer: '#F3F4F6',
  onSecondaryContainer: '#1F2937',

  // Tertiary (Neutral Gray, unified with secondary)
  tertiary: '#6B7280',
  onTertiary: '#FFFFFF',
  tertiaryContainer: '#F9FAFB',
  onTertiaryContainer: '#1F2937',

  // Error (Instagram Red)
  error: '#ED4956',
  onError: '#FFFFFF',
  errorContainer: '#FEE2E2',
  onErrorContainer: '#7F1D1D',

  // Background & Surface (Pure White)
  background: '#FFFFFF',
  onBackground: '#262626',
  surface: '#FFFFFF',
  onSurface: '#262626',
  surfaceVariant: '#F3F4F6',
  onSurfaceVariant: '#8E8E8E',

  // Outline (Neutral, no tint)
  outline: '#C7C7CC',
  outlineVariant: '#EFEFEF',

  // Surface Levels (Pure neutral gray, no purple tint)
  surface1: '#FAFAFA',
  surface2: '#F5F5F5',
  surface3: '#EEEEEE',
  surface4: '#E8E8E8',
  surface5: '#E0E0E0',

  // Gender Colors
  genderMale: '#1E40AF',
  genderFemale: '#E91E8C',
  genderOther: '#8E8E8E',

  // Status Colors
  success: '#22C55E',
  warning: '#F59E0B',
  info: '#1E40AF',

  // Accent / CTA (Lemon Yellow)
  accent: '#FDD835',
  onAccent: '#262626',
  accentContainer: '#FFF9C4',
  onAccentContainer: '#5D4E00',

  // Scrim (modal overlay)
  scrim: 'rgba(0,0,0,0.4)',
  scrimLight: 'rgba(0,0,0,0.08)',
  scrimHeavy: 'rgba(0,0,0,0.55)',

  // Additional
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
} as const;

export type ColorKey = keyof typeof colors;

// Function card themes (blue + lemon, replacing 6 color schemes)
export const functionCardThemes = {
  blue: { cardBg: '#EBF5FF', iconBg: '#DBEAFE', iconColor: '#1E40AF', textColor: '#1E3A5F' },
  lemon: { cardBg: '#FFFDE7', iconBg: '#FFF9C4', iconColor: '#F9A825', textColor: '#5D4E00' },
} as const;

// Share button themes
export const shareActionThemes = {
  blue: { bg: '#DBEAFE', icon: '#1E40AF' },
  lemon: { bg: '#FFF9C4', icon: '#F9A825' },
} as const;
