import { getSubscribedArtists } from '$lib/services/emos';
import type { EmosArtist } from '$lib/types/emos';
import { createPageCache } from '$lib/utils/page-cache-helper';
import { PAGINATION } from '$lib/utils/constants';
import type { SortField, SortOrder } from '$lib/utils/constants';

const defaults = {
	artists: [] as EmosArtist[],
	hasMore: false,
	currentPage: 0
};

export const pc = createPageCache('library-artists', defaults);

export async function loadArtists(reset: boolean): Promise<void> {
	if (pc.loaded() && !reset) return;
	if (reset) pc.markLoaded();

	const offset = reset ? 0 : pc.get('currentPage') * PAGINATION.DEFAULT_LIMIT;
	try {
		const result = await getSubscribedArtists(PAGINATION.DEFAULT_LIMIT, offset);
		const existing = reset ? [] : pc.get('artists');
		const existingIds = new Set(existing.map(a => a.id));
		const merged = reset ? result.artists : [...existing, ...result.artists.filter(a => !existingIds.has(a.id))];
		pc.set('artists', merged);
		pc.set('hasMore', result.more);
		pc.set('currentPage', reset ? 1 : pc.get('currentPage') + 1);
	} catch (e) {
		console.warn('Failed to load library artists:', e);
		throw e;
	}
}

export function sortArtists(artists: EmosArtist[], field: SortField, order: SortOrder): EmosArtist[] {
	const list = [...artists];
	list.sort((a, b) => {
		const cmp = field === 'title'
			? a.name.localeCompare(b.name, 'zh')
			: (a.albumSize ?? 0) - (b.albumSize ?? 0);
		return order === 'ascending' ? cmp : -cmp;
	});
	return list;
}