<script lang="ts">
	import '../styles/search-box.css';
	import '$lib/styles/play-more-buttons.css';

	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { SvelteMap, SvelteURLSearchParams } from 'svelte/reactivity';
	import { getSearchSuggest, getArtworkUrl } from '$lib/services/emos';
	import type { EmosSearchSuggest, EmosSearchSuggestArtist, EmosSearchSuggestSong, EmosSearchSuggestAlbum } from '$lib/types/emos';
	import { ICONS, ARTWORK_SIZE, createShareCopyMenu } from '$lib/utils/constants';
	import { addRecentSearch } from '$lib/stores/recent-search-store';
	import { createIndexMenuState } from '$lib/utils/menu-state.svelte';
	import { playSong, playAlbumById } from '$lib/stores/player';
	import ContextualMenu from '$lib/components/ContextualMenu.svelte';
	import type { Snippet } from 'svelte';

	let { scope = 'searchInCatalog', children, isFocused = $bindable(false) }: { scope?: string; children?: Snippet; isFocused?: boolean } = $props();
	let query = $state('');
	let suggestions: EmosSearchSuggest | null = $state(null);
	let cachedSuggestions: EmosSearchSuggest | null = null;
	let lastQuery = '';
	let showSuggestions = $state(false);
	let focusedIndex = $state(-1);
	let loading = $state(false);
	let debounceTimer: ReturnType<typeof setTimeout> | null = null;
	let isComposing = $state(false);
	let containerEl: HTMLElement | null = $state(null);
	let lastUrlQuery = '';
	const menu = createIndexMenuState();


	const suggestCache = new SvelteMap<string, EmosSearchSuggest>();

	$effect(() => {
		const urlQuery = page.url.searchParams.get('q') ?? '';
		if (urlQuery !== lastUrlQuery) {
			lastUrlQuery = urlQuery;
			query = urlQuery;
		}
	});

	type SuggestionItem =
		| { kind: 'text'; keyword: string; autofillBefore: string; highlighted: string; autofillAfter: string }
		| { kind: 'artist'; data: EmosSearchSuggestArtist }
		| { kind: 'song'; data: EmosSearchSuggestSong }
		| { kind: 'album'; data: EmosSearchSuggestAlbum };

	function flatItems(): SuggestionItem[] {
		if (!suggestions) return [];
		const items: SuggestionItem[] = [];
		const q = query.trim().toLowerCase();
		for (const m of suggestions.allMatch ?? []) {
			const keyword = m.keyword;
			const idx = keyword.toLowerCase().indexOf(q);
			items.push({
				kind: 'text',
				keyword,
				autofillBefore: idx > -1 ? keyword.slice(0, idx) : '',
				highlighted: idx > -1 ? keyword.slice(idx, idx + q.length) : '',
				autofillAfter: idx > -1 ? keyword.slice(idx + q.length) : keyword
			});
		}
		for (const a of suggestions.artists ?? []) {
			items.push({ kind: 'artist', data: a });
		}
		for (const s of suggestions.songs ?? []) {
			items.push({ kind: 'song', data: s });
		}
		for (const a of suggestions.albums ?? []) {
			items.push({ kind: 'album', data: a });
		}
		return items;
	}

	function handleClickOutside(e: MouseEvent) {
		if (!containerEl) return;
		if (!containerEl.contains(e.target as Node)) {

			if (suggestions) {
				cachedSuggestions = suggestions;
				suggestions = null;
			}
			showSuggestions = false;
			focusedIndex = -1;
			isFocused = false;
		}
	}

	$effect(() => {
		if (typeof document === 'undefined') return;
		document.addEventListener('click', handleClickOutside, true);
		return () => {
			document.removeEventListener('click', handleClickOutside, true);
		};
	});

	function handleSubmit(e: Event) {
		e.preventDefault();
		const trimmed = query.trim();
		if (trimmed) {
			showSuggestions = false;
			const params = new SvelteURLSearchParams();
			params.set('q', trimmed);
			if (scope === 'searchInLibrary') params.set('scope', 'emos');
			goto(`/search?${params.toString()}`);
		}
	}

	function onInputFocus() {
		isFocused = true;
		if (scope !== 'searchInCatalog') return;
		if (query === lastQuery && cachedSuggestions) {
			suggestions = cachedSuggestions;
			cachedSuggestions = null;
		}
		if (suggestions && flatItems().length > 0) {
			showSuggestions = true;
		}
	}

	function onInput() {
		if (debounceTimer) clearTimeout(debounceTimer);
		const trimmed = query.trim();
		if (!trimmed) {
			suggestions = null;
			cachedSuggestions = null;
			showSuggestions = false;
			focusedIndex = -1;
			const urlQuery = page.url.searchParams.get('q') ?? '';
			if (urlQuery) {
				const params = new SvelteURLSearchParams();
				if (scope === 'searchInLibrary') params.set('scope', 'emos');
				goto(`/search?${params.toString()}`);
			}
			return;
		}
		if (scope !== 'searchInCatalog') {
			suggestions = null;
			cachedSuggestions = null;
			showSuggestions = false;
			focusedIndex = -1;
			return;
		}
		debounceTimer = setTimeout(async () => {
			loading = true;
			try {
				const cached = suggestCache.get(trimmed);
				if (cached) {
					lastQuery = trimmed;
					suggestions = cached;
					showSuggestions = true;
					focusedIndex = -1;
					loading = false;
					return;
				}
				const result = await getSearchSuggest(trimmed);
				suggestCache.set(trimmed, result);
				if (suggestCache.size > 30) {
					const firstKey = suggestCache.keys().next().value;
					if (firstKey !== undefined) suggestCache.delete(firstKey);
				}
				lastQuery = trimmed;
				suggestions = result;
				showSuggestions = true;
				focusedIndex = -1;
			} catch (e) {
				console.warn('Failed to load search suggestions:', e);
				suggestions = null;
			} finally {
				loading = false;
			}
		}, 300);
	}

	function onKeydown(e: KeyboardEvent) {
		const items = flatItems();
		if (!showSuggestions || items.length === 0) return;

		if (e.key === 'ArrowDown') {
			e.preventDefault();
			focusedIndex = (focusedIndex + 1) % items.length;
		} else if (e.key === 'ArrowUp') {
			e.preventDefault();
			focusedIndex = focusedIndex <= 0 ? items.length - 1 : focusedIndex - 1;
		} else if (e.key === 'Enter' && focusedIndex >= 0) {
			e.preventDefault();
			selectItem(items[focusedIndex]);
		} else if (e.key === 'Escape') {
			if (suggestions) {
				cachedSuggestions = suggestions;
				suggestions = null;
			}
			showSuggestions = false;
			focusedIndex = -1;
		}
	}

	function selectItem(item: SuggestionItem) {
		showSuggestions = false;
		focusedIndex = -1;
		if (item.kind === 'text') {
			query = item.keyword;
			const params = new SvelteURLSearchParams();
			params.set('q', item.keyword);
			if (scope === 'searchInLibrary') params.set('scope', 'emos');
			goto(`/search?${params.toString()}`);
		} else if (item.kind === 'artist') {
			addRecentSearch({ type: 'artist', id: item.data.id, name: item.data.name, imageUrl: item.data.picUrl || '', subtitle: '艺人' });
			goto(`/artist/${encodeURIComponent(item.data.name)}/${item.data.id}`);
		} else if (item.kind === 'song') {
			addRecentSearch({ type: 'song', id: item.data.id, name: item.data.name, imageUrl: item.data.artists[0]?.picUrl ?? '', subtitle: item.data.artists.map((a: { id: number; name: string; picUrl: string | null }) => a.name).join(' / ') });
			goto(`/song/${item.data.id}`);
		} else if (item.kind === 'album') {
			addRecentSearch({ type: 'album', id: item.data.id, name: item.data.name, imageUrl: item.data.artist?.picUrl ?? '', subtitle: item.data.artist?.name ?? '' });
			goto(`/album/${item.data.id}`);
		}
	}

	function getSubtitle(item: SuggestionItem): string {
		if (item.kind === 'artist') return '艺人';
		if (item.kind === 'song') {
			const artists = item.data.artists.map(a => a.name).join(' / ');
			return `歌曲\u00B7${artists}`;
		}
		if (item.kind === 'album') return `专辑\u00B7${item.data.artist.name}`;
		return '';
	}

	function getArtwork(item: SuggestionItem): string {
		if (item.kind === 'artist') return getArtworkUrl(item.data.picUrl, ARTWORK_SIZE.THUMBNAIL);
		if (item.kind === 'song') {
			const url = item.data.artists[0]?.picUrl ?? '';
			return url ? getArtworkUrl(url, ARTWORK_SIZE.THUMBNAIL) : '';
		}
		if (item.kind === 'album') {
			const url = item.data.artist?.picUrl ?? '';
			return url ? getArtworkUrl(url, ARTWORK_SIZE.THUMBNAIL) : '';
		}
		return '';
	}

	function isCircle(item: SuggestionItem): boolean {
		return item.kind === 'artist';
	}

	function handleCancel() {
		query = '';
		suggestions = null;
		cachedSuggestions = null;
		showSuggestions = false;
		focusedIndex = -1;
		isFocused = false;
		const input = document.getElementById('search-box__text-field') as HTMLInputElement | null;
		if (input) input.blur();
		goto('/search');
	}

	function getSuggestionUrl(item: SuggestionItem): string {
		if (item.kind === 'artist') return `${window.location.origin}/artist/${encodeURIComponent(item.data.name)}/${item.data.id}`;
		if (item.kind === 'song') return `${window.location.origin}/song/${item.data.id}`;
		if (item.kind === 'album') return `${window.location.origin}/album/${item.data.id}`;
		return '';
	}

	let menuItems = $derived.by(() => {
		const items = flatItems();
		const idx = menu.target;
		if (idx === null || idx < 0 || idx >= items.length) return [];
		const item = items[idx];
		if (item.kind === 'text') return [];
		const extraItems: { label: string; icon: string; action: () => void }[] = [];
		if (item.kind === 'song') {
			extraItems.push({ label: '查看制作人员', icon: ICONS.CREDITS, action: () => goto(`/song/${item.data.id}`) });
			extraItems.push({ label: '播放', icon: ICONS.PLAY_SMALL, action: () => playSong({ id: item.data.id, name: item.data.name, ar: item.data.artists.map(a => ({ id: a.id, name: a.name })), al: { id: 0, name: '', picUrl: item.data.artists[0]?.picUrl ?? '' }, dt: 0, fee: 0 }) });
		} else if (item.kind === 'album') {
			extraItems.push({ label: '播放', icon: ICONS.PLAY_SMALL, action: () => playAlbumById(item.data.id) });
		}
		return createShareCopyMenu(() => getSuggestionUrl(item), extraItems.length > 0 ? extraItems : undefined);
	});
