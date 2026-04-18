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
import ScreenHeader from '../../components/common/ScreenHeader';
import { MapPinIcon, ClockIcon } from '../../components/common/icons';
import { ArrowRightFnIcon } from '../../components/functions/FunctionHubIcons';
import {
  LibraryFacilityIcon,
  SportsFacilityIcon,
  VFBSFacilityIcon,
  JCCCFacilityIcon,
  SGalleryFacilityIcon,
} from '../../components/functions/FacilityIcons';
import { getLocalizedFontStyle } from '../../theme/typography';
import { openExternalBrowser } from '../../utils/openExternalBrowser';

type Props = NativeStackScreenProps<FunctionsStackParamList, 'FacilityBooking'>;

type FacilityIconComponent = React.FC<{ size?: number; color?: string }>;

type FacilityItem = {
  id: string;
  titleKey: string;
  locationKey: string;
  hours: string;
  bookingUrl: string;
  navigateTo?: 'LibraryDetail';
  accent: string;
  Icon: FacilityIconComponent;
};

const FACILITIES: FacilityItem[] = [
  {
    id: 'library',
    titleKey: 'libraryFacility',
    locationKey: 'libAddressShort',
    hours: '8:30 a.m. – 11:00 p.m.',
    bookingUrl: 'https://library.hkbu.edu.hk/using-the-library/facilities/room-bookings/',
    navigateTo: 'LibraryDetail',
    accent: '#3B82F6',
    Icon: LibraryFacilityIcon,
  },
  {
    id: 'sports',
    titleKey: 'facilitySports',
    locationKey: 'facilitySportsLocation',
    hours: '7:00 a.m. – 10:30 p.m.',
    bookingUrl: 'https://sportsbooking1.hkbu.edu.hk/Booking/',
    accent: '#FF9145',
    Icon: SportsFacilityIcon,
  },
  {
    id: 'vfbs',
    titleKey: 'facilityVFBS',
    locationKey: 'facilityVFBSLocation',
    hours: '',
    bookingUrl: 'https://cvfbs.hkbu.edu.hk/Booking/',
    accent: '#02AF4A',
    Icon: VFBSFacilityIcon,
  },
  {
    id: 'jccc',
    titleKey: 'facilityJCCC',
    locationKey: 'facilityJCCCLocation',
    hours: '',
    bookingUrl: 'https://jsc.hkbu.edu.hk/facilitycharge_en.html',
    accent: '#FFA814',
    Icon: JCCCFacilityIcon,
  },
  {
    id: 'sgallery',
    titleKey: 'facilitySGallery',
    locationKey: 'facilitySGalleryLocation',
    hours: '',
    bookingUrl: 'https://s-gallery.hkbu.edu.hk/en/online-booking/',
    accent: '#C76FF6',
    Icon: SGalleryFacilityIcon,
  },
];

const PAGE_BG = '#F7F7F7';
const CARD_BG = '#FFFFFF';
const TITLE_COLOR = '#0C1015';
const SUBTITLE_COLOR = '#86909C';
const DIVIDER_COLOR = '#EDEEF0';
const CARD_RADIUS = 16;
const GRID_PADDING = 24;
const GRID_GAP = 12;

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
  onCardPress?: () => void;
  onBook: () => void;
}) {
  const Container: React.ComponentType<any> = onCardPress ? TouchableOpacity : View;
  const containerProps = onCardPress
    ? { activeOpacity: 0.85, onPress: onCardPress }
    : {};
  return (
    <Container style={styles.card} {...containerProps}>
      <View style={styles.iconBadge}>
        <facility.Icon size={28} color={facility.accent} />
      </View>

      <View style={styles.cardTextGroup}>
        <Text
          style={[styles.cardTitle, getLocalizedFontStyle(language, 'bold')]}
          numberOfLines={2}
        >
          {t(facility.titleKey)}
        </Text>

        <View style={styles.metaRow}>
          <MapPinIcon size={13} color={SUBTITLE_COLOR} />
          <Text
            style={[styles.metaText, getLocalizedFontStyle(language, 'regular')]}
            numberOfLines={2}
          >
            {t(facility.locationKey)}
          </Text>
        </View>

        {facility.hours ? (
          <View style={styles.metaRow}>
            <ClockIcon size={13} color={SUBTITLE_COLOR} />
            <Text
              style={[styles.metaText, getLocalizedFontStyle(language, 'regular')]}
            >
              {facility.hours}
            </Text>
          </View>
        ) : null}
      </View>

      <View style={styles.cardDivider} />

      <View style={styles.cardFooter}>
        <TouchableOpacity
          style={styles.bookBtn}
          activeOpacity={0.6}
          onPress={onBook}
        >
          <Text style={[styles.bookBtnText, getLocalizedFontStyle(language, 'bold')]}>
            {t('bookNow')}
          </Text>
          <ArrowRightFnIcon size={16} color={TITLE_COLOR} />
        </TouchableOpacity>
      </View>
    </Container>
  );
}

export default function FacilityBookingScreen({ navigation }: Props) {
  const { t, i18n } = useTranslation();
  const language = i18n.language;

  const handleBook = useCallback((facility: FacilityItem) => {
    void openExternalBrowser(facility.bookingUrl, 'system');
  }, []);

  const handleCardPress = useCallback((facility: FacilityItem) => {
    if (facility.navigateTo) {
      navigation.navigate(facility.navigateTo);
    }
  }, [navigation]);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <ScreenHeader
        title={t('facilityBooking')}
        onBack={() => navigation.goBack()}
        titleStyle={getLocalizedFontStyle(language, 'bold')}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {FACILITIES.map((facility) => (
          <FacilityCard
            key={facility.id}
            facility={facility}
            t={t}
            language={language}
            onCardPress={facility.navigateTo ? () => handleCardPress(facility) : undefined}
            onBook={() => handleBook(facility)}
          />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: CARD_BG,
  },
  scrollView: {
    flex: 1,
    backgroundColor: PAGE_BG,
  },
  content: {
    paddingHorizontal: GRID_PADDING,
    paddingTop: 16,
    paddingBottom: 40,
    gap: GRID_GAP,
  },

  /* ── Card ── */
  card: {
    backgroundColor: CARD_BG,
    borderRadius: CARD_RADIUS,
    paddingTop: 22,
    paddingLeft: 20,
    paddingBottom: 16,
    paddingRight: 14,
    overflow: 'hidden',
  },
  /* ── Icon ── */
  iconBadge: {
    marginBottom: 14,
  },

  /* ── Text ── */
  cardTextGroup: {
    gap: 8,
    paddingRight: 32,
  },
  cardTitle: {
    fontSize: 22,
    color: TITLE_COLOR,
    lineHeight: 28,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metaText: {
    fontSize: 12,
    color: SUBTITLE_COLOR,
    letterSpacing: 0.2,
    lineHeight: 16,
    flex: 1,
  },

  /* ── Footer ── */
  cardDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: DIVIDER_COLOR,
    marginTop: 16,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 12,
  },
  bookBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingLeft: 4,
  },
  bookBtnText: {
    fontSize: 13,
    color: TITLE_COLOR,
    letterSpacing: 0.2,
  },
});
