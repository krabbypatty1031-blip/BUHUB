import React from 'react';
import { View, TouchableOpacity, StyleSheet, Text } from 'react-native';
import Svg, { Circle, Path, Ellipse, Line } from 'react-native-svg';
import { colors, spacing, typography } from '../../theme';
import type { Gender } from '../../types/common';

// ─── Avatar Definitions ─────────────────────────────────────

export interface DefaultAvatarDef {
  id: string;
  bg: string;
  gender?: 'male' | 'female';
}

export const DEFAULT_AVATARS: DefaultAvatarDef[] = [
  // Male-associated
  { id: 'boy_1', bg: '#5B9BD5', gender: 'male' },
  { id: 'boy_2', bg: '#6BBF8A', gender: 'male' },
  { id: 'boy_3', bg: '#7E8CC4', gender: 'male' },
  // Female-associated
  { id: 'girl_1', bg: '#F28CAD', gender: 'female' },
  { id: 'girl_2', bg: '#C490D1', gender: 'female' },
  { id: 'girl_3', bg: '#F4B183', gender: 'female' },
  // Neutral (animals)
  { id: 'cat', bg: '#FFB74D' },
  { id: 'bear', bg: '#A1887F' },
  { id: 'bunny', bg: '#EF9A9A' },
  { id: 'penguin', bg: '#78909C' },
  { id: 'dog', bg: '#BCAAA4' },
  { id: 'fox', bg: '#FF8A65' },
];

export function getAvatarDef(id: string): DefaultAvatarDef | undefined {
  return DEFAULT_AVATARS.find((a) => a.id === id);
}

/** Pick a gender-appropriate auto-suggestion avatar */
export function getAutoAvatar(gender: Gender): string {
  switch (gender) {
    case 'male': return 'boy_1';
    case 'female': return 'girl_1';
    default: return 'cat';
  }
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

// ─── SVG Avatar Renderer (reusable across the app) ──────────

interface DefaultAvatarSvgProps {
  id: string;
  size: number;
}

export function DefaultAvatarSvg({ id, size }: DefaultAvatarSvgProps) {
  const def = getAvatarDef(id);
  if (!def) return null;

  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: def.bg, overflow: 'hidden' }}>
      <Svg width={size} height={size} viewBox="0 0 100 100">
        {renderAvatarSvg(id, def.bg)}
      </Svg>
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

// ─── Picker Component ───────────────────────────────────────

interface DefaultAvatarPickerProps {
  selected: string | null;
  onSelect: (id: string) => void;
  label?: string;
}

function DefaultAvatarPicker({ selected, onSelect, label }: DefaultAvatarPickerProps) {
  return (
    <View style={styles.pickerContainer}>
      {label ? <Text style={styles.pickerLabel}>{label}</Text> : null}
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
    </View>
  );
}

export default React.memo(DefaultAvatarPicker);

// ─── SVG Rendering ──────────────────────────────────────────

function renderAvatarSvg(id: string, bg: string) {
  switch (id) {
    case 'boy_1': return <Boy1 bg={bg} />;
    case 'boy_2': return <Boy2 bg={bg} />;
    case 'boy_3': return <Boy3 bg={bg} />;
    case 'girl_1': return <Girl1 bg={bg} />;
    case 'girl_2': return <Girl2 bg={bg} />;
    case 'girl_3': return <Girl3 bg={bg} />;
    case 'cat': return <CatAvatar bg={bg} />;
    case 'bear': return <BearAvatar bg={bg} />;
    case 'bunny': return <BunnyAvatar bg={bg} />;
    case 'penguin': return <PenguinAvatar bg={bg} />;
    case 'dog': return <DogAvatar bg={bg} />;
    case 'fox': return <FoxAvatar bg={bg} />;
    default: return null;
  }
}

// ─── Human Avatars ──────────────────────────────────────────

