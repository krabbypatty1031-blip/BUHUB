import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { colors, spacing, borderRadius } from '../../theme';

interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
}

function Chip({ label, selected, onPress }: ChipProps) {
  return (
    <TouchableOpacity
      style={[styles.chip, selected && styles.selected]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={[styles.label, selected && styles.selectedLabel]}>{label}</Text>
    </TouchableOpacity>
  );
}

export default React.memo(Chip);

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface2,
    marginRight: spacing.sm,
    marginBottom: spacing.sm,
    minHeight: 36,
    justifyContent: 'center',
  },
  selected: {
    backgroundColor: colors.primaryContainer,
  },
  label: {
    fontSize: 13,
    color: colors.onSurfaceVariant,
  },
  selectedLabel: {
    color: colors.onPrimaryContainer,
    fontWeight: '500',
  },
});
