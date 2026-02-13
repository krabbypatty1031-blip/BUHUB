import React, { useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { FunctionsStackParamList } from '../../types/navigation';
import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import {
  UsersIcon,
  TruckIcon,
  ShoppingBagIcon,
  StarIcon,
  EditIcon,
  CalendarIcon,
} from '../../components/common/icons';
import type { IconProps } from '../../components/common/icons';

type Props = NativeStackScreenProps<FunctionsStackParamList, 'FunctionsHub'>;

interface FunctionEntry {
  key: string;
  labelKey: string;
  Icon: React.FC<IconProps>;
  route: keyof FunctionsStackParamList;
  iconBg: string;
  iconColor: string;
}

const ENTRIES: FunctionEntry[] = [
  { key: 'partner',    labelKey: 'findPartner',     Icon: UsersIcon,       route: 'PartnerList',
    iconBg: '#DBEAFE', iconColor: '#2563EB' },
  { key: 'errand',     labelKey: 'errands',         Icon: TruckIcon,       route: 'ErrandList',
    iconBg: '#FFEDD5', iconColor: '#EA580C' },
  { key: 'secondhand', labelKey: 'secondHand',      Icon: ShoppingBagIcon, route: 'SecondhandList',
    iconBg: '#DCFCE7', iconColor: '#16A34A' },
  { key: 'myPosts',    labelKey: 'myPosts',         Icon: EditIcon,        route: 'MyPosts',
    iconBg: '#F3E8FF', iconColor: '#7C3AED' },
  { key: 'rating',     labelKey: 'ratings',         Icon: StarIcon,        route: 'RatingList',
    iconBg: '#FEF3C7', iconColor: '#D97706' },
  { key: 'facility',   labelKey: 'facilityBooking', Icon: CalendarIcon,    route: 'FacilityBooking',
    iconBg: '#CFFAFE', iconColor: '#0891B2' },
];

const CARD_GAP = spacing.md;

export default function FunctionsHubScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { width: screenWidth } = useWindowDimensions();
  const cardWidth = (screenWidth - spacing.lg * 2 - CARD_GAP) / 2;

  const handlePress = useCallback(
    (route: keyof FunctionsStackParamList) => {
      navigation.navigate(route as any);
    },
    [navigation]
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <Text style={styles.topBarTitle}>{t('functions')}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.grid}>
          {ENTRIES.map((entry) => (
            <TouchableOpacity
              key={entry.key}
              style={[styles.gridCard, { width: cardWidth }]}
              activeOpacity={0.7}
              onPress={() => handlePress(entry.route)}
            >
              <View style={[styles.iconCircle, { backgroundColor: entry.iconBg }]}>
                <entry.Icon size={26} color={entry.iconColor} />
              </View>
              <Text style={styles.cardTitle} numberOfLines={1}>
                {t(entry.labelKey)}
              </Text>
            </TouchableOpacity>
          ))}
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
  topBar: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
  },
  topBarTitle: {
    fontSize: 26,
    lineHeight: 32,
    color: colors.onSurface,
    fontFamily: 'Poppins_900Black',
    letterSpacing: -0.5,
  },
  scrollContent: {
    padding: spacing.lg,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  gridCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    marginBottom: CARD_GAP,
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.outlineVariant,
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  cardTitle: {
    ...typography.titleSmall,
    color: colors.onSurface,
    textAlign: 'center',
  },
});
