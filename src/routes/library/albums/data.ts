import { getSubscribedAlbums } from '$lib/services/emos';
import type { EmosArtistAlbum } from '$lib/types/emos';
import { createPageCache } from '$lib/utils/page-cache-helper';
import { PAGINATION } from '$lib/utils/constants';
import type { SortField, SortOrder } from '$lib/utils/constants';

const defaults = {
	albums: [] as EmosArtistAlbum[],
	hasMore: false,
	currentPage: 0
};

export const pc = createPageCache('library-albums', defaults);

export async function loadAlbums(reset: boolean): Promise<void> {
	if (pc.loaded() && !reset) return;
	if (reset) pc.markLoaded();

	const offset = reset ? 0 : pc.get('currentPage') * PAGINATION.DEFAULT_LIMIT;
	try {
		const result = await getSubscribedAlbums(PAGINATION.DEFAULT_LIMIT, offset);
		const existing = reset ? [] : pc.get('albums');
		const existingIds = new Set(existing.map(a => a.id));
		const merged = reset ? result.albums : [...existing, ...result.albums.filter(a => !existingIds.has(a.id))];
		pc.set('albums', merged);
		pc.set('hasMore', result.more);
		pc.set('currentPage', reset ? 1 : pc.get('currentPage') + 1);
	} catch (e) {
		if (reset) pc.invalidate(); // 首次加载失败清除标记，重进可重试
		console.warn('Failed to load library albums:', e);
		throw e;
	}
}

export function sortAlbums(albums: EmosArtistAlbum[], field: SortField, order: SortOrder): EmosArtistAlbum[] {
	const list = [...albums];
	list.sort((a, b) => {
		const cmp = field === 'title'
			? a.name.localeCompare(b.name, 'zh')
			: (a.publishTime ?? 0) - (b.publishTime ?? 0);
		return order === 'ascending' ? cmp : -cmp;
	});
	return list;
}