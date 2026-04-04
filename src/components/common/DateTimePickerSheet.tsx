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
  maximumDate?: Date;
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

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function clampDate(date: Date, minimumDate: Date, maximumDate?: Date): Date {
  if (date.getTime() < minimumDate.getTime()) {
    return minimumDate;
  }
  if (maximumDate && date.getTime() > maximumDate.getTime()) {
    return maximumDate;
  }
  return date;
}

function getMonthMeta(baseDate: Date, monthOffset: number) {
  const date = new Date(
    baseDate.getFullYear(),
    baseDate.getMonth() + monthOffset,
    1,
  );

  return {
    year: date.getFullYear(),
    month: date.getMonth() + 1,
  };
}

function getMonthOffset(baseDate: Date, targetDate: Date): number {
  return (
    (targetDate.getFullYear() - baseDate.getFullYear()) * 12 +
    (targetDate.getMonth() - baseDate.getMonth())
  );
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
  maximumDate,
  title,
}: DateTimePickerSheetProps) {
  const { t } = useTranslation();
  const [liveMinimumDate, setLiveMinimumDate] = useState<Date>(
    minimumDate || new Date(),
  );
  const initialMaximumMonthOffset = maximumDate
    ? clamp(getMonthOffset(liveMinimumDate, maximumDate), 0, 11)
    : 11;
  const clampedInitialDate = clampDate(
    initialDate ?? liveMinimumDate,
    liveMinimumDate,
    maximumDate,
  );
  const initialMonthOffset = clamp(
    getMonthOffset(
      liveMinimumDate,
      clampedInitialDate,
    ),
    0,
    initialMaximumMonthOffset,
  );
  const initDate = clampedInitialDate;
  const [monthOffset, setMonthOffset] = useState(initialMonthOffset);
  const [day, setDay] = useState(initDate.getDate());
  const [hour, setHour] = useState(initDate.getHours());
  const [minute, setMinute] = useState(initDate.getMinutes());

  useEffect(() => {
    if (!visible) return;

    if (minimumDate) {
      setLiveMinimumDate(minimumDate);
      return;
    }

    setLiveMinimumDate(new Date());
    const timer = setInterval(() => {
      setLiveMinimumDate(new Date());
    }, 30000);

    return () => clearInterval(timer);
  }, [visible, minimumDate]);

  // Reset when opening
  useEffect(() => {
    if (visible) {
      const currentMinimum = minimumDate || new Date();
      const maximumMonthOffset = maximumDate
        ? clamp(getMonthOffset(currentMinimum, maximumDate), 0, 11)
        : 11;
      const d = clampDate(initialDate ?? currentMinimum, currentMinimum, maximumDate);
      setMonthOffset(clamp(getMonthOffset(currentMinimum, d), 0, maximumMonthOffset));
      setDay(d.getDate());
      setHour(d.getHours());
      setMinute(d.getMinutes());
    }
  }, [visible, initialDate, minimumDate, maximumDate]);

  const { year: selectedYear, month: selectedMonth } = getMonthMeta(
    liveMinimumDate,
    monthOffset,
  );
  const maximumMonthOffset = maximumDate
    ? clamp(getMonthOffset(liveMinimumDate, maximumDate), 0, 11)
    : 11;
  const maxDay = daysInMonth(selectedYear, selectedMonth);
  const isMaximumMonth = Boolean(maximumDate) && monthOffset === maximumMonthOffset;
  const minimumDay = monthOffset === 0 ? liveMinimumDate.getDate() : 1;
  const maximumDay = isMaximumMonth && maximumDate ? maximumDate.getDate() : maxDay;
  const days = range(minimumDay, Math.min(maxDay, maximumDay));

  useEffect(() => {
    if (day > maxDay) setDay(maxDay);
  }, [day, maxDay]);

  useEffect(() => {
    if (day < minimumDay) {
      setDay(minimumDay);
    }
  }, [day, minimumDay]);

  useEffect(() => {
    if (day > maximumDay) {
      setDay(maximumDay);
    }
  }, [day, maximumDay]);

  const months = range(0, maximumMonthOffset);
  const isMinimumDay = monthOffset === 0 && day === liveMinimumDate.getDate();
  const isMaximumDay = isMaximumMonth && !!maximumDate && day === maximumDate.getDate();
  const minimumHour = isMinimumDay ? liveMinimumDate.getHours() : 0;
  const maximumHour = isMaximumDay && maximumDate ? maximumDate.getHours() : 23;
  const hours = range(minimumHour, maximumHour);
  const isMinimumHour = isMinimumDay && hour === liveMinimumDate.getHours();
  const isMaximumHour = isMaximumDay && !!maximumDate && hour === maximumHour;
  const minimumMinute = isMinimumHour ? liveMinimumDate.getMinutes() : 0;
  const maximumMinute = isMaximumHour && maximumDate ? maximumDate.getMinutes() : 59;
  const minutes = range(minimumMinute, maximumMinute);

  useEffect(() => {
    if (hour < minimumHour) {
      setHour(minimumHour);
    }
  }, [hour, minimumHour]);

  useEffect(() => {
    if (hour > maximumHour) {
      setHour(maximumHour);
    }
  }, [hour, maximumHour]);

  useEffect(() => {
    if (minute < minimumMinute) {
      setMinute(minimumMinute);
    }
  }, [minute, minimumMinute]);

  useEffect(() => {
    if (minute > maximumMinute) {
      setMinute(maximumMinute);
    }
  }, [minute, maximumMinute]);

  const handleConfirm = useCallback(() => {
    const currentMinimum = minimumDate || new Date();
    const { year, month } = getMonthMeta(currentMinimum, monthOffset);
    const date = new Date(year, month - 1, day, hour, minute, 0, 0);
    const safeDate = clampDate(date, currentMinimum, maximumDate);
    onConfirm(safeDate);
  }, [day, hour, minute, minimumDate, maximumDate, monthOffset, onConfirm]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        {/* Backdrop – sibling so it never intercepts ScrollView gestures */}
        <TouchableOpacity
          style={StyleSheet.absoluteFillObject}
          activeOpacity={1}
          onPress={onClose}
        />
        <View style={styles.sheet}>
          {/* Drag handle */}
          <View style={styles.handle} />

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerSide} />
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
              selected={monthOffset}
              onChange={setMonthOffset}
              suffix={t('deadlineMonth')}
              formatValue={(value) =>
                String(getMonthMeta(liveMinimumDate, value).month).padStart(
                  2,
                  '0',
                )
              }
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
