import { getArtistDetail, getArtistAlbums, getArtistTopSongs, subscribeArtist } from '$lib/services/emos';
import type { EmosArtist, EmosArtistAlbum, EmosSong } from '$lib/types/emos';
import { createPageCache } from '$lib/utils/page-cache-helper';
import { isEmosLoggedIn } from '$lib/stores/emos-auth';
import { invalidatePage } from '$lib/stores/page-cache';

const defaults = {
	artist: null as EmosArtist | null,
	latestAlbum: null as EmosArtistAlbum | null,
	topSongs: [] as EmosSong[],
	featuredAlbums: [] as EmosArtistAlbum[],
	isInLibrary: false as boolean
};

export function createArtistCache(id: number) {
	return createPageCache(`artist-${id}`, defaults);
}

export async function loadArtistData(id: number, pc: ReturnType<typeof createArtistCache>): Promise<void> {
	if (pc.loaded()) {
		pc.syncFromCache();
		return;
	}
	pc.markLoaded();

	let artistData: EmosArtist;
	let albumData: { albums: EmosArtistAlbum[] };
	let topSongsResult: { songs: EmosSong[] };
	try {
		[artistData, albumData, topSongsResult] = await Promise.all([
			getArtistDetail(id),
			getArtistAlbums(id, 21),
			getArtistTopSongs(id, 21)
		]);
	} catch (e) {
		pc.invalidate();
		throw e;
	}

	pc.set('artist', artistData);
	pc.set('isInLibrary', artistData.isSub ?? false);
	pc.set('latestAlbum', albumData.albums.length > 0 ? albumData.albums[0] : null);
	pc.set('featuredAlbums', albumData.albums);
	pc.set('topSongs', topSongsResult.songs);
}

export async function toggleArtistLibrary(artist: EmosArtist, isInLibrary: boolean, cacheKey: string): Promise<boolean> {
	if (!artist || !isEmosLoggedIn()) return false;
	try {
		const success = await subscribeArtist(artist.id, !isInLibrary);
		if (success) {
			invalidatePage('library-artists');
			return true;
		}
	} catch (e) {
		console.warn('Failed to toggle library:', e);
	}
	return false;
}

export function latestAlbumHeadline(album: EmosArtistAlbum): string {
	if (!album.publishTime) return '';
	return new Date(album.publishTime).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });
}

export function latestAlbumSubtitle(album: EmosArtistAlbum): string {
	return album.size ? `${album.size} 首歌曲` : '';
}

export function songSubtitle(song: EmosSong): string {
	const albumName = song.al?.name ?? '';
	const year = song.publishTime ? ` · ${new Date(song.publishTime).getFullYear()}年` : '';
	return albumName + year;
}