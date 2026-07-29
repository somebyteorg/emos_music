type CacheEntry = {
	data: Record<string, unknown>;
	loaded: boolean;
	createdAt: number;
};

const DEFAULT_TTL = 10 * 60 * 1000;
const MAX_ENTRIES = 30;

const cache = new Map<string, CacheEntry>();
const listeners = new Map<string, Set<() => void>>();

function isExpired(entry: CacheEntry): boolean {
	return Date.now() - entry.createdAt > DEFAULT_TTL;
}

function touchEntry(key: string): void {
	const entry = cache.get(key);
	if (!entry) return;
	cache.delete(key);
	cache.set(key, entry);
}

function evictIfNeeded(): void {
	if (cache.size <= MAX_ENTRIES) return;
	const oldest = cache.keys().next().value;
	if (oldest !== undefined) {
		cache.delete(oldest);
		listeners.delete(oldest);
	}
}

export function getPageData<T>(key: string, field: string, defaultValue: T): T {
	const entry = cache.get(key);
	if (!entry || isExpired(entry)) {
		if (entry) { cache.delete(key); listeners.delete(key); }
		return defaultValue;
	}
	touchEntry(key);
	return (entry.data[field] as T) ?? defaultValue;
}

export function setPageData(key: string, field: string, value: unknown): void {
	let entry = cache.get(key);
	if (entry) {
		touchEntry(key);
	} else {
		entry = { data: {}, loaded: false, createdAt: Date.now() };
		cache.set(key, entry);
		evictIfNeeded();
	}
	entry.data[field] = value;
	notify(key);
}

export function setPageDataBatch(key: string, fields: Record<string, unknown>): void {
	let entry = cache.get(key);
	if (entry) {
		touchEntry(key);
	} else {
		entry = { data: {}, loaded: false, createdAt: Date.now() };
		cache.set(key, entry);
		evictIfNeeded();
	}
	for (const [field, value] of Object.entries(fields)) {
		entry.data[field] = value;
	}
	notify(key);
}

export function isPageLoaded(key: string): boolean {
	const entry = cache.get(key);
	if (!entry) return false;
	if (isExpired(entry)) {
		cache.delete(key);
		listeners.delete(key);
		return false;
	}
	touchEntry(key);
	return entry.loaded;
}

export function markPageLoaded(key: string): void {
	let entry = cache.get(key);
	if (entry) {
		touchEntry(key);
		entry.loaded = true;
	} else {
		entry = { data: {}, loaded: true, createdAt: Date.now() };
		cache.set(key, entry);
		evictIfNeeded();
	}
}

export function invalidatePage(key: string): void {
	notify(key);
	cache.delete(key);
	listeners.delete(key);
}


let playlistLibraryVersion = 0;
const playlistLibraryListeners = new Set<() => void>();

export function getPlaylistLibraryVersion(): number {
	return playlistLibraryVersion;
}

export function bumpPlaylistLibraryVersion(): void {
	playlistLibraryVersion++;
	for (const fn of playlistLibraryListeners) fn();
}

export function subscribePlaylistLibrary(fn: () => void): () => void {
	playlistLibraryListeners.add(fn);
	return () => { playlistLibraryListeners.delete(fn); };
}

export function subscribePage(key: string, fn: () => void): () => void {
	let set = listeners.get(key);
	if (!set) {
		set = new Set();
		listeners.set(key, set);
	}
	set.add(fn);
	return () => {
		set!.delete(fn);
		if (set!.size === 0) listeners.delete(key);
	};
}

function notify(key: string): void {
	const set = listeners.get(key);
	if (set) {
		for (const fn of set) fn();
	}
}


const scrollPositions = new Map<string, number>();

export function setScrollPosition(key: string, scrollTop: number): void {
	scrollPositions.set(key, scrollTop);
}

export function getScrollPosition(key: string): number {
	return scrollPositions.get(key) ?? 0;
}