/** Boy 1: Clean short hair */
const Boy1 = ({ bg }: { bg: string }) => (
  <>
    {/* Body / shoulders */}
    <Path d="M20 100 C20 80 34 70 50 67 C66 70 80 80 80 100Z" fill="white" />
    {/* Head */}
    <Circle cx={50} cy={42} r={22} fill="white" />
    {/* Hair - short fringe */}
    <Path d="M30 36 Q30 20 50 18 Q70 20 70 36 Q66 26 50 24 Q34 26 30 36Z" fill="white" />
    {/* Eyes */}
    <Circle cx={42} cy={42} r={2.5} fill={bg} />
    <Circle cx={58} cy={42} r={2.5} fill={bg} />
    {/* Smile */}
    <Path d="M43 51 Q50 57 57 51" stroke={bg} strokeWidth={2} fill="none" strokeLinecap="round" />
    {/* Blush */}
    <Circle cx={35} cy={48} r={4} fill="rgba(255,200,200,0.35)" />
    <Circle cx={65} cy={48} r={4} fill="rgba(255,200,200,0.35)" />
  </>
);

/** Boy 2: Spiky/messy hair */
const Boy2 = ({ bg }: { bg: string }) => (
  <>
    <Path d="M20 100 C20 80 34 70 50 67 C66 70 80 80 80 100Z" fill="white" />
    <Circle cx={50} cy={42} r={22} fill="white" />
    {/* Spiky hair points */}
    <Path d="M32 30 L36 12 L42 26 L50 8 L58 26 L64 12 L68 30" fill="white" />
    <Path d="M30 36 Q30 22 50 20 Q70 22 70 36" fill="white" />
    {/* Eyes */}
    <Circle cx={42} cy={42} r={2.5} fill={bg} />
    <Circle cx={58} cy={42} r={2.5} fill={bg} />
    {/* Grin */}
    <Path d="M42 51 Q50 58 58 51" stroke={bg} strokeWidth={2} fill="none" strokeLinecap="round" />
    <Circle cx={35} cy={48} r={4} fill="rgba(255,200,200,0.35)" />
    <Circle cx={65} cy={48} r={4} fill="rgba(255,200,200,0.35)" />
  </>
);

/** Boy 3: Glasses boy */
const Boy3 = ({ bg }: { bg: string }) => (
  <>
    <Path d="M20 100 C20 80 34 70 50 67 C66 70 80 80 80 100Z" fill="white" />
    <Circle cx={50} cy={42} r={22} fill="white" />
    {/* Short neat hair */}
    <Path d="M30 36 Q30 20 50 18 Q70 20 70 36 Q66 26 50 24 Q34 26 30 36Z" fill="white" />
    {/* Glasses */}
    <Circle cx={42} cy={41} r={7} stroke={bg} strokeWidth={2.2} fill="none" />
    <Circle cx={58} cy={41} r={7} stroke={bg} strokeWidth={2.2} fill="none" />
    <Line x1={49} y1={41} x2={51} y2={41} stroke={bg} strokeWidth={2} />
    <Line x1={28} y1={40} x2={35} y2={40} stroke={bg} strokeWidth={1.5} />
    <Line x1={65} y1={40} x2={72} y2={40} stroke={bg} strokeWidth={1.5} />
    {/* Eyes (smaller inside glasses) */}
    <Circle cx={42} cy={42} r={1.8} fill={bg} />
    <Circle cx={58} cy={42} r={1.8} fill={bg} />
    {/* Smile */}
    <Path d="M44 51 Q50 56 56 51" stroke={bg} strokeWidth={1.8} fill="none" strokeLinecap="round" />
  </>
);

