import React, { useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  useWindowDimensions,
  StatusBar,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { FunctionsStackParamList } from '../../types/navigation';
import {
  PartnerFnIcon,
  ErrandFnIcon,
  SecondhandFnIcon,
  RatingFnIcon,
  FacilityFnIcon,
  AIScheduleFnIcon,
  ArrowRightFnIcon,
} from '../../components/functions/FunctionHubIcons';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const headerBg = require('../../../assets/images/campus-header-bg.png');

type Props = NativeStackScreenProps<FunctionsStackParamList, 'FunctionsHub'>;
type FunctionsHubRouteName =
  | 'PartnerList'
  | 'ErrandList'
  | 'SecondhandList'
  | 'AISchedule'
  | 'RatingList'
  | 'FacilityBooking';

interface FunctionEntry {
  key: string;
  titleKey: string;
  subtitleKey: string;
  Icon: React.FC<{ size?: number; color?: string }>;
  iconColor: string;
  arrowColor: string;
  route: FunctionsHubRouteName;
}

const ENTRIES: FunctionEntry[] = [
  { key: 'partner', titleKey: 'findPartner', subtitleKey: 'findPartnerDesc', Icon: PartnerFnIcon, iconColor: '#3B82F6', arrowColor: '#C1C1C1', route: 'PartnerList' },
  { key: 'errand', titleKey: 'errands', subtitleKey: 'errandsDesc', Icon: ErrandFnIcon, iconColor: '#FF9145', arrowColor: '#C1C1C1', route: 'ErrandList' },
  { key: 'secondhand', titleKey: 'secondHand', subtitleKey: 'secondHandDesc', Icon: SecondhandFnIcon, iconColor: '#02AF4A', arrowColor: '#C1C1C1', route: 'SecondhandList' },
  { key: 'rating', titleKey: 'ratings', subtitleKey: 'ratingsDesc', Icon: RatingFnIcon, iconColor: '#FFA814', arrowColor: '#C1C1C1', route: 'RatingList' },
  { key: 'facility', titleKey: 'facilityBooking', subtitleKey: 'facilityBookingDesc', Icon: FacilityFnIcon, iconColor: '#C76FF6', arrowColor: '#C1C1C1', route: 'FacilityBooking' },
  { key: 'aiSchedule', titleKey: 'aiSchedule', subtitleKey: 'aiScheduleDesc', Icon: AIScheduleFnIcon, iconColor: '#5B73FF', arrowColor: '#C1C1C1', route: 'AISchedule' },
];

const HEADER_BG_COLOR = '#333333';
const CARD_BG = '#FFFFFF';
const PAGE_BG = '#F7F7F7';
const TITLE_COLOR = '#0C1015';
const SUBTITLE_COLOR = '#86909C';
const GRID_GAP = 12;
const GRID_PADDING = 24;
const CARD_RADIUS = 16;
const CARD_HEIGHT = 131;

export default function FunctionsHubScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { width: screenWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const cardWidth = (screenWidth - GRID_PADDING * 2 - GRID_GAP) / 2;

  const handlePress = useCallback(
    (targetRoute: FunctionsHubRouteName) => {
      switch (targetRoute) {
        case 'PartnerList':
          navigation.navigate('PartnerList', {});
          return;
        case 'ErrandList':
          navigation.navigate('ErrandList', {});
          return;
        case 'SecondhandList':
          navigation.navigate('SecondhandList', {});
          return;
        case 'RatingList':
          navigation.navigate('RatingList');
          return;
        case 'AISchedule':
          // TODO: Navigate to AI Schedule screen
          return;
        case 'FacilityBooking':
          navigation.navigate('FacilityBooking');
          return;
      }
    },
    [navigation],
  );

  const renderCard = (entry: FunctionEntry, index: number) => {
    const isRight = index % 2 === 1;
    return (
      <TouchableOpacity
        key={entry.key}
        style={[
          styles.card,
          { width: cardWidth, marginLeft: isRight ? GRID_GAP : 0 },
        ]}
        activeOpacity={1}
        onPress={() => handlePress(entry.route)}
      >
        {/* Arrow pinned to top-right */}
        <View style={styles.cardArrow}>
          <ArrowRightFnIcon size={24} color={entry.arrowColor} />
        </View>
        {/* Icon */}
        <entry.Icon size={28} color={entry.iconColor} />
        {/* Title + Subtitle */}
        <View style={styles.cardTextGroup}>
          <Text style={styles.cardTitle} numberOfLines={1}>
            {t(entry.titleKey)}
          </Text>
          <Text style={styles.cardSubtitle} numberOfLines={1}>
            {t(entry.subtitleKey)}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  // Build rows of 2
  const rows: FunctionEntry[][] = [];
  for (let i = 0; i < ENTRIES.length; i += 2) {
    rows.push(ENTRIES.slice(i, i + 2));
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ── */}
        <View style={[styles.header, { paddingTop: insets.top }]}>
          <Image
            source={headerBg}
            style={styles.headerBgImage}
            resizeMode="cover"
          />
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>{t('campusTitle')}</Text>
            <Text style={styles.headerSubtitle}>{t('campusSubtitle')}</Text>
          </View>
        </View>

        {/* ── Card Grid ── */}
        <View style={styles.grid}>
          {rows.map((row, rowIndex) => (
            <View key={rowIndex} style={styles.row}>
              {row.map((entry, colIndex) =>
                renderCard(entry, rowIndex * 2 + colIndex),
              )}
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: PAGE_BG,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },

  /* ── Header ── */
  header: {
    backgroundColor: HEADER_BG_COLOR,
    paddingBottom: 70, // extra space for cards to overlap
    overflow: 'hidden',
  },
  headerBgImage: {
    position: 'absolute',
    top: -20,
    left: 0,
    width: '100%',
    height: '200%',
    opacity: 0.04,
  },
  headerContent: {
    paddingHorizontal: GRID_PADDING,
    paddingTop: 24,
  },
  headerTitle: {
    fontSize: 32,
    fontFamily: 'SourceHanSansCN-Bold',
    color: '#FFFFFF',
    lineHeight: 38,
  },
  headerSubtitle: {
    fontSize: 13,
    fontFamily: 'SourceHanSansCN-Regular',
    color: 'rgba(255,255,255,0.5)',
    marginTop: 14,
    lineHeight: 18,
    letterSpacing: 0.5,
  },

  /* ── Grid ── */
  grid: {
    marginTop: -57, // overlap the header
    paddingHorizontal: GRID_PADDING,
  },
  row: {
    flexDirection: 'row',
    marginBottom: GRID_GAP,
    height: CARD_HEIGHT,
  },

  /* ── Card ── */
  card: {
    backgroundColor: CARD_BG,
    borderRadius: CARD_RADIUS,
    height: CARD_HEIGHT,
    paddingTop: 22,
    paddingLeft: 20,
    paddingBottom: 16,
    paddingRight: 14,
    gap: 10,
  },
  cardArrow: {
    position: 'absolute',
    top: 24,
    right: 10,
  },
  cardTextGroup: {
    gap: 4,
  },
  cardTitle: {
    fontSize: 24,
    fontFamily: 'SourceHanSansCN-Bold',
    color: TITLE_COLOR,
    lineHeight: 29,
  },
  cardSubtitle: {
    fontSize: 12,
    fontFamily: 'SourceHanSansCN-Regular',
    color: SUBTITLE_COLOR,
    letterSpacing: 0.5,
    lineHeight: 15,
  },
});
