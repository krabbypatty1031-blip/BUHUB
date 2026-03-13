import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import type { IconProps } from 'phosphor-react-native';
import {
  Book,
  Bridge,
  Bus,
  Lamp,
  Leaf,
  Moon,
  Waves,
} from 'phosphor-react-native';

type BadgePalette = {
  from: string;
  to: string;
  ring: string;
  glyph: string;
  accent: string;
};

type BadgeToken = {
  symbol: string;
  palette: string;
};

const BADGE_PREFIX = 'badge:';

const BADGE_PALETTES: Record<string, BadgePalette> = {
  harbor: { from: '#34556F', to: '#5A7A96', ring: '#DCE6EE', glyph: '#F7F2E8', accent: '#A9C8DA' },
  moss: { from: '#476557', to: '#6F8C79', ring: '#DDE7D9', glyph: '#F8F5EC', accent: '#B9D0B3' },
  brick: { from: '#7A4A43', to: '#A36A5D', ring: '#F0DDD7', glyph: '#FFF7F1', accent: '#E2B6A4' },
  dusk: { from: '#5C4A72', to: '#80709A', ring: '#E4DCF0', glyph: '#FBF8FF', accent: '#C4B5E3' },
  jade: { from: '#2F5F62', to: '#4E888A', ring: '#DBECEB', glyph: '#F4FBFA', accent: '#A7D6D2' },
  slate: { from: '#4F5A68', to: '#768292', ring: '#E1E6EC', glyph: '#FCFCFD', accent: '#C5D0DB' },
};

const BADGE_GLYPHS: Record<string, React.ComponentType<IconProps>> = {
  book: Book,
  bridge: Bridge,
  bus: Bus,
  leaf: Leaf,
  moon: Moon,
  lantern: Lamp,
  wave: Waves,
};

export function isAnonymousBadgeAvatar(value?: string | null): boolean {
  return typeof value === 'string' && value.startsWith(BADGE_PREFIX);
}

function parseBadgeToken(value: string): BadgeToken | null {
  if (!isAnonymousBadgeAvatar(value)) return null;
  const [, symbol, palette] = value.split(':');
  if (!symbol || !palette || !BADGE_PALETTES[palette]) return null;
  return { symbol, palette };
}

export default function AnonymousBadgeAvatar({
  token,
  size,
}: {
  token: string;
  size: number;
}) {
  const parsed = parseBadgeToken(token);
  if (!parsed) return null;

  const palette = BADGE_PALETTES[parsed.palette];
  const Glyph = BADGE_GLYPHS[parsed.symbol] ?? Book;
  const iconBoxSize = size * 0.56;
  const iconSize = size * 0.38;
  const iconOffset = (size - iconBoxSize) / 2;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Defs>
          <LinearGradient id={`badgeGradient-${parsed.palette}`} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={palette.from} />
            <Stop offset="1" stopColor={palette.to} />
          </LinearGradient>
        </Defs>

        <Circle cx={size / 2} cy={size / 2} r={size / 2 - 1} fill={`url(#badgeGradient-${parsed.palette})`} />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={size / 2 - 2.2}
          stroke={palette.ring}
          strokeOpacity={0.72}
          strokeWidth={1.4}
          fill="none"
        />
        <Circle cx={size * 0.74} cy={size * 0.28} r={size * 0.065} fill={palette.accent} opacity={0.92} />
        <Rect
          x={iconOffset}
          y={iconOffset}
          width={iconBoxSize}
          height={iconBoxSize}
          rx={iconBoxSize * 0.28}
          fill="rgba(255,255,255,0.08)"
        />
      </Svg>

      <View style={styles.iconOverlay} pointerEvents="none">
        <Glyph size={iconSize} color={palette.glyph} weight="regular" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  iconOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
