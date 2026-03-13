export interface DefaultAvatarDef {
  id: string;
  bg: string;
  gender?: 'male' | 'female';
}

export const CURATED_DEFAULT_AVATARS: DefaultAvatarDef[] = [
  { id: 'Harbour', bg: '#C9D8E6' },
  { id: 'Beacon', bg: '#F1D7C5', gender: 'male' },
  { id: 'Willow', bg: '#CFE4D6', gender: 'female' },
  { id: 'Atlas', bg: '#D7D0EA', gender: 'male' },
  { id: 'Sora', bg: '#D5E8F6', gender: 'female' },
  { id: 'Juniper', bg: '#D6E2C3' },
  { id: 'Tide', bg: '#D3DCEB', gender: 'male' },
  { id: 'Nova', bg: '#E8D2DE', gender: 'female' },
  { id: 'Cedar', bg: '#D9E4DE' },
  { id: 'Marlow', bg: '#E9DCCB', gender: 'male' },
  { id: 'Aster', bg: '#E3DAF0', gender: 'female' },
  { id: 'Vale', bg: '#D7E6E1' },
];

export const LEGACY_DEFAULT_AVATARS: DefaultAvatarDef[] = [
  { id: 'Luna', bg: '#b6e3f4', gender: 'female' },
  { id: 'Felix', bg: '#c0aede', gender: 'male' },
  { id: 'Mia', bg: '#ffd5dc', gender: 'female' },
  { id: 'Leo', bg: '#ffdfbf', gender: 'male' },
  { id: 'Nala', bg: '#d1d4f9', gender: 'female' },
  { id: 'Rocky', bg: '#b6e3f4', gender: 'male' },
  { id: 'Coco', bg: '#ffd5dc' },
  { id: 'Max', bg: '#c0aede', gender: 'male' },
  { id: 'Bella', bg: '#ffdfbf', gender: 'female' },
  { id: 'Finn', bg: '#d1d4f9', gender: 'male' },
  { id: 'Aria', bg: '#b6e3f4', gender: 'female' },
  { id: 'Sage', bg: '#c0aede' },
];

export const ALL_DEFAULT_AVATARS: DefaultAvatarDef[] = [
  ...CURATED_DEFAULT_AVATARS,
  ...LEGACY_DEFAULT_AVATARS,
];

export const DEFAULT_AVATAR_IDS = new Set(ALL_DEFAULT_AVATARS.map((avatar) => avatar.id));

export function getDefaultAvatarDef(id: string): DefaultAvatarDef | undefined {
  return ALL_DEFAULT_AVATARS.find((avatar) => avatar.id === id);
}
