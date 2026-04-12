import React, { useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { FunctionsStackParamList } from '../../types/navigation';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import ScreenHeader from '../../components/common/ScreenHeader';
import { MapPinIcon, ClockIcon, ChevronRightIcon } from '../../components/common/icons';
import { getLocalizedFontStyle } from '../../theme/typography';
import { openExternalBrowser } from '../../utils/openExternalBrowser';

type Props = NativeStackScreenProps<FunctionsStackParamList, 'FacilityBooking'>;

type FacilityItem = {
  id: string;
  titleKey: string;
  locationKey: string;
  hours: string;
  bookingUrl: string;
  navigateTo?: 'LibraryDetail';
};

const FACILITIES: FacilityItem[] = [
  {
    id: 'library',
    titleKey: 'libraryFacility',
    locationKey: 'libAddressShort',
    hours: '8:30 a.m. – 11:00 p.m.',
    bookingUrl: 'https://library.hkbu.edu.hk/using-the-library/facilities/room-bookings/',
    navigateTo: 'LibraryDetail',
  },
  {
    id: 'sports',
    titleKey: 'facilitySports',
    locationKey: 'facilitySportsLocation',
    hours: '7:00 a.m. – 10:30 p.m.',
    bookingUrl: 'https://sportsbooking1.hkbu.edu.hk/Booking/',
  },
  {
    id: 'vfbs',
    titleKey: 'facilityVFBS',
    locationKey: 'facilityVFBSLocation',
    hours: '',
    bookingUrl: 'https://cvfbs.hkbu.edu.hk/Booking/',
  },
  {
    id: 'jccc',
    titleKey: 'facilityJCCC',
    locationKey: 'facilityJCCCLocation',
    hours: '',
    bookingUrl: 'https://jsc.hkbu.edu.hk/facilitycharge_en.html',
  },
  {
    id: 'sgallery',
    titleKey: 'facilitySGallery',
    locationKey: 'facilitySGalleryLocation',
    hours: '',
    bookingUrl: 'https://s-gallery.hkbu.edu.hk/en/online-booking/',
  },
];

function FacilityCard({
  facility,
  t,
  language,
  onCardPress,
  onBook,
}: {
  facility: FacilityItem;
  t: (key: string) => string;
  language: string;
  onCardPress: () => void;
  onBook: () => void;
}) {
  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.7}
      onPress={onCardPress}
    >
      <View style={styles.cardHeader}>
        <Text style={[styles.cardTitle, getLocalizedFontStyle(language, 'bold')]}>{t(facility.titleKey)}</Text>
        <ChevronRightIcon size={18} color={colors.onSurfaceVariant} />
      </View>

      <View style={styles.cardDivider} />

      <View style={styles.cardRow}>
        <View style={styles.cardIcon}>
          <MapPinIcon size={14} color={colors.onSurface} />
        </View>
        <Text style={[styles.cardInfo, getLocalizedFontStyle(language, 'regular')]}>{t(facility.locationKey)}</Text>
      </View>

      {facility.hours ? (
        <View style={styles.cardRow}>
          <View style={styles.cardIcon}>
            <ClockIcon size={14} color={colors.onSurface} />
          </View>
          <Text style={[styles.cardInfo, getLocalizedFontStyle(language, 'regular')]}>{facility.hours}</Text>
        </View>
      ) : null}

      <View style={styles.cardFooter}>
        <TouchableOpacity
          style={styles.bookBtn}
          activeOpacity={0.7}
          onPress={onBook}
        >
          <Text style={[styles.bookBtnText, getLocalizedFontStyle(language, 'medium')]}>{t('bookNow')}</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

export default function FacilityBookingScreen({ navigation }: Props) {
  const { t, i18n } = useTranslation();
  const language = i18n.language;

  const handleCardPress = useCallback((facility: FacilityItem) => {
    if (facility.navigateTo) {
      navigation.navigate(facility.navigateTo);
    } else {
      void openExternalBrowser(facility.bookingUrl, 'system');
    }
  }, [navigation]);

  const handleBook = useCallback((url: string) => {
    void openExternalBrowser(url, 'system');
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader
        title={t('facilityBooking')}
        onBack={() => navigation.goBack()}
        titleStyle={getLocalizedFontStyle(language, 'bold')}
      />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {FACILITIES.map((facility) => (
          <FacilityCard
            key={facility.id}
            facility={facility}
            t={t}
            language={language}
            onCardPress={() => handleCardPress(facility)}
            onBook={() => handleBook(facility.bookingUrl)}
          />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
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
