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
import { colors } from '../../theme/colors';
import { spacing, borderRadius, elevation } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import {
  UsersIcon,
  TruckIcon,
  ShoppingBagIcon,
  StarIcon,
  EditIcon,
  HomeIcon,
  HeartIcon,
  PackageIcon,
  ChevronRightIcon,
  DollarIcon,
  CalendarIcon,
} from '../../components/common/icons';
import type { IconProps } from '../../components/common/icons';

type Props = NativeStackScreenProps<FunctionsStackParamList, 'FunctionsHub'>;

interface CardTheme {
  cardBg: string;
  iconBg: string;
  iconColor: string;
  textColor: string;
}

interface GridEntry {
  key: string;
  labelKey: string;
  Icon: React.FC<IconProps>;
  route: keyof FunctionsStackParamList;
  theme: CardTheme;
}

interface ComingSoonEntry {
  key: string;
  labelKey: string;
  Icon: React.FC<IconProps>;
  theme: CardTheme;
}

const GRID_ENTRIES: GridEntry[] = [
  {
    key: 'partner', labelKey: 'findPartner', Icon: UsersIcon, route: 'PartnerList',
    theme: { cardBg: '#DBEAFE', iconBg: '#EFF6FF', iconColor: '#2563EB', textColor: '#1E3A5F' },
  },
  {
    key: 'errand', labelKey: 'errands', Icon: TruckIcon, route: 'ErrandList',
    theme: { cardBg: '#FFEDD5', iconBg: '#FFF7ED', iconColor: '#EA580C', textColor: '#7C2D12' },
  },
  {
    key: 'secondhand', labelKey: 'secondHand', Icon: ShoppingBagIcon, route: 'SecondhandList',
    theme: { cardBg: '#D1FAE5', iconBg: '#F0FDF4', iconColor: '#16A34A', textColor: '#14532D' },
  },
  {
    key: 'myPosts', labelKey: 'myPosts', Icon: EditIcon, route: 'MyPosts',
    theme: { cardBg: '#F3E8FF', iconBg: '#FDF4FF', iconColor: '#9333EA', textColor: '#581C87' },
  },
];

const RATING_ENTRY: GridEntry = {
  key: 'rating', labelKey: 'ratings', Icon: StarIcon, route: 'RatingList',
  theme: { cardBg: '#FEF3C7', iconBg: '#FFFBEB', iconColor: '#D97706', textColor: '#78350F' },
};

const FACILITY_ENTRY: GridEntry = {
  key: 'facility', labelKey: 'facilityBooking', Icon: CalendarIcon, route: 'FacilityBooking',
  theme: { cardBg: '#E0F7FA', iconBg: '#F0FDFF', iconColor: '#0097A7', textColor: '#004D40' },
};

const COMING_SOON_ENTRIES: ComingSoonEntry[] = [
  {
    key: 'shopping', labelKey: 'shopping', Icon: DollarIcon,
    theme: { cardBg: '#E0F2F1', iconBg: '#F0F9F8', iconColor: '#80CBC4', textColor: '#546E7A' },
  },
  {
    key: 'renting', labelKey: 'renting', Icon: HomeIcon,
    theme: { cardBg: '#E8EAF6', iconBg: '#F5F5FF', iconColor: '#9FA8DA', textColor: '#546E7A' },
  },
  {
    key: 'dating', labelKey: 'dating', Icon: HeartIcon,
    theme: { cardBg: '#FCE4EC', iconBg: '#FFF5F7', iconColor: '#F48FB1', textColor: '#546E7A' },
  },
  {
    key: 'sfExpress', labelKey: 'sfExpress', Icon: PackageIcon,
    theme: { cardBg: '#EFEBE9', iconBg: '#FAF7F5', iconColor: '#BCAAA4', textColor: '#546E7A' },
  },
];

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

        {/* Row 4-7: Coming Soon (购物, 租房, 约会, 顺丰寄件) */}
        {COMING_SOON_ENTRIES.map((entry) => (
          <View key={entry.key} style={[styles.fullCard, styles.disabledCard, { backgroundColor: entry.theme.cardBg }]}>
            <View style={styles.fullCardLeft}>
              <View style={[styles.fullCardIcon, { backgroundColor: entry.theme.iconBg }]}>
                <entry.Icon size={28} color={entry.theme.iconColor} />
              </View>
              <Text style={[styles.fullCardTitle, { color: entry.theme.textColor }]}>
                {t(entry.labelKey)}
              </Text>
            </View>
            <View style={styles.comingSoonBadge}>
              <Text style={styles.comingSoonText}>{t('comingSoon')}</Text>
            </View>
          </View>
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
  /* ── Disabled / Coming Soon ────────────────────────── */
  disabledCard: {
    opacity: 0.75,
  },
  comingSoonBadge: {
    backgroundColor: colors.outline,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
  },
  comingSoonText: {
    ...typography.labelSmall,
    color: colors.white,
  },
});
