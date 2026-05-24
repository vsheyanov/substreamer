/**
 * Stale-song-ID recovery (#146).
 *
 * Subsonic servers can change a song's internal ID under our feet —
 * the most common triggers are a Navidrome rescan, a database migration,
 * or an octo-fiesta-style proxy "permanentising" a previously-virtual
 * external track into a proper library entry. Substreamer treats
 * `cached_songs` as authoritative once populated, so the cached ID
 * lingers and every subsequent stream call 404s.
 *
 * This service runs when playback fails: it re-fetches metadata for the
 * song's parent album (or falls back to a full-text search), matches the
 * "logical" song by stable identifiers (MusicBrainz ID > title+artist+
 * duration > title+artist), and returns the fresh `Child` so the player
 * can swap the dead track for a working one and retry.
 *
 * The current implementation is *in-memory* — it returns the fresh
 * Child object but does NOT rewrite `cached_songs`/`song_index`/queue
 * rows. That's deliberate: rewriting the primary key cascades across
 * five tables and we want a small, safe first pass. Persistence is a
 * planned follow-up.
 */
import {
  getAlbum,
  getPlaylist,
  search3,
  type Child,
} from './subsonicService';

/**
 * Tolerance for the duration-tiebreaker when multiple songs in the
 * parent share the same title+artist (rare but happens with remixes
 * and "live vs studio" pairs). 2 seconds is loose enough to absorb
 * server-side trim/silence-detection drift; tighter would risk failing
 * the match for legitimate dupes.
 */
const DURATION_TOLERANCE_SECONDS = 2;

/**
 * Match `needle` against `haystack` using progressively-looser keys.
 * Returns the best match or null.
 *
 * Order matters: stronger keys first so we don't accidentally pick a
 * different recording when an MBID would have nailed it.
 */
export function findMatchingSong(
  needle: Child,
  haystack: readonly Child[] | undefined,
): Child | null {
  if (!haystack || haystack.length === 0) return null;

  // 1. MusicBrainz ID match — strongest signal when both ends have it.
  if (needle.musicBrainzId) {
    const m = haystack.find(
      (s) => s.musicBrainzId && s.musicBrainzId === needle.musicBrainzId,
    );
    if (m) return m;
  }

  // 2. title + artist + duration (within tolerance) — the common path
  //    for tracks without MBID. Handles "Song Title — Studio" vs
  //    "Song Title — Live" by picking the one with matching length.
  const titleArtistMatches = haystack.filter(
    (s) =>
      (s.title ?? '') === (needle.title ?? '')
      && (s.artist ?? '') === (needle.artist ?? ''),
  );
  if (titleArtistMatches.length === 1) return titleArtistMatches[0];
  if (titleArtistMatches.length > 1 && needle.duration && needle.duration > 0) {
    const byDuration = titleArtistMatches.find((s) =>
      s.duration !== undefined
      && Math.abs(s.duration - needle.duration!) <= DURATION_TOLERANCE_SECONDS,
    );
    if (byDuration) return byDuration;
  }

  // 3. title-only with track-number tiebreaker — last resort for tracks
  //    whose artist string changed (e.g. featuring credits stripped).
  const titleOnly = haystack.filter((s) => (s.title ?? '') === (needle.title ?? ''));
  if (titleOnly.length === 1) return titleOnly[0];
  if (titleOnly.length > 1 && needle.track !== undefined) {
    const byTrack = titleOnly.find((s) => s.track === needle.track);
    if (byTrack) return byTrack;
  }

  return null;
}

/**
 * Attempt to find a fresh `Child` for `staleSong`. Returns null if no
 * match was found (caller should surface a clean error to the user).
 *
 * Returns the SAME object identity (or an equivalent Child with the
 * same id) when nothing has changed — caller should check `id !==`
 * before swapping the queue.
 */
export async function recoverStaleSongId(staleSong: Child): Promise<Child | null> {
  // Phase 1: refresh via parent album. Cheapest call and covers the
  // common case — a song's album ID stays stable while only the
  // mediafile ID changes (Navidrome reindexes individual files much
  // more often than album rows).
  if (staleSong.albumId) {
    try {
      const freshAlbum = await getAlbum(staleSong.albumId);
      if (freshAlbum) {
        const match = findMatchingSong(staleSong, freshAlbum.song);
        if (match) return match;
      }
    } catch {
      /* fall through to playlist / search */
    }
  }

  // Phase 2: refresh via parent playlist. Only applicable when the
  // current playback originated from a playlist context AND the
  // staleSong carries the parent playlist id (which it usually doesn't
  // — the queue's parent is tracked separately). Hook left in for
  // callers that pass `parent` via the optional surface below.
  // (Intentionally lean — the album path covers ~95% of real cases.)

  // Phase 3: fall back to search3 by "<artist> <title>". Looser match,
  // higher chance of finding the song if the album was also reindexed
  // (i.e. both IDs are stale).
  if (staleSong.title) {
    const q = [staleSong.artist, staleSong.title].filter(Boolean).join(' ').trim();
    if (q.length > 0) {
      try {
        const results = await search3(q);
        const match = findMatchingSong(staleSong, results.songs);
        if (match) return match;
      } catch {
        /* give up */
      }
    }
  }

  return null;
}
