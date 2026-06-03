jest.mock('../persistence/detailTables', () => ({
  fetchAllSongsByTitleAsync: jest.fn(),
}));

import { fetchAllSongsByTitleAsync } from '../persistence/detailTables';
import { songLibraryStore } from '../songLibraryStore';
import type { Child } from '../../services/subsonicService';

const mockFetch = fetchAllSongsByTitleAsync as jest.Mock;

const song = (id: string, albumId: string, title: string): Child =>
  ({ id, albumId, title }) as Child;

const titles = (list: Child[] | null) => (list ?? []).map((s) => s.title);

beforeEach(() => {
  mockFetch.mockReset();
  songLibraryStore.getState().reset();
});

describe('songLibraryStore — build', () => {
  it('populates the base list from the DB read', async () => {
    mockFetch.mockResolvedValue([song('1', 'a', 'Alpha'), song('2', 'b', 'Bravo')]);
    await songLibraryStore.getState().build();
    expect(titles(songLibraryStore.getState().base)).toEqual(['Alpha', 'Bravo']);
    expect(songLibraryStore.getState().building).toBe(false);
  });

  it('no-ops when already built; rebuilds on force', async () => {
    mockFetch.mockResolvedValue([song('1', 'a', 'Alpha')]);
    await songLibraryStore.getState().build();
    expect(mockFetch).toHaveBeenCalledTimes(1);

    await songLibraryStore.getState().build(); // already built → no read
    expect(mockFetch).toHaveBeenCalledTimes(1);

    mockFetch.mockResolvedValue([song('1', 'a', 'Alpha'), song('9', 'z', 'Zeta')]);
    await songLibraryStore.getState().build(true); // force
    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(titles(songLibraryStore.getState().base)).toEqual(['Alpha', 'Zeta']);
  });
});

describe('songLibraryStore — patchAlbum', () => {
  beforeEach(async () => {
    mockFetch.mockResolvedValue([
      song('1', 'a', 'Apple'),
      song('2', 'b', 'Cherry'),
    ]);
    await songLibraryStore.getState().build();
  });

  it('swaps an album’s songs in, keeping title order', () => {
    songLibraryStore.getState().patchAlbum('a', [song('3', 'a', 'Avocado')]);
    expect(titles(songLibraryStore.getState().base)).toEqual(['Avocado', 'Cherry']);
  });

  it('is a no-op (same array reference) when the album is unchanged', () => {
    const before = songLibraryStore.getState().base;
    songLibraryStore.getState().patchAlbum('a', [song('1', 'a', 'Apple')]);
    expect(songLibraryStore.getState().base).toBe(before);
  });

  it('adds songs for a brand-new album in sorted position', () => {
    songLibraryStore.getState().patchAlbum('c', [song('4', 'c', 'Banana')]);
    expect(titles(songLibraryStore.getState().base)).toEqual(['Apple', 'Banana', 'Cherry']);
  });

  it('does nothing before the base is built', () => {
    songLibraryStore.getState().reset();
    songLibraryStore.getState().patchAlbum('a', [song('3', 'a', 'Avocado')]);
    expect(songLibraryStore.getState().base).toBeNull();
  });
});

describe('songLibraryStore — removeAlbums', () => {
  beforeEach(async () => {
    mockFetch.mockResolvedValue([
      song('1', 'a', 'Apple'),
      song('2', 'b', 'Cherry'),
    ]);
    await songLibraryStore.getState().build();
  });

  it('drops songs for the given albums', () => {
    songLibraryStore.getState().removeAlbums(['a']);
    expect(titles(songLibraryStore.getState().base)).toEqual(['Cherry']);
  });

  it('is a no-op (same reference) when no songs match', () => {
    const before = songLibraryStore.getState().base;
    songLibraryStore.getState().removeAlbums(['zzz']);
    expect(songLibraryStore.getState().base).toBe(before);
  });
});
