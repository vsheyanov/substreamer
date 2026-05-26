import Ionicons from '@react-native-vector-icons/ionicons/static';
import { useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useTheme } from '../../hooks/useTheme';
import { settingsStyles } from '../../styles/settingsStyles';
import { albumDetailStore } from '../../store/albumDetailStore';
import { artistDetailStore } from '../../store/artistDetailStore';
import { playlistDetailStore } from '../../store/playlistDetailStore';
import { SettingsSectionTitle } from './SettingsSectionTitle';

export function MetadataCacheCard() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();

  const cachedAlbumCount = albumDetailStore((s) => Object.keys(s.albums).length);
  const cachedArtistCount = artistDetailStore((s) => Object.keys(s.artists).length);
  const cachedPlaylistCount = playlistDetailStore((s) => Object.keys(s.playlists).length);

  return (
    <View style={settingsStyles.section}>
      <SettingsSectionTitle>{t('metadataCache')}</SettingsSectionTitle>
      <View style={[settingsStyles.card, settingsStyles.cardPadded, { backgroundColor: colors.card }]}>
        <View style={[settingsStyles.infoRow, { borderBottomColor: colors.border }]}>
          <Text style={[settingsStyles.infoLabel, { color: colors.textPrimary }]}>{t('cachedAlbums')}</Text>
          <Text style={[settingsStyles.infoValue, { color: colors.textSecondary }]}>
            {cachedAlbumCount}
          </Text>
        </View>
        <View style={[settingsStyles.infoRow, { borderBottomColor: colors.border }]}>
          <Text style={[settingsStyles.infoLabel, { color: colors.textPrimary }]}>{t('cachedArtists')}</Text>
          <Text style={[settingsStyles.infoValue, { color: colors.textSecondary }]}>
            {cachedArtistCount}
          </Text>
        </View>
        <View style={[settingsStyles.infoRow, { borderBottomColor: colors.border }]}>
          <Text style={[settingsStyles.infoLabel, { color: colors.textPrimary }]}>{t('cachedPlaylists')}</Text>
          <Text style={[settingsStyles.infoValue, { color: colors.textSecondary }]}>
            {cachedPlaylistCount}
          </Text>
        </View>
        <Pressable
          onPress={() => router.push('/metadata-cache-browser')}
          style={({ pressed }) => [
            settingsStyles.navRow,
            { borderTopColor: colors.border },
            pressed && settingsStyles.pressed,
          ]}
        >
          <View style={settingsStyles.navRowLeft}>
            <Ionicons name="library-outline" size={18} color={colors.textPrimary} />
            <Text style={[settingsStyles.navRowText, { color: colors.textPrimary }]}>{t('browseMetadataCache')}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
        </Pressable>
      </View>
    </View>
  );
}
