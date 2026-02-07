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
} from '../../components/common/icons';
import type { IconProps } from '../../components/common/icons';

type Props = NativeStackScreenProps<FunctionsStackParamList, 'FunctionsHub'>;

interface FunctionEntry {
  key: string;
  labelKey: string;
  descKey: string;
  Icon: React.FC<IconProps>;
  route: keyof FunctionsStackParamList;
}

const ENTRIES: FunctionEntry[] = [
  {
    key: 'partner',
    labelKey: 'findPartner',
    descKey: 'findPartnerDesc',
    Icon: UsersIcon,
    route: 'PartnerList',
  },
  {
    key: 'errand',
    labelKey: 'errands',
    descKey: 'errandsDesc',
    Icon: TruckIcon,
    route: 'ErrandList',
  },
  {
    key: 'secondhand',
    labelKey: 'secondhand',
    descKey: 'secondhandDesc',
    Icon: ShoppingBagIcon,
    route: 'SecondhandList',
  },
  {
    key: 'rating',
    labelKey: 'ratings',
    descKey: 'ratingsDesc',
    Icon: StarIcon,
    route: 'RatingList',
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
        <View style={styles.grid}>
          {ENTRIES.map((entry) => (
            <TouchableOpacity
              key={entry.key}
              style={styles.card}
              activeOpacity={0.7}
              onPress={() => handlePress(entry.route)}
            >
              <View style={styles.iconContainer}>
                <entry.Icon size={32} color={colors.primary} />
              </View>
              <Text style={styles.cardTitle} numberOfLines={1}>
                {t(entry.labelKey)}
              </Text>
              <Text style={styles.cardDesc} numberOfLines={2}>
                {t(entry.descKey)}
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
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  card: {
    width: CARD_WIDTH,
    backgroundColor: colors.primaryContainer,
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
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  cardTitle: {
    ...typography.titleSmall,
    color: colors.onPrimaryContainer,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  cardDesc: {
    ...typography.bodySmall,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
  },
});
