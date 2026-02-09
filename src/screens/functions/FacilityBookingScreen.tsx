import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  SafeAreaView,
  Alert,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { FunctionsStackParamList } from '../../types/navigation';
import { useUIStore } from '../../store/uiStore';
import { colors } from '../../theme/colors';
import { spacing, borderRadius, elevation } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { BackIcon, MapPinIcon, ClockIcon } from '../../components/common/icons';

type Props = NativeStackScreenProps<FunctionsStackParamList, 'FacilityBooking'>;

type FacilityCategory = 'library' | 'restaurant' | 'sports';

interface Facility {
  id: number;
  name: string;
  location: string;
  time: string;
  slots: number;
  totalSlots: number;
}

const CATEGORIES: { key: FacilityCategory; labelKey: string }[] = [
  { key: 'library', labelKey: 'libraryFacility' },
  { key: 'restaurant', labelKey: 'restaurantFacility' },
  { key: 'sports', labelKey: 'sportsFacility' },
];

const MOCK_DATA: Record<FacilityCategory, Facility[]> = {
  library: [
    { id: 1, name: '自習室 A', location: '圖書館 3/F', time: '09:00 - 22:00', slots: 5, totalSlots: 20 },
    { id: 2, name: '自習室 B', location: '圖書館 5/F', time: '09:00 - 22:00', slots: 0, totalSlots: 15 },
    { id: 3, name: '電腦室', location: '圖書館 2/F', time: '08:00 - 21:00', slots: 8, totalSlots: 30 },
  ],
  restaurant: [
    { id: 4, name: '中式餐廳', location: '學生中心 1/F', time: '11:00 - 20:00', slots: 12, totalSlots: 50 },
    { id: 5, name: '西式餐廳', location: '學生中心 2/F', time: '11:00 - 21:00', slots: 3, totalSlots: 40 },
    { id: 6, name: '教職員餐廳', location: '行政樓 G/F', time: '11:30 - 14:00', slots: 0, totalSlots: 25 },
  ],
  sports: [
    { id: 7, name: '羽毛球場', location: '體育中心 2/F', time: '07:00 - 22:00', slots: 2, totalSlots: 6 },
    { id: 8, name: '游泳池', location: '體育中心 B1', time: '06:30 - 21:30', slots: 15, totalSlots: 40 },
    { id: 9, name: '健身房', location: '體育中心 1/F', time: '07:00 - 22:00', slots: 0, totalSlots: 30 },
  ],
};

export default function FacilityBookingScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const showSnackbar = useUIStore((s) => s.showSnackbar);
  const [selectedCategory, setSelectedCategory] = useState<FacilityCategory>('library');
  const [bookedFacilities, setBookedFacilities] = useState<Set<number>>(new Set());

  const facilities = useMemo(() => MOCK_DATA[selectedCategory], [selectedCategory]);

  const handleBook = useCallback(
    (facility: Facility) => {
      if (bookedFacilities.has(facility.id)) {
        Alert.alert(t('cancelBooking'), '', [
          { text: t('cancel'), style: 'cancel' },
          {
            text: t('confirmBtn'),
            onPress: () => {
              setBookedFacilities((prev) => {
                const next = new Set(prev);
                next.delete(facility.id);
                return next;
              });
            },
          },
        ]);
        return;
      }

      Alert.alert(t('bookNow'), facility.name, [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('confirmBtn'),
          onPress: () => {
            setBookedFacilities((prev) => {
              const next = new Set(prev);
              next.add(facility.id);
              return next;
            });
            showSnackbar({ message: t('bookingSuccess'), type: 'success' });
          },
        },
      ]);
    },
    [bookedFacilities, showSnackbar, t]
  );

  const renderFacility = useCallback(
    ({ item }: { item: Facility }) => {
      const isBooked = bookedFacilities.has(item.id);
      const isFull = item.slots === 0 && !isBooked;

      return (
        <View style={styles.facilityCard}>
          <Text style={styles.facilityName}>{item.name}</Text>

          <View style={styles.facilityRow}>
            <MapPinIcon size={14} color={colors.onSurfaceVariant} />
            <Text style={styles.facilityInfo}>{item.location}</Text>
          </View>

          <View style={styles.facilityRow}>
            <ClockIcon size={14} color={colors.onSurfaceVariant} />
            <Text style={styles.facilityInfo}>{item.time}</Text>
          </View>

          <View style={styles.facilityFooter}>
            <Text style={[styles.slotsText, isFull && styles.slotsTextFull]}>
              {isFull
                ? t('fullyBooked')
                : `${item.slots}/${item.totalSlots} ${t('available')}`}
            </Text>

            <TouchableOpacity
              style={[
                styles.bookBtn,
                isBooked && styles.bookBtnBooked,
                isFull && styles.bookBtnDisabled,
              ]}
              onPress={() => handleBook(item)}
              disabled={isFull}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.bookBtnText,
                  isBooked && styles.bookBtnTextBooked,
                  isFull && styles.bookBtnTextDisabled,
                ]}
              >
                {isBooked ? t('booked') : isFull ? t('fullyBooked') : t('bookNow')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    },
    [bookedFacilities, handleBook, t]
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
          <BackIcon size={24} color={colors.onSurface} />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>{t('facilityBooking')}</Text>
        <View style={styles.iconBtn} />
      </View>

      {/* Category Chips */}
      <View style={styles.chipRow}>
        {CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat.key}
            style={[styles.chip, selectedCategory === cat.key && styles.chipActive]}
            onPress={() => setSelectedCategory(cat.key)}
            activeOpacity={0.7}
          >
            <Text
              style={[styles.chipText, selectedCategory === cat.key && styles.chipTextActive]}
            >
              {t(cat.labelKey)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Facility List */}
      <FlatList
        data={facilities}
        renderItem={renderFacility}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.listContent}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topBar: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.outlineVariant,
  },
  iconBtn: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarTitle: {
    flex: 1,
    textAlign: 'center',
    ...typography.titleMedium,
    color: colors.onSurface,
  },
  chipRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface2,
  },
  chipActive: {
    backgroundColor: colors.primary,
  },
  chipText: {
    ...typography.labelMedium,
    color: colors.onSurfaceVariant,
  },
  chipTextActive: {
    color: colors.onPrimary,
  },
  listContent: {
    padding: spacing.lg,
    paddingTop: spacing.xs,
  },
  facilityCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...elevation[1],
  },
  facilityName: {
    ...typography.titleSmall,
    color: colors.onSurface,
    marginBottom: spacing.sm,
  },
  facilityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  facilityInfo: {
    ...typography.bodySmall,
    color: colors.onSurfaceVariant,
  },
  facilityFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.md,
  },
  slotsText: {
    ...typography.bodySmall,
    color: colors.primary,
    fontWeight: '600',
  },
  slotsTextFull: {
    color: colors.error,
  },
  bookBtn: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary,
  },
  bookBtnBooked: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  bookBtnDisabled: {
    backgroundColor: colors.surfaceVariant,
  },
  bookBtnText: {
    ...typography.labelMedium,
    color: colors.onPrimary,
  },
  bookBtnTextBooked: {
    color: colors.primary,
  },
  bookBtnTextDisabled: {
    color: colors.onSurfaceVariant,
  },
});
