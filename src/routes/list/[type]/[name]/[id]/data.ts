import { getArtistAlbums, getArtistTopSongs, cloudsearch, getTopPlaylist, getTopSongs, getTopAlbums, getNewAlbums, getHotSongs, getUserPlaylists, getPlaylistDetail } from '$lib/services/emos';
import { getEmosUser } from '$lib/stores/emos-auth';
import { PAGINATION } from '$lib/utils/constants';
import type { EmosSong, EmosArtistAlbum, EmosPlaylist, EmosArtist } from '$lib/types/emos';
import { createPageCache } from '$lib/utils/page-cache-helper';

export type ListType = 'albums' | 'songs' | 'playlists' | 'artists';
export type SourceType = 'topSongs' | 'topAlbums' | 'newAlbums' | 'energyPlaylists' | 'everyonePlaylists' | 'hotSongs' | 'categoryPlaylists' | 'hotList' | 'playlist' | 'artist' | 'search' | 'userPlaylists';

export const EXPLORE_CATEGORIES = ['按风格浏览', '来自全球', '年代之声', '心情与活动', '排行榜'];
export const CATEGORY_API_MAP: Record<string, string> = { '按风格浏览': '流行', '来自全球': '华语', '年代之声': '80后', '心情与活动': '治愈', '排行榜': '榜单' };

export const TITLE_MAP: Record<string, string> = { albums: '专辑', songs: '歌曲', playlists: '歌单', artists: '艺人' };
export const ERROR_MAP: Record<string, string> = { albums: '加载专辑失败', songs: '加载歌曲失败', playlists: '加载歌单失败', artists: '加载艺人失败' };
export const EMPTY_MAP: Record<string, string> = { albums: '暂无专辑', songs: '暂无歌曲', playlists: '暂无歌单', artists: '暂无艺人' };

const NAME_TO_SOURCE: [RegExp, SourceType][] = [
	[/^新歌精选$/, 'topSongs'],
	[/^本周新发行$/, 'topAlbums'],
	[/^新近发布$/, 'newAlbums'],
	[/^蓄满能量再出发 🔋$/, 'energyPlaylists'],
	[/^大家都在听$/, 'everyonePlaylists'],
	[/^正在流行中$/, 'hotSongs'],
	[/^每周热门100首$/, 'hotList'],
	[/^我的歌单$/, 'userPlaylists'],
];

export function resolveSource(name: string, type: ListType, id: number, isExplore: boolean): SourceType {
	if (isExplore) return 'categoryPlaylists';
	for (const [re, src] of NAME_TO_SOURCE) {
		if (re.test(name)) return src;
	}
	if (type === 'playlists' && !id) return 'categoryPlaylists';
	if (id) return 'artist';
	return 'search';
}

export function isHalfYearTitle(name: string): boolean {
	return /^\d{4}(上|下)半年榜单$/.test(name);
}

function appendItems<T>(existing: T[], incoming: T[], keyFn: (item: T) => number): T[] {
	const existingIds = new Set(existing.map(keyFn));
	return [...existing, ...incoming.filter(item => !existingIds.has(keyFn(item)))];
}

const defaults = {
	albums: [] as EmosArtistAlbum[],
	songs: [] as EmosSong[],
	playlists: [] as EmosPlaylist[],
	artists: [] as EmosArtist[],
	hasMore: false,
	currentPage: 0
};

export function createListCache(type: string, name: string, id: number) {
	return createPageCache(`list-${type}-${name}-${id}`, defaults);
}

