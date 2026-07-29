import { writable, get } from 'svelte/store';
import { getEmosUser } from '$lib/stores/emos-auth';
import { likeSong, getLikedIds } from '$lib/services/emos';

export const favoriteIds = writable<Set<number>>(new Set());
const loaded = writable(false);

async function loadLikedIds(): Promise<void> {
	if (get(loaded)) return;
	if (!getEmosUser()) return;
	try {
		const ids = await getLikedIds();
		favoriteIds.set(new Set(ids));
	} catch {
		console.warn('Failed to load liked song ids');
	}
	loaded.set(true);
}

async function toggleFavorite(emosId: number): Promise<void> {
	if (!emosId) return;
	const ids = get(favoriteIds);
	const isLiked = ids.has(emosId);
	try {
		await likeSong(emosId, !isLiked);
		if (isLiked) ids.delete(emosId);
		else ids.add(emosId);
		favoriteIds.set(new Set(ids));
	} catch (e) {
		console.warn('Failed to toggle favorite:', e);
	}
}

function isFavorite(emosId: number): boolean {
	return get(favoriteIds).has(emosId);
}

function reset(): void {
	favoriteIds.set(new Set());
	loaded.set(false);
}

export function getFavoriteStore() {
	return {
		favoriteIds,
		loaded,
		loadLikedIds,
		toggleFavorite,
		isFavorite,
		reset
	};
}
