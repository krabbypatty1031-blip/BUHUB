import React, { useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { FunctionsStackParamList } from '../../types/navigation';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import {
  BackIcon,
  MapPinIcon,
  ClockIcon,
} from '../../components/common/icons';

type Props = NativeStackScreenProps<FunctionsStackParamList, 'LibraryDetail'>;

const BOOKING_URL =
  'https://library.hkbu.edu.hk/using-the-library/facilities/room-bookings/';

/* ── Schedule data ── */
const SCHEDULE = [
  {
    dayKey: 'libMonFri',
    hours: '8:30 a.m. – 11:00 p.m.',
    counter: '9:00 a.m. – 10:30 p.m.',
  },
  {
    dayKey: 'libSat',
    hours: '9:00 a.m. – 9:00 p.m.',
    counter: '10:00 a.m. – 7:00 p.m.',
  },
  {
    dayKey: 'libSun',
    hours: '1:00 p.m. – 7:00 p.m.',
    counter: '1:00 p.m. – 7:00 p.m.',
  },
];

export default function LibraryDetailScreen({ navigation }: Props) {
  const { t } = useTranslation();

  const handleBook = useCallback(() => {
    Linking.openURL(BOOKING_URL);
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      {/* ── Top Bar ── */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => navigation.goBack()}
        >
          <BackIcon size={24} color={colors.onSurface} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ── */}
        <View style={styles.headerSection}>
          <Text style={styles.heroTitle}>{t('libMainLibrary')}</Text>
          <View style={styles.headerAccent} />
        </View>

        <View style={styles.divider} />

        {/* ── Location ── */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t('locationLabel')}</Text>
          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <MapPinIcon size={16} color={colors.onSurface} />
            </View>
            <Text style={styles.infoText}>{t('libAddress')}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        {/* ── Today's Hours ── */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t('libTodayHours')}</Text>
          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <ClockIcon size={16} color={colors.onSurface} />
            </View>
            <Text style={styles.todayTime}>8:30 a.m. – 11:00 p.m.</Text>
          </View>
        </View>

        <View style={styles.divider} />

        {/* ── General Opening Hours ── */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t('libGeneralHours')}</Text>

          <View style={styles.periodBadge}>
            <Text style={styles.periodBadgeLabel}>{t('libServicePeriod')}</Text>
            <Text style={styles.periodBadgeRange}>
              12 January – 24 April 2026
            </Text>
          </View>

          {/* Schedule rows */}
          {SCHEDULE.map((item, idx) => (
            <View
              key={item.dayKey}
              style={[
                styles.scheduleRow,
                idx < SCHEDULE.length - 1 && styles.scheduleRowBorder,
              ]}
            >
              <Text style={styles.dayLabel}>{t(item.dayKey)}</Text>
              <Text style={styles.dayHours}>{item.hours}</Text>
              <Text style={styles.counterLabel}>
                {t('libCounterHours')}
              </Text>
              <Text style={styles.counterHours}>{item.counter}</Text>
            </View>
          ))}
        </View>

        {/* ── Note ── */}
        <View style={styles.noteSection}>
          <Text style={styles.noteText}>
            <Text style={styles.noteStar}>*  </Text>
            {t('libAcademicCommons')}
          </Text>
        </View>

        {/* ── Book Now CTA ── */}
        <View style={styles.actionBar}>
          <TouchableOpacity
            style={styles.bookBtn}
            activeOpacity={0.8}
            onPress={handleBook}
          >
            <Text style={styles.bookBtnText}>{t('bookNow')}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  /* ── Top Bar ── */
  topBar: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.outlineVariant,
  },
  iconBtn: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* ── Scroll ── */
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 120,
  },

  /* ── Header ── */
  headerSection: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xl,
  },
  heroTitle: {
    ...typography.headlineSmall,
    color: colors.onSurface,
    letterSpacing: -0.5,
    lineHeight: 32,
  },
  headerAccent: {
    width: 32,
    height: 3,
    backgroundColor: colors.onSurface,
    borderRadius: 2,
    marginTop: spacing.md,
  },

  /* ── Shared ── */
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.outlineVariant,
    marginHorizontal: spacing.xl,
  },
  section: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xl,
  },
  sectionLabel: {
    ...typography.labelMedium,
    color: colors.onSurface,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: spacing.md,
  },

  /* ── Info rows ── */
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  infoIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoText: {
    ...typography.bodyMedium,
    color: colors.onSurface,
    flex: 1,
    lineHeight: 22,
  },
  todayTime: {
    ...typography.titleMedium,
    color: colors.onSurface,
  },

  /* ── Period badge ── */
  periodBadge: {
    backgroundColor: colors.surface2,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.lg,
  },
  periodBadgeLabel: {
    ...typography.labelSmall,
    color: colors.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.xxs,
  },
  periodBadgeRange: {
    ...typography.bodyMedium,
    color: colors.onSurface,
    fontWeight: '600',
  },

  /* ── Schedule rows ── */
  scheduleRow: {
    paddingVertical: spacing.md,
  },
  scheduleRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.outlineVariant,
  },
  dayLabel: {
    ...typography.titleSmall,
    color: colors.onSurface,
    marginBottom: spacing.xxs,
  },
  dayHours: {
    ...typography.bodyMedium,
    color: colors.onSurface,
  },
  counterLabel: {
    ...typography.labelSmall,
    color: colors.onSurfaceVariant,
    marginTop: spacing.xs,
  },
  counterHours: {
    ...typography.bodySmall,
    color: colors.onSurfaceVariant,
  },

  /* ── Note ── */
  noteSection: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  noteText: {
    ...typography.bodySmall,
    color: colors.error,
    lineHeight: 18,
  },
  noteStar: {
    color: colors.error,
    fontWeight: '700',
  },

  /* ── Action Bar ── */
  actionBar: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
  },
  bookBtn: {
    height: 48,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bookBtnText: {
    ...typography.labelLarge,
    color: colors.onPrimary,
  },
});
