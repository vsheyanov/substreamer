import Ionicons from '@react-native-vector-icons/ionicons/static';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { useTheme } from '../../hooks/useTheme';
import { settingsStyles } from '../../styles/settingsStyles';
import {
  musicCacheStore,
  type MaxConcurrentDownloads,
} from '../../store/musicCacheStore';
import { formatBytes } from '../../utils/formatters';
import { SettingsSectionTitle } from './SettingsSectionTitle';

const CONCURRENT_OPTIONS: MaxConcurrentDownloads[] = [1, 3, 5];

export function DownloadedMusicCard() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [sheetVisible, setSheetVisible] = useState(false);

  const musicCacheBytes = musicCacheStore((s) => s.totalBytes);
  const musicCachedItemCount = musicCacheStore((s) => Object.keys(s.cachedItems).length);
  const musicFileCount = musicCacheStore((s) => s.totalFiles);
  const musicQueueCount = musicCacheStore((s) => s.downloadQueue.length);
  const maxConcurrentDownloads = musicCacheStore((s) => s.maxConcurrentDownloads);

  const handleSelect = useCallback((value: MaxConcurrentDownloads) => {
    musicCacheStore.getState().setMaxConcurrentDownloads(value);
    setSheetVisible(false);
  }, []);

  return (
    <>
      <View style={settingsStyles.section}>
        <SettingsSectionTitle>{t('downloadedMusic')}</SettingsSectionTitle>
        <View style={[settingsStyles.card, settingsStyles.cardPadded, { backgroundColor: colors.card }]}>
          <View style={[settingsStyles.infoRow, { borderBottomColor: colors.border }]}>
            <Text style={[settingsStyles.infoLabel, { color: colors.textPrimary }]}>{t('downloadedItems')}</Text>
            <Text style={[settingsStyles.infoValue, { color: colors.textSecondary }]}>
              {t('itemCount', { count: musicCachedItemCount })}
            </Text>
          </View>
          <View style={[settingsStyles.infoRow, { borderBottomColor: colors.border }]}>
            <Text style={[settingsStyles.infoLabel, { color: colors.textPrimary }]}>{t('downloadedFiles')}</Text>
            <Text style={[settingsStyles.infoValue, { color: colors.textSecondary }]}>
              {t('fileCount', { count: musicFileCount })}
            </Text>
          </View>
          <View style={[settingsStyles.infoRow, { borderBottomColor: colors.border }]}>
            <Text style={[settingsStyles.infoLabel, { color: colors.textPrimary }]}>{t('diskUsage')}</Text>
            <Text style={[settingsStyles.infoValue, { color: colors.textSecondary }]}>
              {formatBytes(musicCacheBytes)}
            </Text>
          </View>
          <Pressable
            onPress={() => setSheetVisible(true)}
            style={({ pressed }) => [
              settingsStyles.infoRow,
              { borderBottomColor: colors.border },
              pressed && settingsStyles.pressed,
            ]}
          >
            <Text style={[settingsStyles.infoLabel, { color: colors.textPrimary }]}>{t('concurrentDownloads')}</Text>
            <Text style={[settingsStyles.infoValue, { color: colors.primary }]}>
              {maxConcurrentDownloads}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => router.push('/music-cache-browser')}
            style={({ pressed }) => [
              settingsStyles.navRow,
              { borderTopColor: colors.border },
              pressed && settingsStyles.pressed,
            ]}
          >
            <View style={settingsStyles.navRowLeft}>
              <Ionicons name="musical-notes-outline" size={18} color={colors.textPrimary} />
              <Text style={[settingsStyles.navRowText, { color: colors.textPrimary }]}>{t('browseDownloadedMusic')}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
          </Pressable>
          <Pressable
            onPress={() => router.push('/download-queue')}
            style={({ pressed }) => [
              settingsStyles.navRow,
              { borderTopColor: colors.border },
              pressed && settingsStyles.pressed,
            ]}
          >
            <View style={settingsStyles.navRowLeft}>
              <Ionicons name="cloud-download-outline" size={18} color={colors.textPrimary} />
              <Text style={[settingsStyles.navRowText, { color: colors.textPrimary }]}>
                {musicQueueCount > 0 ? t('downloadQueueWithCount', { count: musicQueueCount }) : t('downloadQueue')}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
          </Pressable>
        </View>
      </View>

      <Modal
        visible={sheetVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setSheetVisible(false)}
      >
        <Pressable
          style={settingsStyles.sheetBackdrop}
          onPress={() => setSheetVisible(false)}
        />
        <View
          style={[
            settingsStyles.sheet,
            { backgroundColor: colors.card, paddingBottom: Math.max(insets.bottom, 16) },
          ]}
        >
          <View style={[settingsStyles.sheetHandle, { backgroundColor: colors.border }]} />
          <Text style={[settingsStyles.sheetTitle, { color: colors.textPrimary }]}>
            {t('concurrentDownloads')}
          </Text>
          <Text style={[settingsStyles.sheetHint, { color: colors.textSecondary }]}>
            {t('concurrentDownloadsHint')}
          </Text>
          {CONCURRENT_OPTIONS.map((opt) => (
            <Pressable
              key={opt}
              onPress={() => handleSelect(opt)}
              style={({ pressed }) => [
                settingsStyles.sheetOption,
                pressed && settingsStyles.pressed,
              ]}
            >
              <Text style={[settingsStyles.sheetOptionLabel, { color: colors.textPrimary }]}>
                {t('trackWithCount', { count: opt })}
              </Text>
              {maxConcurrentDownloads === opt && (
                <Ionicons name="checkmark" size={22} color={colors.primary} />
              )}
            </Pressable>
          ))}
        </View>
      </Modal>
    </>
  );
}
