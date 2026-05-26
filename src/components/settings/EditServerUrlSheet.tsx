import Ionicons from '@react-native-vector-icons/ionicons/static';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { BottomSheet } from '../BottomSheet';
import { useTheme } from '../../hooks/useTheme';
import { useThemedAlert } from '../../hooks/useThemedAlert';
import { settingsStyles } from '../../styles/settingsStyles';
import { switchToServer } from '../../services/failoverService';
import { clearApiCache, login, normalizeServerUrl } from '../../services/subsonicService';
import { clearQueue } from '../../services/playerService';
import { authStore } from '../../store/authStore';

type TestState =
  | { kind: 'idle' }
  | { kind: 'testing' }
  | { kind: 'passed'; testedUrl: string }
  | { kind: 'failed'; error: string };

/**
 * Server-URL editor. One component covers both primary and secondary
 * targets — the three divergences (auth-store field, save-time side
 * effects, remove button) are clean conditionals on `target`.
 *
 * Primary save:
 *   - Confirms with the user (queue will clear)
 *   - clearQueue + setSession + clearApiCache
 *   - Leaves serverInfoStore alone (same server, different address)
 *
 * Secondary save:
 *   - No confirm
 *   - setSecondaryServerUrl only
 *   - Remove button visible when secondary is currently set
 */
