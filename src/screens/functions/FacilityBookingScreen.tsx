import React, { useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { FunctionsStackParamList } from '../../types/navigation';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { BackIcon, MapPinIcon, ClockIcon, ChevronRightIcon } from '../../components/common/icons';
import { openExternalBrowser } from '../../utils/openExternalBrowser';

type Props = NativeStackScreenProps<FunctionsStackParamList, 'FacilityBooking'>;

const BOOKING_URL =
  'https://library.hkbu.edu.hk/using-the-library/facilities/room-bookings/';

export default function FacilityBookingScreen({ navigation }: Props) {
  const { t } = useTranslation();

  const handleCardPress = useCallback(() => {
    navigation.navigate('LibraryDetail');
  }, [navigation]);

  const handleBook = useCallback(() => {
    void openExternalBrowser(BOOKING_URL, 'system');
  }, []);

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

      {/* Facility Card */}
      <View style={styles.content}>
        <TouchableOpacity
          style={styles.card}
          activeOpacity={0.7}
          onPress={handleCardPress}
        >
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>{t('libraryFacility')}</Text>
            <ChevronRightIcon size={18} color={colors.onSurfaceVariant} />
          </View>

          <View style={styles.cardDivider} />

          <View style={styles.cardRow}>
            <View style={styles.cardIcon}>
              <MapPinIcon size={14} color={colors.onSurface} />
            </View>
            <Text style={styles.cardInfo}>{t('libAddressShort')}</Text>
          </View>

          <View style={styles.cardRow}>
            <View style={styles.cardIcon}>
              <ClockIcon size={14} color={colors.onSurface} />
            </View>
            <Text style={styles.cardInfo}>8:30 a.m. – 11:00 p.m.</Text>
          </View>

          <View style={styles.cardFooter}>
            <TouchableOpacity
              style={styles.bookBtn}
              activeOpacity={0.7}
              onPress={handleBook}
            >
              <Text style={styles.bookBtnText}>{t('bookNow')}</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </View>

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
  topBarTitle: {
    position: 'absolute',
    left: 0,
    right: 0,
    textAlign: 'center',
    fontSize: 18,
    lineHeight: 24,
    fontFamily: 'SourceHanSansCN-Bold',
    color: '#0C1015',
    pointerEvents: 'none',
  },

  /* ── Content ── */
  content: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
  },
  card: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.outlineVariant,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardTitle: {
    ...typography.titleMedium,
    color: colors.onSurface,
    fontWeight: '700',
  },
  cardDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.outlineVariant,
    marginVertical: spacing.lg,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  cardIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardInfo: {
    ...typography.bodyMedium,
    color: colors.onSurface,
    flex: 1,
    lineHeight: 22,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: spacing.lg,
  },
  bookBtn: {
    paddingHorizontal: spacing.xl,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: borderRadius.lg,
    backgroundColor: colors.primary,
  },
  bookBtnText: {
    ...typography.labelMedium,
    color: colors.onPrimary,
  },
});
