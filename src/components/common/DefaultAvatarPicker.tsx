import React, { useState, useCallback } from 'react';
import { View, TouchableOpacity, StyleSheet, Text, LayoutAnimation, Platform, UIManager } from 'react-native';
import { Image as ExpoImage } from 'expo-image';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}
import { colors, spacing, typography, borderRadius } from '../../theme';
import type { Gender } from '../../types/common';
import { ChevronDownIcon } from './icons';

export interface DefaultAvatarDef {
  id: string;
  bg: string;
  gender?: 'male' | 'female';
}

export const DEFAULT_AVATARS: DefaultAvatarDef[] = [
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

export function getAvatarDef(id: string): DefaultAvatarDef | undefined {
  return DEFAULT_AVATARS.find((a) => a.id === id);
}

/** Pick a gender-appropriate auto-suggestion avatar */
export function getAutoAvatar(gender: Gender): string {
  switch (gender) {
    case 'male': return 'Felix';
    case 'female': return 'Luna';
    default: return 'Coco';
  }
}

/** Generate DiceBear Micah avatar URL */
export function getDiceBearUrl(seed: string, size: number, bg?: string): string {
  const bgParam = bg ? `&backgroundColor=${bg.replace('#', '')}` : '';
  return `https://api.dicebear.com/9.x/micah/png?seed=${encodeURIComponent(seed)}&size=${size}${bgParam}`;
}

/** Background color for initial-based avatar by gender */
export function getInitialBgColor(gender?: Gender): string {
  switch (gender) {
    case 'male': return '#5B9BD5';
    case 'female': return '#F28CAD';
    case 'other': return '#6BBF8A';
    case 'secret': return '#9B8EC4';
    default: return '#78909C';
  }
}

interface DefaultAvatarSvgProps {
  id: string;
  size: number;
}

export function DefaultAvatarSvg({ id, size }: DefaultAvatarSvgProps) {
  const def = getAvatarDef(id);
  if (!def) return null;
  const avatarUrl = getDiceBearUrl(id, Math.ceil(size * 2), def.bg);

  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: def.bg, overflow: 'hidden' }}>
      <ExpoImage
        source={avatarUrl}
        style={{ width: size, height: size }}
        contentFit="cover"
        cachePolicy="memory-disk"
        transition={0}
        recyclingKey={avatarUrl}
      />
    </View>
  );
}

/** Render initial-based avatar (fallback) */
export function InitialAvatar({ text, size, gender }: { text: string; size: number; gender?: Gender }) {
  const bg = getInitialBgColor(gender);
  const fontSize = size * 0.42;
  return (
    <View style={[styles.initialContainer, { width: size, height: size, borderRadius: size / 2, backgroundColor: bg }]}>
      <Text style={[styles.initialText, { fontSize }]}>{text.charAt(0).toUpperCase()}</Text>
    </View>
  );
}

interface DefaultAvatarPickerProps {
  selected: string | null;
  onSelect: (id: string) => void;
  label?: string;
}

function DefaultAvatarPicker({ selected, onSelect, label }: DefaultAvatarPickerProps) {
  const [expanded, setExpanded] = useState(false);

  const toggleExpanded = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((prev) => !prev);
  }, []);

  return (
    <View style={styles.pickerContainer}>
      {label ? (
        <TouchableOpacity
          style={styles.dropdownHeader}
          activeOpacity={0.7}
          onPress={toggleExpanded}
        >
          <Text style={styles.pickerLabel}>{label}</Text>
          <View style={[styles.chevronWrapper, expanded && styles.chevronExpanded]}>
            <ChevronDownIcon size={20} color={colors.onSurface} />
          </View>
        </TouchableOpacity>
      ) : null}
      {expanded && (
        <View style={styles.grid}>
          {DEFAULT_AVATARS.map((avatar) => (
            <TouchableOpacity
              key={avatar.id}
              style={[styles.avatarOption, selected === avatar.id && styles.avatarOptionSelected]}
              activeOpacity={0.7}
              onPress={() => onSelect(avatar.id)}
            >
              <DefaultAvatarSvg id={avatar.id} size={52} />
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

export default React.memo(DefaultAvatarPicker);

const styles = StyleSheet.create({
  pickerContainer: {
    marginTop: spacing.lg,
  },
  dropdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
    marginLeft: spacing.lg,
    gap: spacing.xs,
  },
  pickerLabel: {
    ...typography.labelLarge,
    color: colors.onSurface,
  },
  chevronWrapper: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chevronExpanded: {
    transform: [{ rotate: '180deg' }],
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.md,
  },
  avatarOption: {
    borderRadius: 999,
    borderWidth: 2.5,
    borderColor: 'transparent',
    padding: 2,
  },
  avatarOptionSelected: {
    borderColor: colors.primary,
  },
  initialContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  initialText: {
    color: 'white',
    fontWeight: '700',
  },
});
