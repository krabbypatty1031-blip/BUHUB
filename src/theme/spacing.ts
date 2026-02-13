// Spacing & Border Radius — Threads-style

export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const borderRadius = {
  xs: 4,
  sm: 8,
  md: 10,
  lg: 12,
  xl: 20,
  full: 9999,
} as const;

// Elevation — zeroed out for flat Threads-style design.
// Kept as tokens so existing ...elevation[N] spreads don't break.
const _flat = {
  shadowColor: 'transparent',
  shadowOffset: { width: 0, height: 0 },
  shadowOpacity: 0,
  shadowRadius: 0,
  elevation: 0,
} as const;

export const elevation = {
  1: _flat,
  2: _flat,
  3: _flat,
  4: _flat,
  5: _flat,
} as const;

// Layout constants
export const layout = {
  navHeight: 56,
  bottomNavHeight: 60,
} as const;