/** Girl 1: Long straight hair */
const Girl1 = ({ bg }: { bg: string }) => (
  <>
    <Path d="M20 100 C20 80 34 70 50 67 C66 70 80 80 80 100Z" fill="white" />
    <Circle cx={50} cy={42} r={22} fill="white" />
    {/* Long hair - left */}
    <Path d="M28 34 C26 34 24 50 24 68 Q24 76 28 76 L32 76 C32 58 32 42 30 34Z" fill="white" />
    {/* Long hair - right */}
    <Path d="M72 34 C74 34 76 50 76 68 Q76 76 72 76 L68 76 C68 58 68 42 70 34Z" fill="white" />
    {/* Hair top */}
    <Path d="M28 38 Q28 18 50 16 Q72 18 72 38 Q68 24 50 22 Q32 24 28 38Z" fill="white" />
    {/* Eyes */}
    <Circle cx={42} cy={42} r={2.5} fill={bg} />
    <Circle cx={58} cy={42} r={2.5} fill={bg} />
    {/* Smile */}
    <Path d="M44 51 Q50 56 56 51" stroke={bg} strokeWidth={2} fill="none" strokeLinecap="round" />
    {/* Blush */}
    <Circle cx={35} cy={48} r={4} fill="rgba(255,220,220,0.4)" />
    <Circle cx={65} cy={48} r={4} fill="rgba(255,220,220,0.4)" />
  </>
);

/** Girl 2: Twin tails / pigtails */
const Girl2 = ({ bg }: { bg: string }) => (
  <>
    <Path d="M20 100 C20 80 34 70 50 67 C66 70 80 80 80 100Z" fill="white" />
    <Circle cx={50} cy={42} r={22} fill="white" />
    {/* Twin tails */}
    <Ellipse cx={20} cy={42} rx={10} ry={16} fill="white" />
    <Ellipse cx={80} cy={42} rx={10} ry={16} fill="white" />
    {/* Hair top */}
    <Path d="M28 38 Q28 18 50 16 Q72 18 72 38 Q68 24 50 22 Q32 24 28 38Z" fill="white" />
    {/* Hair tie dots */}
    <Circle cx={28} cy={34} r={3} fill={bg} opacity={0.3} />
    <Circle cx={72} cy={34} r={3} fill={bg} opacity={0.3} />
    {/* Eyes */}
    <Circle cx={42} cy={42} r={2.5} fill={bg} />
    <Circle cx={58} cy={42} r={2.5} fill={bg} />
    {/* Smile */}
    <Path d="M44 51 Q50 56 56 51" stroke={bg} strokeWidth={2} fill="none" strokeLinecap="round" />
    <Circle cx={35} cy={48} r={4} fill="rgba(255,220,220,0.4)" />
    <Circle cx={65} cy={48} r={4} fill="rgba(255,220,220,0.4)" />
  </>
);

/** Girl 3: Top bun */
const Girl3 = ({ bg }: { bg: string }) => (
  <>
    <Path d="M20 100 C20 80 34 70 50 67 C66 70 80 80 80 100Z" fill="white" />
    <Circle cx={50} cy={42} r={22} fill="white" />
    {/* Bun on top */}
    <Circle cx={50} cy={14} r={10} fill="white" />
    {/* Hair top connecting bun to head */}
    <Path d="M28 38 Q28 18 50 16 Q72 18 72 38 Q68 24 50 22 Q32 24 28 38Z" fill="white" />
    {/* Eyes */}
    <Circle cx={42} cy={42} r={2.5} fill={bg} />
    <Circle cx={58} cy={42} r={2.5} fill={bg} />
    {/* Smile */}
    <Path d="M44 51 Q50 56 56 51" stroke={bg} strokeWidth={2} fill="none" strokeLinecap="round" />
    <Circle cx={35} cy={48} r={4} fill="rgba(255,220,220,0.4)" />
    <Circle cx={65} cy={48} r={4} fill="rgba(255,220,220,0.4)" />
  </>
);

// ─── Animal Avatars ─────────────────────────────────────────

