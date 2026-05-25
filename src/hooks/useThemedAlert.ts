import { Alert, Platform } from 'react-native';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import { useTheme } from './useTheme';
import { themedAlertStore } from '../store/themedAlertStore';

interface AlertButton {
  text: string;
  style?: 'default' | 'cancel' | 'destructive';
  onPress?: () => void;
}

/**
 * Platform-aware alert hook.
 *
 * - iOS: delegates to the native `Alert.alert` (respects system dark mode).
 * - Android: routes through the global `themedAlertStore` so the alert
 *   Modal mounts at the root layout (via `ThemedAlertHost`), independent
 *   of whatever component triggered it. This avoids Android Modal
 *   handoff races when an alert is opened immediately after another
 *   Modal closes (e.g. MoreOptionsSheet → Delete Playlist confirm).
 *
 * Returns `{ alert, alertProps }`:
 * - `alert(title, message?, buttons?)` — show the dialog
 * - `alertProps` — DEPRECATED. Kept as an always-invisible no-op so
 *   existing `<ThemedAlert {...alertProps} />` renders compile without
 *   warning. New code shouldn't render its own ThemedAlert; the global
 *   host handles every alert. Local renders can be removed in cleanup.
 */
export function useThemedAlert() {
  const { colors } = useTheme();
  const { t } = useTranslation();

  const alert = useCallback(
    (title: string, message?: string, buttons?: AlertButton[]) => {
      const resolvedButtons = buttons ?? [{ text: t('ok'), style: 'default' as const }];

      if (Platform.OS === 'ios') {
        Alert.alert(title, message, resolvedButtons);
        return;
      }

      themedAlertStore.getState().show(title, message, resolvedButtons);
    },
    [t],
  );

  return {
    alert,
    // No-op compat surface. Spreads `visible: false` so any leftover
    // `<ThemedAlert {...alertProps} />` render is harmless.
    alertProps: {
      visible: false,
      title: '',
      message: undefined,
      buttons: [],
      onDismiss: () => {},
      colors,
    },
  };
}
