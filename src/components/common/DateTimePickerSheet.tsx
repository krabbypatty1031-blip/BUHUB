import React, { useState, useCallback, useEffect, useRef } from 'react';
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

interface DateTimePickerSheetProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (date: Date) => void;
  initialDate?: Date;
  minimumDate?: Date;
  title?: string;
}

/** Generate array [start..end] inclusive */
function range(start: number, end: number): number[] {
  const arr: number[] = [];
  for (let i = start; i <= end; i++) arr.push(i);
  return arr;
}

/** Days in a given month (1-indexed month) */
function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/* ── Single wheel column ── */
interface WheelColumnProps {
  data: number[];
  selected: number;
  onChange: (value: number) => void;
  suffix: string;
  formatValue?: (v: number) => string;
}

const WheelColumn = React.memo(function WheelColumn({
  data,
  selected,
  onChange,
  suffix,
  formatValue,
}: WheelColumnProps) {
  const scrollRef = useRef<ScrollView>(null);
  const isUserScroll = useRef(true);

  const selectedIndex = data.indexOf(selected);

  // Scroll to selected item when data or selection changes programmatically
  useEffect(() => {
    if (selectedIndex >= 0 && scrollRef.current) {
      isUserScroll.current = false;
      scrollRef.current.scrollTo({
        y: selectedIndex * ITEM_HEIGHT,
        animated: false,
      });
      // Re-enable user scroll detection after a short delay
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

  const display = (v: number) =>
    formatValue ? formatValue(v) : String(v).padStart(2, '0');

  return (
    <View style={wheelStyles.container}>
      {/* Highlight band */}
      <View pointerEvents="none" style={wheelStyles.highlight} />
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        onMomentumScrollEnd={handleMomentumEnd}
        contentContainerStyle={{
          paddingVertical: ITEM_HEIGHT * 2, // top/bottom padding for centering
        }}
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
                {display(value)}
              </Text>
              {isSelected && (
                <Text style={wheelStyles.suffix}>{suffix}</Text>
              )}
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
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
  suffix: {
    ...typography.labelSmall,
    color: colors.onPrimaryContainer,
  },
});

/* ── Main component ── */
export default function DateTimePickerSheet({
  visible,
  onClose,
  onConfirm,
  initialDate,
  minimumDate,
  title,
}: DateTimePickerSheetProps) {
  const { t } = useTranslation();
  const now = minimumDate || new Date();

  const initDate = initialDate || now;
  const [month, setMonth] = useState(initDate.getMonth() + 1);
  const [day, setDay] = useState(initDate.getDate());
  const [hour, setHour] = useState(initDate.getHours());
  const [minute, setMinute] = useState(initDate.getMinutes());

  // Reset when opening
  useEffect(() => {
    if (visible) {
      const d = initialDate || new Date();
      setMonth(d.getMonth() + 1);
      setDay(d.getDate());
      setHour(d.getHours());
      setMinute(d.getMinutes());
    }
  }, [visible, initialDate]);

  // Derive year: if selected month/day is before "now", use next year
  const currentYear = now.getFullYear();
  const buildDate = useCallback(
    (m: number, d: number, h: number, min: number) => {
      let year = currentYear;
      const candidate = new Date(year, m - 1, d, h, min, 0, 0);
      if (candidate.getTime() < now.getTime()) {
        // Check if pushing to next year makes sense
        const nextYear = new Date(year + 1, m - 1, d, h, min, 0, 0);
        if (nextYear.getTime() > now.getTime()) {
          year = currentYear + 1;
        }
      }
      return new Date(year, m - 1, d, h, min, 0, 0);
    },
    [currentYear, now],
  );

  // Clamp day when month changes
  const maxDay = daysInMonth(currentYear, month);
  useEffect(() => {
    if (day > maxDay) setDay(maxDay);
  }, [month, day, maxDay]);

  const months = range(1, 12);
  const days = range(1, maxDay);
  const hours = range(0, 23);
  const minutes = range(0, 59);

  const handleConfirm = useCallback(() => {
    const date = buildDate(month, day, hour, minute);
    onConfirm(date);
  }, [buildDate, month, day, hour, minute, onConfirm]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View
          style={styles.sheet}
          onStartShouldSetResponder={() => true}
        >
          {/* Drag handle */}
          <View style={styles.handle} />

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>
              {title || t('deadlineLabel')}
            </Text>
            <TouchableOpacity
              style={styles.confirmBtn}
              onPress={handleConfirm}
            >
              <Text style={styles.confirmBtnText}>
                {t('deadlineConfirm')}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Wheel columns */}
          <View style={styles.pickerRow}>
            <WheelColumn
              data={months}
              selected={month}
              onChange={setMonth}
              suffix={t('deadlineMonth')}
            />
            <WheelColumn
              data={days}
              selected={day}
              onChange={setDay}
              suffix={t('deadlineDay')}
            />
            <WheelColumn
              data={hours}
              selected={hour}
              onChange={setHour}
              suffix={t('deadlineHour')}
              formatValue={(v) => String(v).padStart(2, '0')}
            />
            <WheelColumn
              data={minutes}
              selected={minute}
              onChange={setMinute}
              suffix={t('deadlineMinute')}
              formatValue={(v) => String(v).padStart(2, '0')}
            />
          </View>
        </View>
      </TouchableOpacity>
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
    paddingBottom: 34, // safe area
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
  title: {
    ...typography.titleMedium,
    color: colors.onSurface,
    fontWeight: '600',
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
