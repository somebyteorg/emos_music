import { getLikedSongs } from '$lib/services/emos';
import type { EmosSong } from '$lib/types/emos';
import { createPageCache } from '$lib/utils/page-cache-helper';
import { PAGINATION } from '$lib/utils/constants';
import type { SortField, SortOrder } from '$lib/utils/constants';

const defaults = {
	songs: [] as EmosSong[],
	total: 0,
	currentOffset: 0
};

export const pc = createPageCache('library-songs', defaults);

export async function loadSongs(reset: boolean): Promise<void> {
	if (pc.loaded() && !reset) return;
	if (reset) pc.markLoaded();

	const offset = reset ? 0 : pc.get('currentOffset');
	try {
		const result = await getLikedSongs(PAGINATION.DEFAULT_LIMIT, offset);
		const existing = reset ? [] : pc.get('songs');
		const existingIds = new Set(existing.map(s => s.id));
		const newSongs = result.songs.filter(s => !existingIds.has(s.id));
		const merged = reset ? result.songs : [...existing, ...newSongs];
		pc.set('songs', merged);
		pc.set('total', result.total);
		pc.set('currentOffset', reset ? PAGINATION.DEFAULT_LIMIT : offset + PAGINATION.DEFAULT_LIMIT);
	} catch (e) {
		if (reset) pc.invalidate(); // 首次加载失败清除标记，重进可重试
		console.warn('Failed to load liked songs:', e);
		throw e;
	}
}

export function sortSongs(songs: EmosSong[], field: SortField, order: SortOrder): EmosSong[] {
	const list = [...songs];
	list.sort((a, b) => {
		const cmp = field === 'title'
			? a.name.localeCompare(b.name, 'zh')
			: (a.publishTime ?? 0) - (b.publishTime ?? 0);
		return order === 'ascending' ? cmp : -cmp;
	});
	return list;
}