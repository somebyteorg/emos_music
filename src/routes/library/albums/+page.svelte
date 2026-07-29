<script lang="ts">
	import { isEmosLoggedIn, subscribeEmosAuth } from '$lib/stores/emos-auth';
	import { ARTWORK_SIZE, createShareCopyMenu, ICONS } from '$lib/utils/constants';
	import { getArtworkUrl } from '$lib/services/emos';
	import { playAlbumById } from '$lib/stores/player';
	import type { EmosArtistAlbum } from '$lib/types/emos';
	import type { MenuGroupDef, SortField, SortOrder } from '$lib/utils/constants';
	import { createIndexMenuState } from '$lib/utils/menu-state.svelte';
	import { infiniteScroll } from '$lib/utils/infinite-scroll';
	import LibraryHeader from '$lib/components/LibraryHeader.svelte';
	import ProductLockupCard from '$lib/components/ProductLockupCard.svelte';
	import InfiniteScroll from '$lib/components/InfiniteScroll.svelte';
	import ErrorState from '$lib/components/ErrorState.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import ContextualMenu from '$lib/components/ContextualMenu.svelte';
	import { pc, loadAlbums, sortAlbums } from './data';
	import '$lib/styles/section.css';
	import '$lib/styles/shelf-grid.css';
	import '$lib/styles/library-page.css';

	let loggedIn = $state(isEmosLoggedIn());
	let loading = $state(true);
	let error = $state('');
	let sortField = $state<SortField>('title');
	let sortOrder = $state<SortOrder>('ascending');
	const menu = createIndexMenuState();

	let albums = $state<EmosArtistAlbum[]>(pc.get('albums'));
	let hasMore = $state(pc.get('hasMore'));
	let loadingMore = $state(false);

	function syncFromCache(): void {
		albums = pc.get('albums');
		hasMore = pc.get('hasMore');
	}

	let sortedAlbums = $derived(sortAlbums(albums, sortField, sortOrder));

	async function loadData(reset = false): Promise<void> {
		if (reset) { loading = true; error = ''; }
		else loadingMore = true;
		try {
			await loadAlbums(reset);
			syncFromCache();
		} catch { if (reset) error = '加载专辑失败'; }
		finally { loading = false; loadingMore = false; }
	}

	function loadMore(): void {
		if (loadingMore || !hasMore) return;
		loadData();
	}

	$effect(() => {
		const unsub1 = subscribeEmosAuth(() => {
			const was = loggedIn;
			loggedIn = isEmosLoggedIn();
			if (!was && loggedIn) loadData(true);
		});
		const unsub2 = pc.subscribe(syncFromCache);
		if (pc.loaded()) { syncFromCache(); loading = false; }
		else loadData(true);
		return () => { unsub1(); unsub2(); };
	});

	let menuItems: MenuGroupDef[] = $derived(createShareCopyMenu(() => menu.target !== null && menu.target >= 0 && sortedAlbums[menu.target] ? `${window.location.origin}/album/${sortedAlbums[menu.target].id}` : ''));
	function handleSortChange(f: SortField, o: SortOrder) { sortField = f; sortOrder = o; }
</script>

<svelte:head><title>专辑 - EMOS Music</title></svelte:head>

<LibraryHeader title="专辑" showSort={true} {sortField} {sortOrder} onSortChange={handleSortChange} />

<div class="section section--full-width with-bottom-spacing" use:infiniteScroll={{ hasMore, loading: loadingMore, onLoadMore: loadMore }}>
	<div class="section-content">
		{#if error}
			<ErrorState message={error} onRetry={() => loadData(true)} />
		{:else if loading}
			<div class="page-loading"></div>
		{:else if sortedAlbums.length > 0}
			<div class="library-page__content">
			<ul class="grid grid--flow-row">
				{#each sortedAlbums as album, i (album.id)}
					<li class="grid-item">
						<ProductLockupCard imageUrl={getArtworkUrl(album.picUrl, ARTWORK_SIZE.LIST)} name={album.name} linkHref="/album/{album.id}" subtitle={album.artist?.name ?? ''} hasOpenMenu={menu.target === i} onMoreClick={(e) => menu.open(e, i)} onPlayClick={() => playAlbumById(album.id)} />
					</li>
				{/each}
			</ul>
			<InfiniteScroll {hasMore} loading={loadingMore} />
			</div>
		{:else}
			<EmptyState icon={ICONS.NAV_ALBUMS} description="暂无专辑" />
		{/if}
	</div>
</div>

<ContextualMenu items={menuItems} clientPos={menu.clientPos} onclose={menu.close} />
