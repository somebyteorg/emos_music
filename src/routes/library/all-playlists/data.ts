import { getUserPlaylists } from '$lib/services/emos';
import type { EmosPlaylist } from '$lib/types/emos';
import { createPageCache } from '$lib/utils/page-cache-helper';
import { PAGINATION } from '$lib/utils/constants';

const defaults = {
	playlists: [] as EmosPlaylist[],
	hasMore: false,
	currentPage: 0
};

export const pc = createPageCache('library-all-playlists', defaults);

export async function loadPlaylists(reset: boolean): Promise<void> {
	if (pc.loaded() && !reset) return;
	if (reset) pc.markLoaded();

	const offset = reset ? 0 : pc.get('currentPage') * PAGINATION.DEFAULT_LIMIT;
	try {
		const result = await getUserPlaylists(PAGINATION.DEFAULT_LIMIT, offset);
		const existing = reset ? [] : pc.get('playlists');
		const existingIds = new Set(existing.map(p => p.id));
		const merged = reset ? result.playlists : [...existing, ...result.playlists.filter(p => !existingIds.has(p.id))];
		pc.set('playlists', merged);
		pc.set('hasMore', result.more);
		pc.set('currentPage', reset ? 1 : pc.get('currentPage') + 1);
	} catch (e) {
		if (reset) pc.invalidate(); // 首次加载失败清除标记，重进可重试
		console.warn('Failed to load library playlists:', e);
		throw e;
	}
}
