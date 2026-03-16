import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { colors, spacing, borderRadius } from '../../theme';

interface TagProps {
  label: string;
  onPress?: () => void;
}

function Tag({ label, onPress }: TagProps) {
  return (
    <TouchableOpacity style={styles.tag} onPress={onPress} activeOpacity={0.7} disabled={!onPress}>
      <Text style={styles.label}>{label}</Text>
    </TouchableOpacity>
  );
}

export default React.memo(Tag);

const styles = StyleSheet.create({
  tag: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 100,
    backgroundColor: '#F3F5F7',
    marginRight: spacing.xs,
    marginBottom: spacing.xs,
    justifyContent: 'center',
  },
  label: {
    fontSize: 12,
    color: '#9CA3AF',
  },
});