export async function loadListData(
	pc: ReturnType<typeof createListCache>,
	source: SourceType,
	type: ListType,
	name: string,
	id: number,
	reset: boolean
): Promise<void> {
	if (reset) {
		pc.markLoaded();
	}

	const offset = reset ? 0 : pc.get('currentPage') * PAGINATION.DEFAULT_LIMIT;

	try {
		switch (source) {
			case 'topSongs': {
				const data = await getTopSongs(PAGINATION.DEFAULT_LIMIT, offset);
				if (reset) pc.set('songs', data.songs);
				pc.set('hasMore', data.hasMore);
				break;
			}
			case 'topAlbums': {
				const data = await getTopAlbums(PAGINATION.DEFAULT_LIMIT, offset);
				if (reset) pc.set('albums', data.albums);
				pc.set('hasMore', data.hasMore);
				break;
			}
			case 'newAlbums': {
				const data = await getNewAlbums(PAGINATION.DEFAULT_LIMIT, offset);
				const existing = reset ? [] : pc.get('albums');
				pc.set('albums', reset ? data.albums : appendItems(existing, data.albums, a => a.id));
				pc.set('hasMore', data.hasMore);
				pc.set('currentPage', reset ? 1 : pc.get('currentPage') + 1);
				break;
			}
			case 'energyPlaylists': {
				const data = await getTopPlaylist('兴奋', PAGINATION.DEFAULT_LIMIT, offset);
				const existing = reset ? [] : pc.get('playlists');
				pc.set('playlists', reset ? data.playlists : appendItems(existing, data.playlists, p => p.id));
				pc.set('hasMore', data.more);
				pc.set('currentPage', reset ? 1 : pc.get('currentPage') + 1);
				break;
			}
			case 'everyonePlaylists': {
				const data = await getTopPlaylist('全部', PAGINATION.DEFAULT_LIMIT, offset);
				const existing = reset ? [] : pc.get('playlists');
				pc.set('playlists', reset ? data.playlists : appendItems(existing, data.playlists, p => p.id));
				pc.set('hasMore', data.more);
				pc.set('currentPage', reset ? 1 : pc.get('currentPage') + 1);
				break;
			}
			case 'hotSongs': {
				const data = await getHotSongs(PAGINATION.DEFAULT_LIMIT, offset);
				const existing = reset ? [] : pc.get('songs');
				pc.set('songs', reset ? data.songs : appendItems(existing, data.songs, s => s.id));
				pc.set('hasMore', data.hasMore);
				pc.set('currentPage', reset ? 1 : pc.get('currentPage') + 1);
				break;
			}
			case 'categoryPlaylists': {
				const cat = CATEGORY_API_MAP[name] ?? name;
				const data = await getTopPlaylist(cat, PAGINATION.DEFAULT_LIMIT, offset);
				const existing = reset ? [] : pc.get('playlists');
				pc.set('playlists', reset ? data.playlists : appendItems(existing, data.playlists, p => p.id));
				pc.set('hasMore', data.more);
				pc.set('currentPage', reset ? 1 : pc.get('currentPage') + 1);
				break;
			}
			case 'hotList': {
				const data = await getPlaylistDetail(3778678);
				if (reset) pc.set('songs', data.playlist.tracks);
				pc.set('hasMore', false);
				break;
			}
			case 'playlist': {
				const data = await getTopPlaylist(name, PAGINATION.DEFAULT_LIMIT, offset);
				const existing = reset ? [] : pc.get('playlists');
				pc.set('playlists', reset ? data.playlists : appendItems(existing, data.playlists, p => p.id));
				pc.set('hasMore', data.more);
				pc.set('currentPage', reset ? 1 : pc.get('currentPage') + 1);
				break;
			}
			case 'artist': {
				if (!id) return;
				if (type === 'albums') {
					const data = await getArtistAlbums(id, PAGINATION.DEFAULT_LIMIT, offset);
					const existing = reset ? [] : pc.get('albums');
					pc.set('albums', reset ? data.albums : appendItems(existing, data.albums, a => a.id));
					pc.set('hasMore', data.more);
					pc.set('currentPage', reset ? 1 : pc.get('currentPage') + 1);
				} else {
					const data = await getArtistTopSongs(id, PAGINATION.DEFAULT_LIMIT, offset);
					const existing = reset ? [] : pc.get('songs');
					pc.set('songs', reset ? data.songs : appendItems(existing, data.songs, s => s.id));
					pc.set('hasMore', pc.get('songs').length < data.total);
					pc.set('currentPage', reset ? 1 : pc.get('currentPage') + 1);
				}
				break;
			}
			case 'search': {
				await loadSearchData(pc, type, name, reset, offset);
				break;
			}
			case 'userPlaylists': {
				const user = getEmosUser();
				if (user) {
					const data = await getUserPlaylists(PAGINATION.DEFAULT_LIMIT, offset);
					const existing = reset ? [] : pc.get('playlists');
					pc.set('playlists', reset ? data.playlists : appendItems(existing, data.playlists, p => p.id));
					pc.set('hasMore', data.more);
					pc.set('currentPage', reset ? 1 : pc.get('currentPage') + 1);
				}
				break;
			}
		}
	} catch (e) {
		console.warn(`Failed to load ${type}:`, e);
		throw e;
	}
}

async function loadSearchData(pc: ReturnType<typeof createListCache>, type: ListType, name: string, reset: boolean, offset: number): Promise<void> {
	if (!name) return;
	const apiTypeMap: Record<string, number> = { songs: 1, albums: 10, artists: 100, playlists: 1000 };
	const apiType = apiTypeMap[type] ?? 1;

	const data = await cloudsearch(name, PAGINATION.DEFAULT_LIMIT, apiType, offset);
	if (type === 'songs') {
		const existing = reset ? [] : pc.get('songs');
		pc.set('songs', reset ? (data.songs ?? []) : appendItems(existing, data.songs ?? [], s => s.id));
		pc.set('hasMore', data.hasMore ?? (pc.get('songs').length < (data.songCount ?? 0)));
	} else if (type === 'albums') {
		const existing = reset ? [] : pc.get('albums');
		pc.set('albums', reset ? (data.albums ?? []) : appendItems(existing, data.albums ?? [], a => a.id));
		pc.set('hasMore', pc.get('albums').length < (data.albumCount ?? 0));
	} else if (type === 'artists') {
		const existing = reset ? [] : pc.get('artists');
		pc.set('artists', reset ? (data.artists ?? []) : appendItems(existing, data.artists ?? [], a => a.id));
		pc.set('hasMore', data.hasMore ?? false);
	} else if (type === 'playlists') {
		const existing = reset ? [] : pc.get('playlists');
		pc.set('playlists', reset ? (data.playlists ?? []) : appendItems(existing, data.playlists ?? [], p => p.id));
		pc.set('hasMore', data.hasMore ?? (pc.get('playlists').length < (data.playlistCount ?? 0)));
	}
	pc.set('currentPage', reset ? 1 : pc.get('currentPage') + 1);
}
