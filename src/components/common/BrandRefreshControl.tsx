import { RefreshControl, type RefreshControlProps } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors } from '../../theme/colors';

/**
 * Brand-tinted pull-to-refresh control. Use as `refreshControl` prop on
 * any FlashList / FlatList / ScrollView in place of the bare {refreshing,
 * onRefresh} props pair, so spinner color and i18n stay consistent.
 *
 * Forwards all standard RefreshControlProps so callers can override
 * tintColor, title, etc. when a screen needs to.
 */
export function BrandRefreshControl(props: RefreshControlProps) {
  const { t } = useTranslation();
  return (
    <RefreshControl
      tintColor={colors.primary}
      colors={[colors.primary]}
      progressBackgroundColor={colors.surface}
      title={t('refreshing')}
      titleColor={colors.onSurfaceVariant}
      {...props}
    />
  );
}
