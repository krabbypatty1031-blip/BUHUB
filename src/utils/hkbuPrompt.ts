import { Alert } from 'react-native';
import type { TFunction } from 'i18next';

/**
 * Show a blocking alert telling the user to bind a verified HKBU email.
 * Tapping the CTA invokes `onGoToManageEmails` (typically navigates to
 * MeTab > ManageEmails); tapping cancel just dismisses.
 */
export function promptHkbuVerification(
  t: TFunction,
  onGoToManageEmails: () => void
): void {
  Alert.alert(t('hkbuEmailRequiredTitle'), t('hkbuEmailRequiredBody'), [
    { text: t('cancel'), style: 'cancel' },
    { text: t('hkbuEmailRequiredCTA'), onPress: onGoToManageEmails },
  ]);
}
