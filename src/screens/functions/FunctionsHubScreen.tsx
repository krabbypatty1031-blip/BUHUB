import React, { useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Dimensions,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { FunctionsStackParamList } from '../../types/navigation';
import { colors, functionCardThemes } from '../../theme/colors';
import { spacing, borderRadius, elevation } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import {
  UsersIcon,
  TruckIcon,
  ShoppingBagIcon,
  StarIcon,
  EditIcon,
  ChevronRightIcon,
  CalendarIcon,
} from '../../components/common/icons';
import type { IconProps } from '../../components/common/icons';

type Props = NativeStackScreenProps<FunctionsStackParamList, 'FunctionsHub'>;

interface GridEntry {
  key: string;
  labelKey: string;
  Icon: React.FC<IconProps>;
  route: keyof FunctionsStackParamList;
  theme: (typeof functionCardThemes)[keyof typeof functionCardThemes];
}

const GRID_ENTRIES: GridEntry[] = [
  {
    key: 'partner', labelKey: 'findPartner', Icon: UsersIcon, route: 'PartnerList',
    theme: functionCardThemes.blue,
  },
  {
    key: 'errand', labelKey: 'errands', Icon: TruckIcon, route: 'ErrandList',
    theme: functionCardThemes.lemon,
  },
  {
    key: 'secondhand', labelKey: 'secondHand', Icon: ShoppingBagIcon, route: 'SecondhandList',
    theme: functionCardThemes.blue,
  },
  {
    key: 'myPosts', labelKey: 'myPosts', Icon: EditIcon, route: 'MyPosts',
    theme: functionCardThemes.lemon,
  },
];

const RATING_ENTRY: GridEntry = {
  key: 'rating', labelKey: 'ratings', Icon: StarIcon, route: 'RatingList',
  theme: functionCardThemes.lemon,
};

const FACILITY_ENTRY: GridEntry = {
  key: 'facility', labelKey: 'facilityBooking', Icon: CalendarIcon, route: 'FacilityBooking',
  theme: functionCardThemes.blue,
};

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_GAP = spacing.md;
const CARD_WIDTH = (SCREEN_WIDTH - spacing.lg * 2 - CARD_GAP) / 2;

export default function FunctionsHubScreen({ navigation }: Props) {
  const { t } = useTranslation();

  const handlePress = useCallback(
    (route: keyof FunctionsStackParamList) => {
      navigation.navigate(route as any);
    },
    [navigation]
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <Text style={styles.topBarTitle}>{t('functions')}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Row 1-2: 2x2 Grid (找搭子, 跑腿, 二手, 我的发布) */}
        <View style={styles.grid}>
          {GRID_ENTRIES.map((entry) => (
            <TouchableOpacity
              key={entry.key}
              style={[styles.gridCard, { backgroundColor: entry.theme.cardBg }]}
              activeOpacity={0.7}
              onPress={() => handlePress(entry.route)}
            >
              <View style={[styles.iconContainer, { backgroundColor: entry.theme.iconBg }]}>
                <entry.Icon size={32} color={entry.theme.iconColor} />
              </View>
              <Text style={[styles.cardTitle, { color: entry.theme.textColor }]} numberOfLines={1}>
                {t(entry.labelKey)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Row 3: Full-width Rating */}
        <TouchableOpacity
          style={[styles.fullCard, { backgroundColor: RATING_ENTRY.theme.cardBg }]}
          activeOpacity={0.7}
          onPress={() => handlePress(RATING_ENTRY.route)}
        >
          <View style={styles.fullCardLeft}>
            <View style={[styles.fullCardIcon, { backgroundColor: RATING_ENTRY.theme.iconBg }]}>
              <RATING_ENTRY.Icon size={28} color={RATING_ENTRY.theme.iconColor} />
            </View>
            <Text style={[styles.fullCardTitle, { color: RATING_ENTRY.theme.textColor }]}>
              {t(RATING_ENTRY.labelKey)}
            </Text>
          </View>
          <ChevronRightIcon size={20} color={RATING_ENTRY.theme.textColor} />
        </TouchableOpacity>

        {/* Row: Facility Booking */}
        <TouchableOpacity
          style={[styles.fullCard, { backgroundColor: FACILITY_ENTRY.theme.cardBg }]}
          activeOpacity={0.7}
          onPress={() => handlePress(FACILITY_ENTRY.route)}
        >
          <View style={styles.fullCardLeft}>
            <View style={[styles.fullCardIcon, { backgroundColor: FACILITY_ENTRY.theme.iconBg }]}>
              <FACILITY_ENTRY.Icon size={28} color={FACILITY_ENTRY.theme.iconColor} />
            </View>
            <Text style={[styles.fullCardTitle, { color: FACILITY_ENTRY.theme.textColor }]}>
              {t(FACILITY_ENTRY.labelKey)}
            </Text>
          </View>
          <ChevronRightIcon size={20} color={FACILITY_ENTRY.theme.textColor} />
        </TouchableOpacity>

      </ScrollView>
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
    paddingHorizontal: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.outlineVariant,
  },
  topBarTitle: {
    ...typography.titleLarge,
    color: colors.primary,
    fontWeight: '700',
  },
  scrollContent: {
    padding: spacing.lg,
  },
  /* ── 2x2 Grid ─────────────────────────────────────── */
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  gridCard: {
    width: CARD_WIDTH,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: CARD_GAP,
    alignItems: 'center',
    ...elevation[1],
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  cardTitle: {
    ...typography.titleSmall,
    textAlign: 'center',
  },
  /* ── Full-width cards ──────────────────────────────── */
  fullCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: CARD_GAP,
    ...elevation[1],
  },
  fullCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fullCardIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  fullCardTitle: {
    ...typography.titleMedium,
  },
});
