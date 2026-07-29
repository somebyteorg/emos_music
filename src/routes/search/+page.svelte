<script lang="ts">
	import './styles/search-page.css';
	import './styles/scope-bar.css';

	import SearchBox from './components/SearchBox.svelte';
	import BrowseCategories from './components/BrowseCategories.svelte';
	import SearchResults from './components/SearchResults.svelte';
	import RecentSearches from './components/RecentSearches.svelte';
	import { page } from '$app/state';

	let searchQuery = $state(page.url.searchParams.get('q') ?? '');
	let isSearchFocused = $state(false);

	$effect(() => {
		const q = page.url.searchParams.get('q') ?? '';
		if (q !== searchQuery) {
			searchQuery = q;
		}
	});
</script>

<svelte:head>
	<title>{searchQuery ? `${searchQuery} - EMOS Music 搜索` : 'EMOS Music 的音乐类型和类别'}</title>
</svelte:head>

<div class="desktop-search-page" class:search-input-focused={isSearchFocused}>
	<div class="search-mobile-input">
		<SearchBox bind:isFocused={isSearchFocused} />
	</div>

	<div class="search-controls-bar">
		<div class="content-scope-bar content-scope-bar--desktop">
			<div class="content-scope-bar__content content-scope-bar__content--single">
				<SearchBox />
			</div>
		</div>
	</div>

	{#if searchQuery}
		<SearchResults {searchQuery} />
	{:else}
		<RecentSearches />
		<BrowseCategories />
	{/if}
</div>
