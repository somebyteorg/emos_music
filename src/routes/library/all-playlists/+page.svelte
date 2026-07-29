<script lang="ts">
	import { isEmosLoggedIn, subscribeEmosAuth } from '$lib/stores/emos-auth';
	import { ARTWORK_SIZE, ICONS, createShareCopyMenu } from '$lib/utils/constants';
	import { getArtworkUrl } from '$lib/services/emos';
	import type { EmosPlaylist } from '$lib/types/emos';
	import type { MenuGroupDef } from '$lib/utils/constants';
	import { createIndexMenuState } from '$lib/utils/menu-state.svelte';
	import { infiniteScroll } from '$lib/utils/infinite-scroll';
	import ProductLockupCard from '$lib/components/ProductLockupCard.svelte';
	import InfiniteScroll from '$lib/components/InfiniteScroll.svelte';
	import ErrorState from '$lib/components/ErrorState.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import ContextualMenu from '$lib/components/ContextualMenu.svelte';
	import { pc, loadPlaylists } from './data';
	import '$lib/styles/section.css';
	import '$lib/styles/shelf-grid.css';
	import '$lib/styles/library-page.css';

	let loggedIn = $state(isEmosLoggedIn());
	let loading = $state(true);
	let error = $state('');
	const menu = createIndexMenuState();

	let playlists = $state<EmosPlaylist[]>(pc.get('playlists'));
	let hasMore = $state(pc.get('hasMore'));
	let loadingMore = $state(false);

	function syncFromCache(): void {
		playlists = pc.get('playlists');
		hasMore = pc.get('hasMore');
	}

	async function loadData(reset = false): Promise<void> {
		if (reset) { loading = true; error = ''; }
		else loadingMore = true;
		try {
			await loadPlaylists(reset);
			syncFromCache();
		} catch { if (reset) error = '加载播放列表失败'; }
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

	let menuItems: MenuGroupDef[] = $derived(createShareCopyMenu(() => menu.target !== null && menu.target >= 0 && playlists[menu.target] ? `${window.location.origin}/playlist/${playlists[menu.target].id}` : ''));
</script>

<svelte:head><title>播放列表 - EMOS Music</title></svelte:head>

<div class="section section--full-width with-top-spacing with-bottom-spacing" use:infiniteScroll={{ hasMore, loading: loadingMore, onLoadMore: loadMore }}>
	<div class="section-content">
		{#if error}
			<ErrorState message={error} onRetry={() => loadData(true)} />
		{:else if loading}
			<div class="page-loading"></div>
		{:else if playlists.length > 0}
			<div class="library-page__content">
			<ul class="grid grid--flow-row">
				{#each playlists as playlist, i (playlist.id)}
					<li class="grid-item">
						<ProductLockupCard imageUrl={getArtworkUrl(playlist.coverImgUrl, ARTWORK_SIZE.LIST)} name={playlist.name} linkHref="/playlist/{playlist.id}" subtitle={playlist.creator?.nickname ?? ''} hasOpenMenu={menu.target === i} onMoreClick={(e) => menu.open(e, i)} />
					</li>
				{/each}
			</ul>
			<InfiniteScroll {hasMore} loading={loadingMore} />
			</div>
		{:else}
			<EmptyState icon={ICONS.NAV_SONGS} description="暂无播放列表" />
		{/if}
	</div>
</div>

<ContextualMenu items={menuItems} clientPos={menu.clientPos} onclose={menu.close} />
