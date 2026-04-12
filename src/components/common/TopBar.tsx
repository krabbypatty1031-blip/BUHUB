import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../theme/colors';
import ScreenHeader from './ScreenHeader';

interface TopBarProps {
  title: string;
  onBack?: () => void;
  rightAction?: React.ReactNode;
  transparent?: boolean;
}

/** Legacy wrapper: safe-area top inset + {@link ScreenHeader} (`variant="default"`). */
export default function TopBar({ title, onBack, rightAction, transparent }: TopBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.wrap,
        { paddingTop: insets.top },
        transparent && styles.transparent,
      ]}
    >
      <ScreenHeader title={title} onBack={onBack} rightAction={rightAction} variant="default" />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.surface,
  },
  transparent: {
    backgroundColor: 'transparent',
  },
});
