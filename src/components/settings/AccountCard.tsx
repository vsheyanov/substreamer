import Ionicons from '@react-native-vector-icons/ionicons/static';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useTheme } from '../../hooks/useTheme';
import { settingsStyles } from '../../styles/settingsStyles';
import { clearImageCache } from '../../services/imageCacheService';
import { clearMusicCache } from '../../services/musicCacheService';
import { clearQueue } from '../../services/playerService';
import { stopPolling } from '../../services/scanService';
import { clearApiCache } from '../../services/subsonicService';
import { authStore } from '../../store/authStore';
import { deviceIdentityStore } from '../../store/deviceIdentityStore';
import { resetAllStores } from '../../store/resetAllStores';
import { serverInfoStore } from '../../store/serverInfoStore';
import { ChangePasswordSheet } from './ChangePasswordSheet';
import { EditDeviceNameSheet } from './EditDeviceNameSheet';
import { EditServerUrlSheet } from './EditServerUrlSheet';
import { SettingsSectionTitle } from './SettingsSectionTitle';

export function AccountCard() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();

  const serverUrl = authStore((s) => s.serverUrl);
  const primaryServerUrl = authStore((s) => s.primaryServerUrl);
  const secondaryServerUrl = authStore((s) => s.secondaryServerUrl);
  const username = authStore((s) => s.username);
  const password = authStore((s) => s.password);
  const deviceLabel = deviceIdentityStore((s) => s.deviceLabel);
  const adminRole = serverInfoStore((s) => s.adminRole);
  const shareRole = serverInfoStore((s) => s.shareRole);

  const [passwordVisible, setPasswordVisible] = useState(false);
  const [primaryUrlSheetVisible, setPrimaryUrlSheetVisible] = useState(false);
  const [secondaryUrlSheetVisible, setSecondaryUrlSheetVisible] = useState(false);
  const [changePasswordVisible, setChangePasswordVisible] = useState(false);
  const [deviceNameSheetVisible, setDeviceNameSheetVisible] = useState(false);

  const handleLogout = useCallback(() => {
    clearQueue();
    stopPolling();
    clearApiCache();
    resetAllStores();
    clearImageCache();
    clearMusicCache();
    router.replace('/login');
  }, [router]);

  const maskedPassword = password ? '•'.repeat(password.length) : '';

  return (
    <>
      <View style={settingsStyles.section}>
        <SettingsSectionTitle>{t('account')}</SettingsSectionTitle>
        <View style={[settingsStyles.card, settingsStyles.cardPadded, { backgroundColor: colors.card }]}>
          <Pressable
            onPress={() => setPrimaryUrlSheetVisible(true)}
            style={({ pressed }) => [
              styles.fieldRow,
              { borderBottomColor: colors.border },
              pressed && settingsStyles.pressed,
            ]}
          >
            <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>{t('primaryServerUrl')}</Text>
            <View style={styles.rightValue}>
              <Text
                style={[styles.fieldValue, { color: colors.textSecondary }]}
                numberOfLines={1}
                ellipsizeMode="middle"
              >
                {primaryServerUrl ?? serverUrl ?? '—'}
              </Text>
              <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
            </View>
          </Pressable>
          <Pressable
            onPress={() => setSecondaryUrlSheetVisible(true)}
            style={({ pressed }) => [
              styles.fieldRow,
              { borderBottomColor: colors.border },
              pressed && settingsStyles.pressed,
            ]}
          >
            <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>
              {t('secondaryServerUrl')}
            </Text>
            <View style={styles.rightValue}>
              <Text
                style={[styles.fieldValue, { color: colors.textSecondary }]}
                numberOfLines={1}
                ellipsizeMode="middle"
              >
                {secondaryServerUrl ?? t('notSet')}
              </Text>
              <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
            </View>
          </Pressable>
          <View style={[styles.fieldRow, { borderBottomColor: colors.border }]}>
            <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>{t('username')}</Text>
            <Text style={[styles.fieldValue, { color: colors.textSecondary }]}>{username ?? '—'}</Text>
          </View>
          <View style={[styles.fieldRow, { borderBottomColor: colors.border }]}>
            <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>{t('password')}</Text>
            <View style={styles.passwordValue}>
              <Text style={[styles.fieldValue, { color: colors.textSecondary }]}>
                {password ? (passwordVisible ? password : maskedPassword) : '—'}
              </Text>
              {password ? (
                <Pressable
                  onPress={() => setPasswordVisible((v) => !v)}
                  hitSlop={8}
                  style={({ pressed }) => pressed && settingsStyles.pressed}
                >
                  <Ionicons
                    name={passwordVisible ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color={colors.textSecondary}
                  />
                </Pressable>
              ) : null}
            </View>
          </View>
          <View style={[styles.fieldRow, { borderBottomColor: colors.border }]}>
            <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>{t('adminRole')}</Text>
            <Text style={[styles.fieldValue, { color: colors.textSecondary }]}>
              {adminRole === true ? t('yes') : adminRole === false ? t('no') : t('unknown')}
            </Text>
          </View>
          <View style={[styles.fieldRow, { borderBottomColor: colors.border }]}>
            <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>{t('shareRole')}</Text>
            <Text style={[styles.fieldValue, { color: colors.textSecondary }]}>
              {shareRole === true ? t('yes') : shareRole === false ? t('no') : t('unknown')}
            </Text>
          </View>
          <Pressable
            onPress={() => setDeviceNameSheetVisible(true)}
            style={({ pressed }) => [
              styles.fieldRow,
              pressed && settingsStyles.pressed,
            ]}
          >
            <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>{t('deviceName')}</Text>
            <View style={styles.rightValue}>
              <Text style={[styles.fieldValue, { color: colors.textSecondary }]} numberOfLines={1}>
                {deviceLabel}
              </Text>
              <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
            </View>
          </Pressable>
          <Pressable
            onPress={() => setChangePasswordVisible(true)}
            style={({ pressed }) => [
              styles.changePasswordButton,
              { backgroundColor: colors.primary },
              pressed && settingsStyles.pressed,
            ]}
          >
            <Ionicons name="key-outline" size={18} color="#fff" />
            <Text style={styles.changePasswordButtonText}>{t('changePassword')}</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              styles.logoutButton,
              { borderColor: colors.red },
              pressed && settingsStyles.pressed,
            ]}
            onPress={handleLogout}
          >
            <Text style={[styles.logoutButtonText, { color: colors.red }]}>{t('logOut')}</Text>
          </Pressable>
        </View>
      </View>

      <EditServerUrlSheet
        visible={primaryUrlSheetVisible}
        onClose={() => setPrimaryUrlSheetVisible(false)}
        target="primary"
      />
      <EditServerUrlSheet
        visible={secondaryUrlSheetVisible}
        onClose={() => setSecondaryUrlSheetVisible(false)}
        target="secondary"
      />
      <ChangePasswordSheet
        visible={changePasswordVisible}
        onClose={() => setChangePasswordVisible(false)}
      />
      <EditDeviceNameSheet
        visible={deviceNameSheetVisible}
        onClose={() => setDeviceNameSheetVisible(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  fieldRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'transparent',
  },
  fieldLabel: { fontSize: 16, flex: 1 },
  fieldValue: { fontSize: 16, fontWeight: '500' },
  passwordValue: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rightValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    justifyContent: 'flex-end',
  },
  changePasswordButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 10,
    paddingVertical: 10,
    marginTop: 12,
  },
  changePasswordButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  logoutButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  logoutButtonText: { fontSize: 16, fontWeight: '600' },
});
