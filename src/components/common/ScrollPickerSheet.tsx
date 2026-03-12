import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ScrollView,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { typography } from '../../theme/typography';

const ITEM_HEIGHT = 44;
const VISIBLE_ITEMS = 5;
const PICKER_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS;

export interface PickerOption {
  value: string;
  label: string;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  onConfirm: (value: string) => void;
  options: PickerOption[];
  initialValue?: string;
  title?: string;
}

/* ── Single wheel column ── */
const WheelColumn = React.memo(function WheelColumn({
  data,
  selected,
  onChange,
  formatValue,
}: {
  data: number[];
  selected: number;
  onChange: (value: number) => void;
  formatValue: (v: number) => string;
}) {
  const scrollRef = useRef<ScrollView>(null);
  const isUserScroll = useRef(true);
  const selectedIndex = data.indexOf(selected);

  useEffect(() => {
    if (selectedIndex >= 0 && scrollRef.current) {
      isUserScroll.current = false;
      scrollRef.current.scrollTo({
        y: selectedIndex * ITEM_HEIGHT,
        animated: false,
      });
      const timer = setTimeout(() => {
        isUserScroll.current = true;
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [selectedIndex, data.length]);

  const handleMomentumEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (!isUserScroll.current) return;
      const y = e.nativeEvent.contentOffset.y;
      const index = Math.round(y / ITEM_HEIGHT);
      const clamped = Math.max(0, Math.min(index, data.length - 1));
      if (data[clamped] !== selected) {
        onChange(data[clamped]);
      }
    },
    [data, selected, onChange],
  );

  return (
    <View style={wheelStyles.container}>
      <View pointerEvents="none" style={wheelStyles.highlight} />
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        onMomentumScrollEnd={handleMomentumEnd}
        contentContainerStyle={{ paddingVertical: ITEM_HEIGHT * 2 }}
      >
        {data.map((value) => {
          const isSelected = value === selected;
          return (
            <View key={value} style={wheelStyles.item}>
              <Text
                style={[
                  wheelStyles.itemText,
                  isSelected && wheelStyles.itemTextSelected,
                ]}
              >
                {formatValue(value)}
              </Text>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
});

const wheelStyles = StyleSheet.create({
  container: {
    flex: 1,
    height: PICKER_HEIGHT,
    overflow: 'hidden',
    position: 'relative',
  },
  highlight: {
    position: 'absolute',
    top: ITEM_HEIGHT * 2,
    left: 4,
    right: 4,
    height: ITEM_HEIGHT,
    backgroundColor: colors.primaryContainer,
    borderRadius: borderRadius.sm,
    zIndex: 0,
  },
  item: {
    height: ITEM_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemText: {
    ...typography.bodyLarge,
    color: colors.outline,
    textAlign: 'center',
  },
  itemTextSelected: {
    color: colors.onPrimaryContainer,
    fontWeight: '600',
  },
});

/* ── Main component ── */
export default function ScrollPickerSheet({
  visible,
  onClose,
  onConfirm,
  options,
  initialValue,
  title,
}: Props) {
  const { t } = useTranslation();

  const indexes = useMemo(() => options.map((_, i) => i), [options]);

  const initialIndex = useMemo(() => {
    if (initialValue == null) return 0;
    const idx = options.findIndex((o) => o.value === initialValue);
    return idx >= 0 ? idx : 0;
  }, [options, initialValue]);

  const [selectedIdx, setSelectedIdx] = useState(initialIndex);

  useEffect(() => {
    if (visible) {
      setSelectedIdx(initialIndex);
    }
  }, [visible, initialIndex]);

  const handleConfirm = useCallback(() => {
    if (options[selectedIdx]) {
      onConfirm(options[selectedIdx].value);
    }
  }, [onConfirm, options, selectedIdx]);

  const formatValue = useCallback(
    (idx: number) => options[idx]?.label ?? '',
    [options],
  );

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity
          style={StyleSheet.absoluteFillObject}
          activeOpacity={1}
          onPress={onClose}
        />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <View style={styles.headerSide} />
            <Text style={styles.title}>{title || t('select')}</Text>
            <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm}>
              <Text style={styles.confirmBtnText}>{t('deadlineConfirm')}</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.pickerRow}>
            <WheelColumn
              data={indexes}
              selected={selectedIdx}
              onChange={setSelectedIdx}
              formatValue={formatValue}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.scrim,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.lg,
    paddingBottom: 34,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.outlineVariant,
    alignSelf: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xs,
    paddingBottom: spacing.md,
  },
  headerSide: {
    width: 84,
  },
  title: {
    ...typography.titleMedium,
    color: colors.onSurface,
    fontWeight: '600',
    position: 'absolute',
    left: 0,
    right: 0,
    textAlign: 'center',
  },
  confirmBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
  },
  confirmBtnText: {
    ...typography.labelLarge,
    color: colors.onPrimary,
  },
  pickerRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
  },
});
