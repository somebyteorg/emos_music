<script lang="ts">
	import '../styles/search-page.css';

	import TopResults from './TopResults.svelte';
	import ArtistResults from './ArtistResults.svelte';
	import AlbumResults from './AlbumResults.svelte';
	import SongResults from './SongResults.svelte';
	import PlaylistResults from './PlaylistResults.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import { ICONS } from '$lib/utils/constants';
	import { addRecentSearch } from '$lib/stores/recent-search-store';
	import { loadSearchResults, buildTopResults, hasAnyResult, findResultByHref, getEmptyResults } from '../data';
	import type { SearchResults as SearchResultsType } from '../data';

	interface Props {
		searchQuery: string;
	}

	let { searchQuery }: Props = $props();

	let results: SearchResultsType = $state(getEmptyResults());
	let loading = $state(false);
	let debounceTimer: ReturnType<typeof setTimeout> | null = null;

	$effect(() => {
		if (searchQuery) {
			if (debounceTimer) clearTimeout(debounceTimer);
			debounceTimer = setTimeout(() => doSearch(searchQuery), 300);
		}
		return () => { if (debounceTimer) clearTimeout(debounceTimer); };
	});

	async function doSearch(q: string): Promise<void> {
		loading = true;
		try {
			results = await loadSearchResults(q);
		} catch (e) {
			console.warn('Failed to search:', e);
			results = getEmptyResults();
		} finally {
			loading = false;
		}
	}

	let topResults = $derived(buildTopResults(results));
	let anyResult = $derived(hasAnyResult(results));

	function handleResultClick(e: MouseEvent): void {
		const target = e.target as HTMLElement;
		const anchor = target.closest('a[href]') as HTMLAnchorElement | null;
		if (!anchor) return;
		const href = anchor.getAttribute('href');
		if (!href || href === '#') return;
		const found = findResultByHref(href, results);
		if (found) addRecentSearch(found);
	}
</script>

{#if !loading && anyResult}
<div onclick={handleResultClick}>
	{#if topResults.length > 0}
		<TopResults items={topResults} {searchQuery} />
	{/if}
	{#if results.artists.length}
		<ArtistResults artists={results.artists} {searchQuery} hasMore={results.artistsHasMore} />
	{/if}
	{#if results.albums.length}
		<AlbumResults albums={results.albums} {searchQuery} hasMore={results.albumsHasMore} />
	{/if}
	{#if results.songs.length}
		<SongResults songs={results.songs} {searchQuery} hasMore={results.songsHasMore} />
	{/if}
	{#if results.playlists.length}
		<PlaylistResults playlists={results.playlists} {searchQuery} hasMore={results.playlistsHasMore} />
	{/if}
</div>
{:else if !loading}
	<EmptyState icon={ICONS.SEARCH_LARGE} description={`未找到"${searchQuery}"的结果`} />
{/if}
