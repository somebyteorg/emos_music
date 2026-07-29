<script lang="ts">
	import { infiniteScroll } from '$lib/utils/infinite-scroll';
	import FullListPage from '$lib/components/FullListPage.svelte';
	import { page } from '$app/state';
	import '$lib/styles/link-box.css';
	import { createListCache, loadListData, resolveSource, EXPLORE_CATEGORIES, TITLE_MAP, ERROR_MAP, EMPTY_MAP } from './data';
	import type { ListType, SourceType } from './data';
	import type { EmosArtistAlbum, EmosSong, EmosPlaylist, EmosArtist } from '$lib/types/emos';

	let typeParam = $derived((page.params.type ?? 'albums') as ListType);
	let nameParam = $derived(decodeURIComponent(page.params.name ?? ''));
	let idParam = $derived(Number(page.params.id) || 0);

	let isExploreCategory = $derived(EXPLORE_CATEGORIES.includes(nameParam));
	let source: SourceType = $derived(resolveSource(nameParam, typeParam, idParam, isExploreCategory));
	let pageTitle = $derived(nameParam || TITLE_MAP[typeParam] || '列表');

	let pc = $derived(createListCache(typeParam, nameParam, idParam));
	let albums = $state<EmosArtistAlbum[]>(pc.get('albums'));
	let songs = $state<EmosSong[]>(pc.get('songs'));
	let playlists = $state<EmosPlaylist[]>(pc.get('playlists'));
	let artists = $state<EmosArtist[]>(pc.get('artists'));
	let hasMore = $state(pc.get('hasMore'));
	let loading = $state(true);
	let loadingMore = $state(false);
	let error = $state('');

	function syncFromCache(): void {
		albums = pc.get('albums');
		songs = pc.get('songs');
		playlists = pc.get('playlists');
		artists = pc.get('artists');
		hasMore = pc.get('hasMore');
	}

	async function loadData(reset = false): Promise<void> {
		if (reset) { loading = true; error = ''; }
		else loadingMore = true;
		try {
			await loadListData(pc, source, typeParam, nameParam, idParam, reset);
			syncFromCache();
		} catch { if (reset) error = ERROR_MAP[typeParam] ?? '加载失败'; }
		finally { loading = false; loadingMore = false; }
	}

	function loadMore(): void {
		if (loadingMore || !hasMore) return;
		loadData();
	}

	$effect(() => {
		const unsub = pc.subscribe(syncFromCache);
		if (pc.loaded()) { syncFromCache(); loading = false; }
		else loadData(true);
		return unsub;
	});
</script>

<svelte:head>
	<title>{pageTitle} - EMOS Music</title>
</svelte:head>

<div use:infiniteScroll={{ hasMore, loading: loadingMore, onLoadMore: loadMore }}>
<FullListPage
		title={pageTitle}
		type={typeParam}
		{albums}
		{songs}
		{playlists}
		{artists}
		{loading}
		{error}
		emptyText={EMPTY_MAP[typeParam] ?? '暂无内容'}
		{hasMore}
		{loadingMore}
		onRetry={() => loadData(true)}
		onLoadMore={loadMore}
		showCreditsInMenu={typeParam === 'songs'}
	/>
</div>
