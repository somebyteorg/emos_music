import type { EmosArtist, EmosArtistAlbum, EmosSong, EmosPlaylist } from '$lib/types/emos';

export interface SearchCacheEntry {
	artists: EmosArtist[]; artistsHasMore: boolean;
	albums: EmosArtistAlbum[]; albumsHasMore: boolean;
	songs: EmosSong[]; songsHasMore: boolean;
	playlists: EmosPlaylist[]; playlistsHasMore: boolean;
}

const searchCache = new Map<string, SearchCacheEntry>();

export function getSearchCache(q: string): SearchCacheEntry | undefined {
	return searchCache.get(q);
}

export function setSearchCache(q: string, entry: SearchCacheEntry): void {
	searchCache.set(q, entry);
	if (searchCache.size > 20) {
		const firstKey = searchCache.keys().next().value;
		if (firstKey !== undefined) searchCache.delete(firstKey);
	}
}