export function EditServerUrlSheet({
  visible,
  onClose,
  target,
}: {
  visible: boolean;
  onClose: () => void;
  target: 'primary' | 'secondary';
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { alert } = useThemedAlert();
  const serverUrl = authStore((s) => s.serverUrl);
  const secondaryServerUrl = authStore((s) => s.secondaryServerUrl);
  const activeServer = authStore((s) => s.activeServer);

  const initial = target === 'primary' ? (serverUrl ?? '') : (secondaryServerUrl ?? '');

  const [input, setInput] = useState('');
  const [saved, setSaved] = useState(false);
  const [testState, setTestState] = useState<TestState>({ kind: 'idle' });

  useEffect(() => {
    if (visible) {
      setInput(initial);
      setSaved(false);
      setTestState({ kind: 'idle' });
    }
  }, [visible, initial]);

  const handleInputChange = useCallback((next: string) => {
    setInput(next);
    setTestState((prev) => (prev.kind === 'idle' ? prev : { kind: 'idle' }));
  }, []);

  const handleTest = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    const auth = authStore.getState();
    if (!auth.username || !auth.password) {
      setTestState({ kind: 'failed', error: t('connectionFailed') });
      return;
    }
    const normalised = normalizeServerUrl(trimmed);
    setTestState({ kind: 'testing' });
    const result = await login(normalised, auth.username, auth.password, auth.legacyAuth);
    if (result.success) {
      setTestState({ kind: 'passed', testedUrl: normalised });
    } else {
      setTestState({ kind: 'failed', error: result.error });
    }
  }, [input, t]);

  const applyPrimary = useCallback((normalised: string) => {
    const auth = authStore.getState();
    if (!auth.username || !auth.password || !auth.apiVersion) return;
    clearQueue();
    auth.setSession(normalised, auth.username, auth.password, auth.apiVersion, auth.legacyAuth);
    clearApiCache();
    setSaved(true);
    setTimeout(onClose, 500);
  }, [onClose]);

  const handleSave = useCallback(() => {
    if (testState.kind !== 'passed') return;
    const normalised = testState.testedUrl;

    if (target === 'secondary') {
      authStore.getState().setSecondaryServerUrl(normalised);
      setSaved(true);
      setTimeout(onClose, 500);
      return;
    }

    if (normalised === serverUrl) {
      onClose();
      return;
    }
    alert(
      t('serverUrlChangeWarningTitle'),
      t('serverUrlChangeWarning'),
      [
        { text: t('cancel'), style: 'cancel' },
        { text: t('save'), onPress: () => applyPrimary(normalised) },
      ],
    );
  }, [testState, target, serverUrl, alert, t, applyPrimary, onClose]);

  const handleRemove = useCallback(async () => {
    if (activeServer === 'secondary') {
      await switchToServer('primary', 'manual');
    }
    authStore.getState().setSecondaryServerUrl(null);
    onClose();
  }, [activeServer, onClose]);

  const title = target === 'primary' ? t('serverUrl') : t('secondaryServerUrl');
  const hint = target === 'primary' ? t('serverUrlEditPrompt') : t('secondaryServerUrlEditPrompt');
  const placeholder = target === 'primary' ? 'https://music.example.com' : 'http://192.168.1.50:4040';

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
        <Text style={[styles.hint, { color: colors.textSecondary }]}>{hint}</Text>
      </View>
      <View style={styles.form}>
        <TextInput
          style={[
            styles.input,
            { backgroundColor: colors.inputBg, color: colors.textPrimary, borderColor: colors.border },
          ]}
          placeholder={placeholder}
          placeholderTextColor={colors.textSecondary}
          value={input}
          onChangeText={handleInputChange}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          returnKeyType="go"
          onSubmitEditing={handleTest}
          autoFocus
          editable={testState.kind !== 'testing'}
        />
        {testState.kind === 'passed' && (
          <View style={styles.testStatus}>
            <Ionicons name="checkmark-circle" size={18} color={colors.green ?? colors.primary} />
            <Text style={[styles.testStatusText, { color: colors.textSecondary }]}>
              {t('testPassed')}
            </Text>
          </View>
        )}
        {testState.kind === 'failed' && (
          <View style={styles.testStatus}>
            <Ionicons name="close-circle" size={18} color={colors.red} />
            <Text style={[styles.testStatusText, { color: colors.red }]} numberOfLines={3}>
              {t('testFailed', { error: testState.error })}
            </Text>
          </View>
        )}
        <View style={styles.buttonRow}>
          <Pressable
            onPress={handleTest}
            disabled={testState.kind === 'testing' || !input.trim()}
            style={({ pressed }) => [
              styles.splitButton,
              styles.testButton,
              { borderColor: colors.primary },
              pressed && settingsStyles.pressed,
              (testState.kind === 'testing' || !input.trim()) && settingsStyles.disabled,
            ]}
          >
            {testState.kind === 'testing' ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Ionicons name="flask-outline" size={18} color={colors.primary} />
            )}
            <Text style={[styles.splitButtonText, { color: colors.primary }]}>
              {testState.kind === 'testing' ? t('testing') : t('testServer')}
            </Text>
          </Pressable>
          <Pressable
            onPress={handleSave}
            disabled={testState.kind !== 'passed'}
            style={({ pressed }) => [
              styles.splitButton,
              { backgroundColor: colors.primary },
              pressed && settingsStyles.pressed,
              testState.kind !== 'passed' && settingsStyles.disabled,
            ]}
          >
            <Ionicons name="checkmark" size={18} color="#fff" />
            <Text style={[styles.splitButtonText, { color: '#fff' }]}>
              {saved ? t('saved') : t('save')}
            </Text>
          </Pressable>
        </View>
        {target === 'secondary' && secondaryServerUrl != null && (
          <Pressable
            onPress={handleRemove}
            style={({ pressed }) => [styles.cancelButton, pressed && settingsStyles.pressed]}
          >
            <Text style={[styles.cancelButtonText, { color: colors.red }]}>
              {t('removeSecondaryServerUrl')}
            </Text>
          </Pressable>
        )}
        <Pressable onPress={onClose} style={styles.cancelButton}>
          <Text style={[styles.cancelButtonText, { color: colors.primary }]}>{t('cancel')}</Text>
        </Pressable>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 4, marginBottom: 16 },
  title: { fontSize: 18, fontWeight: '700', marginBottom: 6 },
  hint: { fontSize: 14, lineHeight: 18 },
  form: { paddingHorizontal: 4 },
  input: {
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  testStatus: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 },
  testStatusText: { flex: 1, fontSize: 14, lineHeight: 18 },
  buttonRow: { flexDirection: 'row', gap: 8, marginTop: 16, marginBottom: 8 },
  splitButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 12,
    paddingVertical: 14,
  },
  testButton: { borderWidth: 1, backgroundColor: 'transparent' },
  splitButtonText: { fontSize: 16, fontWeight: '600' },
  cancelButton: { alignItems: 'center', paddingVertical: 12, marginBottom: 4 },
  cancelButtonText: { fontSize: 16, fontWeight: '500' },
});
