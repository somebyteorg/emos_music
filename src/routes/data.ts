import { getTopSongs, getTopAlbums, getNewAlbums, getArtworkUrl, getSongDetail } from '$lib/services/emos';
import type { EmosSong, EmosArtistAlbum } from '$lib/types/emos';
import { ARTWORK_SIZE } from '$lib/utils/constants';
import { createPageCache } from '$lib/utils/page-cache-helper';
import { playSong } from '$lib/stores/player';
import { concurrentLimit } from '$lib/utils/concurrent';

const defaults = {
	topSongs: [] as EmosSong[],
	topAlbums: [] as EmosArtistAlbum[],
	newAlbums: [] as EmosArtistAlbum[]
};

export type HomePageData = typeof defaults;

export const pc = createPageCache('home', defaults);

export async function loadAllData(): Promise<HomePageData> {
	if (!pc.loaded()) {
		pc.markLoaded();
		const set = async <K extends keyof typeof defaults>(field: K, fn: () => Promise<typeof defaults[K]>): Promise<void> => {
			try {
				const data = await fn();
				pc.set(field, data);
			} catch (e) {
				console.warn(`Failed to load ${field}:`, e);
			}
		};
		await concurrentLimit([
			async () => {
				const data = await getTopSongs(21);
				await set('topSongs', async () => data.songs);
			},
			async () => {
				const data = await getTopAlbums(21);
				await set('topAlbums', async () => data.albums);
			},
			async () => {
				const data = await getNewAlbums(21);
				await set('newAlbums', async () => data.albums);
			}
		], 3);
	}
	pc.syncFromCache();
	return {
		topSongs: pc.get('topSongs'),
		topAlbums: pc.get('topAlbums'),
		newAlbums: pc.get('newAlbums')
	};
}

export async function playSongById(id: number): Promise<void> {
	try {
		const song = await getSongDetail(id);
		if (song) playSong(song, [song]);
	} catch (e) {
		console.warn('Failed to play song:', e);
	}
}

export async function playDailyRecommend(): Promise<void> {
	try {
		const { songs } = await getTopSongs(21);
		if (songs.length > 0) playSong(songs[0], songs);
	} catch (e) {
		console.warn('Failed to play daily recommend:', e);
	}
}

export function getResourceLinkHref(r: { type: string; id: number }): string {
	if (r.type === 'list') return `/playlist/${r.id}`;
	if (r.type === 'song') return `/song/${r.id}`;
	if (r.type === 'voice') return `/song/${r.id}`;
	if (r.type === 'album') return `/album/${r.id}`;
	return '#';
}

export function getResourceOnPlay(r: { type: string; id: number }): (() => Promise<void>) | undefined {
	if (r.type === 'song') return () => playSongById(r.id);
	return undefined;
}

export function songSubtitle(song: EmosSong): string {
	return song.ar?.map(a => a.name).join(' / ') ?? '';
}

export function albumSections(data: HomePageData): { blockCode: string; title: string; resources: { id: number; type: string; name: string; subTitle: string; imageUrl: string }[] }[] {
	return [
		{
			blockCode: 'top-albums',
			title: '可播放专辑',
			resources: data.topAlbums.map((album) => ({
				id: album.id,
				type: 'album',
				name: album.name,
				subTitle: album.artist?.name ?? album.type,
				imageUrl: getArtworkUrl(album.picUrl, ARTWORK_SIZE.LIST)
			}))
		},
		{
			blockCode: 'new-albums',
			title: '最近专辑',
			resources: data.newAlbums.map((album) => ({
				id: album.id,
				type: 'album',
				name: album.name,
				subTitle: album.artist?.name ?? album.type,
				imageUrl: getArtworkUrl(album.picUrl, ARTWORK_SIZE.LIST)
			}))
		}
	].filter((section) => section.resources.length > 0);
}
