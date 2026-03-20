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
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F3F5F7',
    marginRight: 6,
    marginBottom: 6,
    minHeight: 32,
    justifyContent: 'center',
  },
  selected: {
    backgroundColor: '#0C1015',
  },
  label: {
    fontSize: 12,
    fontFamily: 'SourceHanSansCN-Regular',
    color: '#0C1015',
  },
  selectedLabel: {
    color: '#FFFFFF',
    fontWeight: '500',
  },
});
