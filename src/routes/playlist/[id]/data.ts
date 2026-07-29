import { getPlaylistDetail, subscribePlaylist } from '$lib/services/emos';
import type { EmosSong, EmosPlaylist } from '$lib/types/emos';
import { createPageCache } from '$lib/utils/page-cache-helper';
import { isEmosLoggedIn } from '$lib/stores/emos-auth';
import { invalidatePage, setPageData, bumpPlaylistLibraryVersion } from '$lib/stores/page-cache';
import { PLAY_COUNT } from '$lib/utils/constants';

type PlaylistDetail = EmosPlaylist & { tracks: EmosSong[] };

const defaults = {
	playlist: null as PlaylistDetail | null,
	isInLibrary: false as boolean
};

export function createPlaylistCache(id: number) {
	return createPageCache(`playlist-${id}`, defaults);
}

export async function loadPlaylistData(id: number, pc: ReturnType<typeof createPlaylistCache>): Promise<void> {
	if (pc.loaded()) {
		pc.syncFromCache();
		return;
	}
	pc.markLoaded();

	const data = await getPlaylistDetail(id);

	pc.set('playlist', data.playlist);
	pc.set('isInLibrary', data.playlist.subscribed ?? false);
}

export async function togglePlaylistLibrary(playlist: PlaylistDetail, isInLibrary: boolean, cacheKey: string): Promise<boolean> {
	if (!playlist || !isEmosLoggedIn()) return false;
	try {
		const success = await subscribePlaylist(playlist.id, !isInLibrary);
		if (success) {
			invalidatePage('library-all-playlists');
			bumpPlaylistLibraryVersion();
			return true;
		}
	} catch (e) {
		console.warn('Failed to toggle library:', e);
	}
	return false;
}

export function formatPlayCount(count: number): string {
	if (count >= PLAY_COUNT.YI) return `${(count / PLAY_COUNT.YI).toFixed(1)}亿`;
	if (count >= PLAY_COUNT.WAN) return `${(count / PLAY_COUNT.WAN).toFixed(1)}万`;
	return `${count}`;
}