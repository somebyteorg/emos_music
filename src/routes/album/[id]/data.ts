import { getAlbumDetail, getArtistAlbums, getSimilarSongs } from '$lib/services/emos';
import type { EmosAlbum, EmosArtistAlbum } from '$lib/types/emos';
import { formatTotalDuration } from '$lib/utils/format';
import { createPageCache } from '$lib/utils/page-cache-helper';
import { subscribeAlbum } from '$lib/services/emos';
import { isEmosLoggedIn } from '$lib/stores/emos-auth';
import { invalidatePage } from '$lib/stores/page-cache';

const defaults = {
	album: null as EmosAlbum | null,
	artistAlbums: [] as EmosArtistAlbum[],
	youMightAlsoLike: [] as EmosArtistAlbum[],
	isInLibrary: false as boolean
};

export function createAlbumCache(id: number) {
	const cacheKey = `album-${id}`;
	return createPageCache(cacheKey, defaults);
}

export async function loadAlbumData(id: number, pc: ReturnType<typeof createAlbumCache>): Promise<void> {
	if (pc.loaded()) {
		pc.syncFromCache();
		return;
	}
	pc.markLoaded();

	let albumData;
	try {
		albumData = await getAlbumDetail(id);
	} catch (e) {
		pc.invalidate();
		throw e;
	}
	pc.set('album', albumData);
	pc.set('isInLibrary', albumData.isSub ?? false);

	const parallelTasks: Promise<void>[] = [];

	if (albumData.artist?.id) {
		parallelTasks.push((async () => {
			try {
				const data = await getArtistAlbums(albumData.artist!.id, 21);
				pc.set('artistAlbums', (data.albums ?? []).filter(a => a.id !== id));
			} catch (e) { console.warn('Failed to load artist albums:', e); }
		})());
	}

	if (albumData.songs.length > 0) {
		parallelTasks.push((async () => {
			try {
				const data = await getSimilarSongs(albumData.songs[0].id, 21);
				const seen = new Set<number>();
				const albums: EmosArtistAlbum[] = [];
				for (const s of data) {
					if (s.al?.id && s.al.id !== id && !seen.has(s.al.id)) {
						seen.add(s.al.id);
						albums.push({ id: s.al.id, name: s.al.name, picUrl: s.al.picUrl, type: '', size: 0 });
					}
					if (albums.length >= 12) break;
				}
				pc.set('youMightAlsoLike', albums);
			} catch (e) { console.warn('Failed to load similar songs:', e); }
		})());
	}

	await Promise.all(parallelTasks);
}

export async function toggleAlbumLibrary(album: EmosAlbum, isInLibrary: boolean, cacheKey: string): Promise<boolean> {
	if (!album || !isEmosLoggedIn()) return false;
	try {
		const success = await subscribeAlbum(album.id, !isInLibrary);
		if (success) {
			invalidatePage('library-albums');
			return true;
		}
	} catch (e) {
		console.warn('Failed to toggle library:', e);
	}
	return false;
}

export function getAlbumType(album: EmosAlbum | null): string {
	if (!album) return '专辑';
	if (album.type === 'Single') return '单曲';
	if (album.type === 'EP') return 'EP';
	return '专辑';
}

export function getAlbumYear(album: EmosAlbum | null): string {
	if (!album?.publishTime) return '';
	return `${new Date(album.publishTime).getFullYear()}年`;
}

export function getMetadataBottom(album: EmosAlbum | null): string {
	if (!album) return '';
	const parts: string[] = [];
	if (album.tags?.length) parts.push(album.tags.join(' / '));
	const year = getAlbumYear(album);
	if (year) parts.push(year);
	return parts.join(' · ');
}

export function getFooterText(album: EmosAlbum | null): string {
	if (!album) return '';
	const date = album.publishTime ? new Date(album.publishTime).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' }) : '';
	const duration = formatTotalDuration(album.songs.reduce((sum, s) => sum + s.dt, 0));
	const parts = [date, `${album.size} 首歌曲、${duration}`];
	if (album.company) parts.push(`℗ ${album.company}`);
	return parts.join('\n');
}