/** Cat */
const CatAvatar = ({ bg }: { bg: string }) => (
  <>
    {/* Face */}
    <Circle cx={50} cy={54} r={28} fill="white" />
    {/* Left ear */}
    <Path d="M26 36 L18 10 L42 28Z" fill="white" />
    {/* Right ear */}
    <Path d="M74 36 L82 10 L58 28Z" fill="white" />
    {/* Inner ears */}
    <Path d="M28 32 L24 16 L38 28Z" fill={bg} opacity={0.25} />
    <Path d="M72 32 L76 16 L62 28Z" fill={bg} opacity={0.25} />
    {/* Eyes */}
    <Ellipse cx={39} cy={50} rx={3} ry={3.5} fill={bg} />
    <Ellipse cx={61} cy={50} rx={3} ry={3.5} fill={bg} />
    {/* Nose */}
    <Path d="M48 58 L50 61 L52 58Z" fill={bg} />
    {/* Cat mouth (w) */}
    <Path d="M44 63 Q47 60 50 63 Q53 60 56 63" stroke={bg} strokeWidth={1.5} fill="none" strokeLinecap="round" />
    {/* Whiskers */}
    <Line x1={16} y1={54} x2={34} y2={56} stroke={bg} strokeWidth={1.2} strokeLinecap="round" />
    <Line x1={16} y1={60} x2={34} y2={60} stroke={bg} strokeWidth={1.2} strokeLinecap="round" />
    <Line x1={66} y1={56} x2={84} y2={54} stroke={bg} strokeWidth={1.2} strokeLinecap="round" />
    <Line x1={66} y1={60} x2={84} y2={60} stroke={bg} strokeWidth={1.2} strokeLinecap="round" />
  </>
);

/** Bear */
const BearAvatar = ({ bg }: { bg: string }) => (
  <>
    {/* Ears */}
    <Circle cx={24} cy={28} r={12} fill="white" />
    <Circle cx={76} cy={28} r={12} fill="white" />
    {/* Inner ears */}
    <Circle cx={24} cy={28} r={6} fill={bg} opacity={0.25} />
    <Circle cx={76} cy={28} r={6} fill={bg} opacity={0.25} />
    {/* Face */}
    <Circle cx={50} cy={54} r={30} fill="white" />
    {/* Eyes */}
    <Circle cx={39} cy={48} r={3} fill={bg} />
    <Circle cx={61} cy={48} r={3} fill={bg} />
    {/* Nose */}
    <Ellipse cx={50} cy={57} rx={5} ry={3.5} fill={bg} />
    {/* Mouth */}
    <Path d="M44 64 Q50 70 56 64" stroke={bg} strokeWidth={1.8} fill="none" strokeLinecap="round" />
  </>
);

/** Bunny */
const BunnyAvatar = ({ bg }: { bg: string }) => (
  <>
    {/* Long ears */}
    <Ellipse cx={36} cy={20} rx={9} ry={22} fill="white" />
    <Ellipse cx={64} cy={20} rx={9} ry={22} fill="white" />
    {/* Inner ears */}
    <Ellipse cx={36} cy={20} rx={4.5} ry={14} fill={bg} opacity={0.2} />
    <Ellipse cx={64} cy={20} rx={4.5} ry={14} fill={bg} opacity={0.2} />
    {/* Face */}
    <Circle cx={50} cy={58} r={28} fill="white" />
    {/* Eyes */}
    <Circle cx={40} cy={54} r={3} fill={bg} />
    <Circle cx={60} cy={54} r={3} fill={bg} />
    {/* Nose */}
    <Ellipse cx={50} cy={62} rx={3} ry={2.2} fill={bg} />
    {/* Mouth */}
    <Path d="M46 67 Q50 71 54 67" stroke={bg} strokeWidth={1.5} fill="none" strokeLinecap="round" />
    {/* Blush */}
    <Circle cx={34} cy={62} r={4.5} fill={bg} opacity={0.15} />
    <Circle cx={66} cy={62} r={4.5} fill={bg} opacity={0.15} />
  </>
);

