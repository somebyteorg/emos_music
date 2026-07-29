import { getPageData, setPageData, isPageLoaded, markPageLoaded, subscribePage } from '$lib/stores/page-cache';

export function createPageCache<T extends Record<string, unknown>>(key: string, defaults: T) {
	const state: Record<string, unknown> = {};
	for (const [field, val] of Object.entries(defaults)) {
		state[field] = getPageData(key, field, val);
	}

	function get<K extends keyof T>(field: K): T[K] {
		return (state[field as string] as T[K]) ?? defaults[field];
	}

	function set<K extends keyof T>(field: K, value: T[K]): void {
		state[field as string] = value;
		setPageData(key, field as string, value);
	}

	function loaded(): boolean {
		return isPageLoaded(key);
	}

	function markLoaded(): void {
		markPageLoaded(key);
	}

	function syncFromCache(): void {
		for (const field of Object.keys(defaults)) {
			state[field] = getPageData(key, field, defaults[field as keyof T]);
		}
	}

	function subscribe(fn: () => void): () => void {
		return subscribePage(key, fn);
	}

	return { get, set, loaded, markLoaded, syncFromCache, subscribe };
}