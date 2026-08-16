export interface RecentSearchItem {
	type: 'song' | 'album' | 'artist' | 'playlist';
	id: number;
	name: string;
	imageUrl: string;
	subtitle: string;
}

const STORAGE_KEY = 'recent-searches';
const MAX_ITEMS = 10;

function loadFromStorage(): RecentSearchItem[] {
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) return [];
		return JSON.parse(raw) as RecentSearchItem[];
	} catch (e) { console.warn('Failed to load recent searches:', e); return []; }
}

function saveToStorage(items: RecentSearchItem[]): void {
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
	} catch {
		console.warn('Failed to save recent searches');
	}
}

let memoryItems: RecentSearchItem[] | null = null;

export function getRecentSearches(): RecentSearchItem[] {
	if (memoryItems === null) {
		memoryItems = loadFromStorage();
	}
	return memoryItems;
}

export function addRecentSearch(item: RecentSearchItem): void {
	const items = getRecentSearches();
	const filtered = items.filter(i => !(i.type === item.type && i.id === item.id));
	const updated = [item, ...filtered].slice(0, MAX_ITEMS);
	memoryItems = updated;
	saveToStorage(updated);
}

export function clearRecentSearches(): void {
	memoryItems = [];
	localStorage.removeItem(STORAGE_KEY);
}