/** Penguin */
const PenguinAvatar = ({ bg }: { bg: string }) => (
  <>
    {/* Body */}
    <Ellipse cx={50} cy={56} rx={30} ry={36} fill="white" />
    {/* Belly */}
    <Ellipse cx={50} cy={64} rx={18} ry={22} fill={bg} opacity={0.12} />
    {/* Eyes */}
    <Circle cx={39} cy={44} r={3.5} fill={bg} />
    <Circle cx={61} cy={44} r={3.5} fill={bg} />
    {/* Eye highlights */}
    <Circle cx={40.5} cy={43} r={1.2} fill="white" />
    <Circle cx={62.5} cy={43} r={1.2} fill="white" />
    {/* Beak */}
    <Path d="M45 53 L50 60 L55 53Z" fill={bg} opacity={0.6} />
    {/* Feet */}
    <Path d="M36 90 L32 96 L42 96Z" fill={bg} opacity={0.4} />
    <Path d="M64 90 L58 96 L68 96Z" fill={bg} opacity={0.4} />
  </>
);

/** Dog / Puppy */
const DogAvatar = ({ bg }: { bg: string }) => (
  <>
    {/* Floppy ears */}
    <Ellipse cx={22} cy={46} rx={12} ry={20} fill="white" />
    <Ellipse cx={78} cy={46} rx={12} ry={20} fill="white" />
    {/* Face */}
    <Circle cx={50} cy={52} r={28} fill="white" />
    {/* Eyes */}
    <Circle cx={40} cy={48} r={3} fill={bg} />
    <Circle cx={60} cy={48} r={3} fill={bg} />
    {/* Nose */}
    <Ellipse cx={50} cy={57} rx={5} ry={4} fill={bg} />
    {/* Mouth */}
    <Path d="M50 61 L50 65" stroke={bg} strokeWidth={1.8} strokeLinecap="round" />
    <Path d="M43 65 Q50 71 57 65" stroke={bg} strokeWidth={1.8} fill="none" strokeLinecap="round" />
    {/* Tongue */}
    <Ellipse cx={54} cy={70} rx={3.5} ry={4.5} fill={bg} opacity={0.2} />
  </>
);

/** Fox */
const FoxAvatar = ({ bg }: { bg: string }) => (
  <>
    {/* Face - slightly pointed */}
    <Path
      d="M50 82 C32 82 20 66 20 50 C20 34 34 24 50 24 C66 24 80 34 80 50 C80 66 68 82 50 82Z"
      fill="white"
    />
    {/* Left ear */}
    <Path d="M24 34 L14 6 L42 22Z" fill="white" />
    {/* Right ear */}
    <Path d="M76 34 L86 6 L58 22Z" fill="white" />
    {/* Inner ears */}
    <Path d="M26 30 L22 14 L38 24Z" fill={bg} opacity={0.25} />
    <Path d="M74 30 L78 14 L62 24Z" fill={bg} opacity={0.25} />
    {/* Eyes */}
    <Ellipse cx={38} cy={46} rx={3} ry={3.5} fill={bg} />
    <Ellipse cx={62} cy={46} rx={3} ry={3.5} fill={bg} />
    {/* Nose */}
    <Circle cx={50} cy={58} r={3.5} fill={bg} />
    {/* Mouth */}
    <Path d="M44 64 Q50 69 56 64" stroke={bg} strokeWidth={1.5} fill="none" strokeLinecap="round" />
    {/* Cheek marks */}
    <Circle cx={30} cy={56} r={4} fill={bg} opacity={0.12} />
    <Circle cx={70} cy={56} r={4} fill={bg} opacity={0.12} />
  </>
);

// ─── Styles ─────────────────────────────────────────────────

const styles = StyleSheet.create({
  pickerContainer: {
    marginTop: spacing.lg,
  },
  pickerLabel: {
    ...typography.labelLarge,
    color: colors.onSurfaceVariant,
    marginBottom: spacing.md,
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
