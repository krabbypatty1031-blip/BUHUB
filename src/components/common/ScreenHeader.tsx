import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { colors } from '../../theme/colors';
import { spacing, layout } from '../../theme/spacing';
import { BackIcon, CloseIcon } from './icons';

export type ScreenHeaderVariant = 'default' | 'campus';

export interface ScreenHeaderProps {
  /** Ignored when `center` is set */
  title?: string;
  onBack?: () => void;
  /** `close` uses the compose-style X icon instead of the back chevron */
  leading?: 'back' | 'close';
  titleStyle?: StyleProp<TextStyle>;
  /** Replaces the title `Text` (e.g. empty profile header) */
  center?: React.ReactNode;
  rightAction?: React.ReactNode;
  /** Fixed-width spacer on the right when there is no `rightAction` (balances the back button) */
  rightSpacerWidth?: number;
  variant?: ScreenHeaderVariant;
  /** Overrides variant default (default: hairline on `default`, none on `campus`) */
  showBottomBorder?: boolean;
  backgroundColor?: string;
  backIconColor?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

const VARIANT: Record<
  ScreenHeaderVariant,
  {
    height: number;
    paddingLeft: number;
    paddingRight: number;
    backIconSize: number;
    backIconColor: string;
    bottomBorder: boolean;
    titleColor: string;
    useCjkBoldFont: boolean;
  }
> = {
  default: {
    height: layout.navHeight,
    paddingLeft: spacing.xs,
    paddingRight: spacing.xs,
    backIconSize: 24,
    backIconColor: colors.onSurface,
    bottomBorder: true,
    titleColor: colors.onSurface,
    useCjkBoldFont: false,
  },
  campus: {
    height: 62,
    paddingLeft: 12,
    paddingRight: 16,
    backIconSize: 26,
    backIconColor: '#0C1015',
    bottomBorder: false,
    titleColor: '#0C1015',
    useCjkBoldFont: true,
  },
};

export default function ScreenHeader({
  title = '',
  onBack,
  leading = 'back',
  titleStyle,
  center,
  rightAction,
  rightSpacerWidth,
  variant = 'default',
  showBottomBorder,
  backgroundColor,
  backIconColor,
  style,
  testID,
}: ScreenHeaderProps) {
  const v = VARIANT[variant];
  const bottomBorder = showBottomBorder ?? v.bottomBorder;
  const resolvedBackColor = backIconColor ?? v.backIconColor;
  const resolvedBarBg = backgroundColor ?? colors.surface;
  const LeadingIcon = leading === 'close' ? CloseIcon : BackIcon;

  const rightSlot =
    rightAction ??
    (rightSpacerWidth != null ? (
      <View style={{ width: rightSpacerWidth }} />
    ) : onBack ? (
      <View style={styles.rightBalance} />
    ) : null);

  return (
    <View
      testID={testID}
      style={[
        styles.bar,
        {
          height: v.height,
          paddingLeft: v.paddingLeft,
          paddingRight: v.paddingRight,
          backgroundColor: resolvedBarBg,
          borderBottomWidth: bottomBorder ? StyleSheet.hairlineWidth : 0,
          borderBottomColor: colors.outlineVariant,
        },
        style,
      ]}
    >
      <View style={styles.leftSlot}>
        {onBack ? (
          <TouchableOpacity
            onPress={onBack}
            style={styles.backTouch}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel="Back"
          >
            <LeadingIcon size={v.backIconSize} color={resolvedBackColor} />
          </TouchableOpacity>
        ) : null}
      </View>

      {center != null ? (
        <View style={styles.centerWrap}>{center}</View>
      ) : (
        <Text
          style={[
            styles.title,
            v.useCjkBoldFont && styles.titleCjk,
            { color: v.titleColor },
            !v.useCjkBoldFont && styles.titleDefaultWeight,
            titleStyle,
          ]}
          numberOfLines={1}
        >
          {title}
        </Text>
      )}

      <View style={styles.rightSlot}>{rightSlot}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  leftSlot: {
    width: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backTouch: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerWrap: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    minWidth: 0,
    fontSize: 18,
    lineHeight: 24,
    textAlign: 'center',
  },
  titleCjk: {
    fontFamily: 'SourceHanSansCN-Bold',
  },
  titleDefaultWeight: {
    fontWeight: '600',
  },
  rightSlot: {
    minWidth: 48,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  rightBalance: {
    width: 48,
    height: 48,
  },
});