</script>

<div class="search-box">
	<div class="search-box-wrapper" bind:this={containerEl}>
		<div class="search-box-container" role="combobox" aria-expanded={showSuggestions && flatItems().length > 0} aria-haspopup="listbox" aria-owns="search-suggestions">
			<div class="flex-container">
				<form class="search-box__form" onsubmit={handleSubmit}>
					<svg height="16" width="16" viewBox="0 0 16 16" class="search-svg" aria-hidden="true"><path d={ICONS.SEARCH}></path></svg>
					<label for="search-box__text-field" class="search-box__label">{query ? '' : '搜索'}</label>
					<input
						aria-autocomplete="list"
						aria-activedescendant={focusedIndex >= 0 ? `search-suggestion-${focusedIndex}` : undefined}
						aria-controls="search-suggestions"
						spellcheck="false"
						autocomplete="off"
						autocorrect="off"
						autocapitalize="off"
						type="search"
						inputmode="search"
						class="search-box__text-field"
						id="search-box__text-field"
						bind:value={query}
						oninput={onInput}
						onfocus={onInputFocus}
						onkeydown={onKeydown}
						oncompositionstart={() => isComposing = true}
						oncompositionend={() => isComposing = false}
					/>
				</form>
				{#if isFocused}
					<div class="search-box__cancel-button-container">
						<button type="button" aria-label="取消" onclick={handleCancel}>取消</button>
					</div>
				{/if}
			</div>
			{#if children && isFocused}
				<div class="search-box__scope-bar-slot">
					{@render children()}
				</div>
			{/if}
		</div>

		{#if showSuggestions && flatItems().length > 0}

			<ul class="search-suggestions" role="listbox" aria-label="建议" id="search-suggestions">
				{#each flatItems() as item, i}
					<li
						class="search-hint {item.kind === 'text' ? 'search-hint--text' : 'search-hint--lockup'}"
						role="option"
						tabindex="0"
						id="search-suggestion-{i}"
						aria-selected={focusedIndex === i}
						onclick={() => selectItem(item)}
						onkeydown={(e) => { if (e.key === 'Enter') selectItem(item); }}
					>
						{#if item.kind === 'text'}
							<svg height="16" width="16" viewBox="0 0 16 16" class="search-suggestion-svg" aria-hidden="true"><path d={ICONS.SEARCH}></path></svg>
							<span class="suggestion">
								<span>{item.autofillBefore}</span><span class="highlighted">{item.highlighted}</span><span>{item.autofillAfter}</span>
							</span>
						{:else}
							<div class="top-search-list-lockup" class:top-search-list-lockup--artist={item.kind === 'artist'}>
								<div class="top-search-list-lockup__content">
									<div class="top-search-list-lockup__artwork" class:top-search-list-lockup__artwork--circle={isCircle(item)}>
										{#if getArtwork(item)}
											<img src={getArtwork(item)} alt="" loading="lazy" />
										{:else}
											<div class="artwork-placeholder suggestion-placeholder" style="--placeholder-radius: {isCircle(item) ? '50%' : '5px'}"></div>
										{/if}
									</div>
									<ul class="top-search-list-lockup__description">
										<li class="top-search-list-lockup__explicit-wrapper">
											<span class="top-search-list-lockup__primary" dir="auto">{item.kind === 'artist' ? item.data.name : item.kind === 'song' ? item.data.name : item.data.name}</span>
										</li>
										<li class="top-search-list-lockup__secondary" dir="auto">
											<span dir="auto">{getSubtitle(item)}</span>
										</li>
									</ul>
								</div>
								<div class="top-search-list-lockup__icons">
									{#if item.kind === 'artist'}
										<svg class="top-search-list-lockup__icon" viewBox="0 0 36 64" xmlns="http://www.w3.org/2000/svg"><path d={ICONS.CHEVRON_RIGHT} fill-rule="nonzero"></path></svg>
									{:else}
										<div class="cloud-buttons">
											<button class="more-button more-button--non-platter" type="button" aria-label="更多" onclick={(e) => { e.stopPropagation(); menu.open(e, i); }}>
												<svg width="28" height="28" viewBox="0 0 28 28" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
													<path fill="var(--iconEllipsisFill, var(--keyColor))" d={ICONS.ELLIPSIS}></path>
												</svg>
											</button>
										</div>
									{/if}
								</div>
							</div>
						{/if}
					</li>
				{/each}
			</ul>
		{/if}
	</div>
</div>

<ContextualMenu items={menuItems} clientPos={menu.clientPos} onclose={menu.close} />
