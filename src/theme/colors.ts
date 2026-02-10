// Threads-style Monochrome Theme
// Primary: #000000 (Black), Neutral grays for hierarchy

export const colors = {
  // Primary (Black)
  primary: '#000000',
  onPrimary: '#FFFFFF',
  primaryContainer: '#F0F0F0',
  onPrimaryContainer: '#000000',

  // Secondary (Neutral Gray)
  secondary: '#737373',
  onSecondary: '#FFFFFF',
  secondaryContainer: '#F5F5F5',
  onSecondaryContainer: '#1A1A1A',

  // Tertiary (Neutral Gray, unified with secondary)
  tertiary: '#737373',
  onTertiary: '#FFFFFF',
  tertiaryContainer: '#FAFAFA',
  onTertiaryContainer: '#1A1A1A',

  // Error
  error: '#ED4956',
  onError: '#FFFFFF',
  errorContainer: '#FEE2E2',
  onErrorContainer: '#7F1D1D',

  // Background & Surface (Pure White)
  background: '#FFFFFF',
  onBackground: '#000000',
  surface: '#FFFFFF',
  onSurface: '#000000',
  surfaceVariant: '#F5F5F5',
  onSurfaceVariant: '#999999',

  // Outline (Threads-style divider)
  outline: '#C7C7CC',
  outlineVariant: '#EFEFEF',

  // Surface Levels (Pure neutral gray)
  surface1: '#FAFAFA',
  surface2: '#F5F5F5',
  surface3: '#EEEEEE',
  surface4: '#E8E8E8',
  surface5: '#E0E0E0',

  // Gender Colors (preserved)
  genderMale: '#1E40AF',
  genderFemale: '#E91E8C',
  genderOther: '#8E8E8E',

  // Status Colors
  success: '#22C55E',
  warning: '#F59E0B',
  info: '#000000',

  // Accent / CTA (Black, unified with primary)
  accent: '#000000',
  onAccent: '#FFFFFF',
  accentContainer: '#F0F0F0',
  onAccentContainer: '#000000',

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

// Function card themes (monochrome)
export const functionCardThemes = {
  blue: { cardBg: '#F5F5F5', iconBg: '#E8E8E8', iconColor: '#000000', textColor: '#000000' },
  lemon: { cardBg: '#F5F5F5', iconBg: '#E8E8E8', iconColor: '#666666', textColor: '#333333' },
} as const;

// Share button themes (monochrome)
export const shareActionThemes = {
  blue: { bg: '#F0F0F0', icon: '#000000' },
  lemon: { bg: '#F0F0F0', icon: '#666666' },
} as const;
