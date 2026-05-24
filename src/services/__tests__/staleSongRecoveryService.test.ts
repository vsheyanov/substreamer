/**
 * Tests for the stale-song-ID recovery service (#146). These test
 * `findMatchingSong` directly (pure matching logic) and
 * `recoverStaleSongId` via mocked subsonicService calls.
 */

jest.mock('../subsonicService');

import {
  getAlbum,
  getPlaylist as _getPlaylist,
  search3,
} from '../subsonicService';
import { findMatchingSong, recoverStaleSongId } from '../staleSongRecoveryService';

const mockGetAlbum = getAlbum as jest.Mock;
const mockSearch3 = search3 as jest.Mock;

const makeSong = (overrides: any = {}) => ({
  id: 'song-1',
  isDir: false,
  title: 'Track Title',
  artist: 'Artist Name',
  duration: 200,
  ...overrides,
});

beforeEach(() => {
  jest.clearAllMocks();
  mockGetAlbum.mockResolvedValue(null);
  mockSearch3.mockResolvedValue({ albums: [], artists: [], songs: [] });
});

describe('findMatchingSong', () => {
  it('returns null for empty haystack', () => {
    expect(findMatchingSong(makeSong(), [])).toBeNull();
    expect(findMatchingSong(makeSong(), undefined)).toBeNull();
  });

  it('prefers MusicBrainz ID over everything else', () => {
    const needle = makeSong({ musicBrainzId: 'mbid-xyz', title: 'X', artist: 'A' });
    const haystack = [
      makeSong({ id: 'a', title: 'X', artist: 'A', duration: 200 }),
      makeSong({ id: 'b', musicBrainzId: 'mbid-xyz', title: 'Different', artist: 'Other' }),
    ];
    expect(findMatchingSong(needle, haystack)?.id).toBe('b');
  });

  it('matches by title + artist when MBID absent and there is exactly one candidate', () => {
    const needle = makeSong({ title: 'Song', artist: 'Band' });
    const haystack = [
      makeSong({ id: 'fresh-1', title: 'Song', artist: 'Band', duration: 195 }),
      makeSong({ id: 'other', title: 'Other', artist: 'Band' }),
    ];
    expect(findMatchingSong(needle, haystack)?.id).toBe('fresh-1');
  });

  it('uses duration to disambiguate multiple title+artist matches', () => {
    const needle = makeSong({ title: 'Song', artist: 'Band', duration: 240 });
    const haystack = [
      makeSong({ id: 'studio', title: 'Song', artist: 'Band', duration: 180 }),
      makeSong({ id: 'live', title: 'Song', artist: 'Band', duration: 241 }),
    ];
    expect(findMatchingSong(needle, haystack)?.id).toBe('live');
  });

  it('allows up to 2s drift in duration tiebreaker', () => {
    const needle = makeSong({ title: 'X', artist: 'A', duration: 100 });
    const haystack = [
      makeSong({ id: 'far', title: 'X', artist: 'A', duration: 105 }), // >2s off
      makeSong({ id: 'close', title: 'X', artist: 'A', duration: 98 }), // 2s off
    ];
    expect(findMatchingSong(needle, haystack)?.id).toBe('close');
  });

  it('falls back to title-only when artist differs (single match)', () => {
    const needle = makeSong({ title: 'Unique', artist: 'Old Name' });
    const haystack = [
      makeSong({ id: 'renamed', title: 'Unique', artist: 'New Name' }),
    ];
    expect(findMatchingSong(needle, haystack)?.id).toBe('renamed');
  });

  it('uses track number tiebreaker when multiple title-only matches', () => {
    const needle = makeSong({ title: 'Same', artist: 'X', track: 3, duration: 200 });
    const haystack = [
      makeSong({ id: 't1', title: 'Same', artist: 'Y', track: 1 }),
      makeSong({ id: 't3', title: 'Same', artist: 'Y', track: 3 }),
    ];
    expect(findMatchingSong(needle, haystack)?.id).toBe('t3');
  });

  it('returns null when no match is good enough', () => {
    const needle = makeSong({ title: 'Nope', artist: 'Nobody' });
    const haystack = [
      makeSong({ id: 'x', title: 'X', artist: 'A' }),
      makeSong({ id: 'y', title: 'Y', artist: 'B' }),
    ];
    expect(findMatchingSong(needle, haystack)).toBeNull();
  });
});

