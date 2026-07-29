import { cloudsearch } from '$lib/services/emos';
import type { EmosArtist, EmosArtistAlbum, EmosSong } from '$lib/types/emos';

export interface EmosSearchResults {
	artists: EmosArtist[];
	albums: EmosArtistAlbum[];
	songs: EmosSong[];
}

const SAFE_SONG_COUNT = 4;

const searchCache = new Map<string, EmosSearchResults>();

export function getCachedEmosSearch(query: string): EmosSearchResults | null {
	return searchCache.get(query) ?? null;
}

export async function loadEmosSearch(query: string): Promise<EmosSearchResults> {
	if (!query) return { artists: [], albums: [], songs: [] };
	const cached = searchCache.get(query);
	if (cached) return cached;
	const [songResult, artistResult, albumResult] = await Promise.all([
		cloudsearch(query, SAFE_SONG_COUNT, 1, 0),
		cloudsearch(query, 21, 100, 0),
		cloudsearch(query, 21, 10, 0)
	]);
	const data: EmosSearchResults = {
		artists: artistResult.artists ?? [],
		albums: albumResult.albums ?? [],
		songs: songResult.songs ?? []
	};
	searchCache.set(query, data);
	if (searchCache.size > 20) {
		const firstKey = searchCache.keys().next().value;
		if (firstKey !== undefined) searchCache.delete(firstKey);
	}
	return data;
}
