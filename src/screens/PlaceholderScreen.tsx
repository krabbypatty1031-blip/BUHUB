import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../theme';

export default function createPlaceholder(name: string) {
  return function PlaceholderScreen() {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>{name}</Text>
        <Text style={styles.sub}>Coming in Phase 3</Text>
      </View>
    );
  };
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  title: { fontSize: 20, fontWeight: '600', color: colors.onSurface, marginBottom: 4 },
  sub: { fontSize: 14, color: colors.outline },
});
