import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useTheme } from '../../hooks/useTheme';
import { useThemedAlert } from '../../hooks/useThemedAlert';
import { settingsStyles } from '../../styles/settingsStyles';
import { changePassword, clearApiCache } from '../../services/subsonicService';
import { authStore } from '../../store/authStore';

export function ChangePasswordSheet({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { alert } = useThemedAlert();
  const username = authStore((s) => s.username);
  const password = authStore((s) => s.password);

  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible) {
      setCurrentPw('');
      setNewPw('');
      setConfirmPw('');
      setError(null);
    }
  }, [visible]);

  const handleSave = useCallback(async () => {
    if (!username) return;
    if (currentPw !== password) {
      setError(t('currentPasswordIncorrect'));
      return;
    }
    if (!newPw.trim()) {
      setError(t('newPasswordRequired'));
      return;
    }
    if (newPw === currentPw) {
      setError(t('newPasswordMustDiffer'));
      return;
    }
    if (newPw !== confirmPw) {
      setError(t('passwordsDoNotMatch'));
      return;
    }
    setLoading(true);
    setError(null);
    const success = await changePassword(username, newPw);
    setLoading(false);
    if (success) {
      const auth = authStore.getState();
      auth.setSession(auth.serverUrl!, username, newPw, auth.apiVersion!, auth.legacyAuth);
      clearApiCache();
      onClose();
      alert(t('passwordChanged'), t('passwordChangedMessage'));
    } else {
      setError(t('failedToChangePassword'));
    }
  }, [username, password, currentPw, newPw, confirmPw, t, alert, onClose]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={[styles.card, { backgroundColor: colors.card }]} onPress={() => {}}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>{t('changePassword')}</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.inputBg, color: colors.textPrimary, borderColor: colors.border }]}
            placeholder={t('currentPassword')}
            placeholderTextColor={colors.textSecondary}
            secureTextEntry
            value={currentPw}
            onChangeText={(v) => { setCurrentPw(v); setError(null); }}
            autoFocus
            editable={!loading}
          />
          <TextInput
            style={[styles.input, { backgroundColor: colors.inputBg, color: colors.textPrimary, borderColor: colors.border }]}
            placeholder={t('newPassword')}
            placeholderTextColor={colors.textSecondary}
            secureTextEntry
            value={newPw}
            onChangeText={(v) => { setNewPw(v); setError(null); }}
            editable={!loading}
          />
          <TextInput
            style={[styles.input, { backgroundColor: colors.inputBg, color: colors.textPrimary, borderColor: colors.border }]}
            placeholder={t('confirmNewPassword')}
            placeholderTextColor={colors.textSecondary}
            secureTextEntry
            value={confirmPw}
            onChangeText={(v) => { setConfirmPw(v); setError(null); }}
            editable={!loading}
            returnKeyType="done"
            onSubmitEditing={handleSave}
          />
          {error && (
            <Text style={[styles.error, { color: colors.red }]}>{error}</Text>
          )}
          <View style={styles.buttons}>
            <Pressable
              onPress={onClose}
              disabled={loading}
              style={({ pressed }) => [
                styles.button,
                { borderColor: colors.border },
                pressed && settingsStyles.pressed,
              ]}
            >
              <Text style={[styles.buttonText, { color: colors.textPrimary }]}>{t('cancel')}</Text>
            </Pressable>
            <Pressable
              onPress={handleSave}
              disabled={loading}
              style={({ pressed }) => [
                styles.button,
                styles.buttonPrimary,
                { backgroundColor: colors.primary },
                pressed && settingsStyles.pressed,
                loading && settingsStyles.disabled,
              ]}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={[styles.buttonText, { color: '#fff' }]}>{t('save')}</Text>
              )}
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 16,
    padding: 24,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
    textAlign: 'center',
  },
  input: {
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 10,
  },
  error: { fontSize: 12, marginBottom: 10, textAlign: 'center' },
  buttons: { flexDirection: 'row', gap: 8, marginTop: 6 },
  button: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    paddingVertical: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  buttonPrimary: { borderWidth: 0 },
  buttonText: { fontSize: 16, fontWeight: '600' },
});