describe('recoverStaleSongId', () => {
  it('refreshes via getAlbum when the source has an albumId', async () => {
    const stale = makeSong({ id: 'old-id', albumId: 'album-1' });
    mockGetAlbum.mockResolvedValue({
      id: 'album-1',
      song: [makeSong({ id: 'fresh-id', title: 'Track Title', artist: 'Artist Name' })],
    });

    const result = await recoverStaleSongId(stale);
    expect(mockGetAlbum).toHaveBeenCalledWith('album-1');
    expect(result?.id).toBe('fresh-id');
  });

  it('falls back to search3 when getAlbum returns no match', async () => {
    const stale = makeSong({ id: 'old-id', albumId: 'album-1', title: 'X', artist: 'A' });
    mockGetAlbum.mockResolvedValue({ id: 'album-1', song: [] });
    mockSearch3.mockResolvedValue({
      albums: [],
      artists: [],
      songs: [makeSong({ id: 'fresh-from-search', title: 'X', artist: 'A' })],
    });

    const result = await recoverStaleSongId(stale);
    expect(mockSearch3).toHaveBeenCalledWith('A X');
    expect(result?.id).toBe('fresh-from-search');
  });

  it('skips getAlbum when no albumId is present', async () => {
    const stale = makeSong({ id: 'old-id', title: 'X', artist: 'A' });
    mockSearch3.mockResolvedValue({
      albums: [],
      artists: [],
      songs: [makeSong({ id: 'fresh', title: 'X', artist: 'A' })],
    });

    const result = await recoverStaleSongId(stale);
    expect(mockGetAlbum).not.toHaveBeenCalled();
    expect(mockSearch3).toHaveBeenCalled();
    expect(result?.id).toBe('fresh');
  });

  it('returns null when both album and search yield no match', async () => {
    const stale = makeSong({ id: 'old', albumId: 'a1', title: 'X', artist: 'Y' });
    mockGetAlbum.mockResolvedValue({ id: 'a1', song: [] });
    mockSearch3.mockResolvedValue({ albums: [], artists: [], songs: [] });

    expect(await recoverStaleSongId(stale)).toBeNull();
  });

  it('swallows getAlbum errors and falls through to search3', async () => {
    const stale = makeSong({ id: 'old', albumId: 'a1', title: 'X', artist: 'A' });
    mockGetAlbum.mockRejectedValue(new Error('network'));
    mockSearch3.mockResolvedValue({
      albums: [],
      artists: [],
      songs: [makeSong({ id: 'recovered', title: 'X', artist: 'A' })],
    });

    const result = await recoverStaleSongId(stale);
    expect(result?.id).toBe('recovered');
  });

  it('returns the SAME id if the server still has the cached one', async () => {
    // No change scenario — getAlbum returns a song with the same id.
    const stale = makeSong({ id: 'still-valid', albumId: 'a1' });
    mockGetAlbum.mockResolvedValue({
      id: 'a1',
      song: [makeSong({ id: 'still-valid', title: 'Track Title', artist: 'Artist Name' })],
    });

    const result = await recoverStaleSongId(stale);
    expect(result?.id).toBe('still-valid');
    // Caller is expected to compare ids and decide whether to swap.
  });

  it('returns null when neither albumId nor title is available', async () => {
    const stale = { id: 'naked', isDir: false, title: '' } as any;
    expect(await recoverStaleSongId(stale)).toBeNull();
    expect(mockGetAlbum).not.toHaveBeenCalled();
    expect(mockSearch3).not.toHaveBeenCalled();
  });
});
