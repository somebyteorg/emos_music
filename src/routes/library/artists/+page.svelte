<script lang="ts">
	import { isEmosLoggedIn, subscribeEmosAuth } from '$lib/stores/emos-auth';
	import { ICONS, createShareCopyMenu } from '$lib/utils/constants';
	import type { EmosArtist } from '$lib/types/emos';
	import type { MenuGroupDef, SortField, SortOrder } from '$lib/utils/constants';
	import { createIndexMenuState } from '$lib/utils/menu-state.svelte';
	import { infiniteScroll } from '$lib/utils/infinite-scroll';
	import LibraryHeader from '$lib/components/LibraryHeader.svelte';
	import EllipseLockup from '$lib/components/EllipseLockup.svelte';
	import InfiniteScroll from '$lib/components/InfiniteScroll.svelte';
	import ErrorState from '$lib/components/ErrorState.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import ContextualMenu from '$lib/components/ContextualMenu.svelte';
	import { pc, loadArtists, sortArtists } from './data';
	import '$lib/styles/section.css';
	import '$lib/styles/shelf-grid.css';
	import '$lib/styles/library-page.css';

	let loggedIn = $state(isEmosLoggedIn());
	let loading = $state(true);
	let error = $state('');
	let sortField = $state<SortField>('title');
	let sortOrder = $state<SortOrder>('ascending');
	const menu = createIndexMenuState();

	let artists = $state<EmosArtist[]>(pc.get('artists'));
	let hasMore = $state(pc.get('hasMore'));
	let loadingMore = $state(false);

	function syncFromCache(): void {
		artists = pc.get('artists');
		hasMore = pc.get('hasMore');
	}

	let sortedArtists = $derived(sortArtists(artists, sortField, sortOrder));

	async function loadData(reset = false): Promise<void> {
		if (reset) { loading = true; error = ''; }
		else loadingMore = true;
		try {
			await loadArtists(reset);
			syncFromCache();
		} catch { if (reset) error = '加载艺人失败'; }
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

	let menuItems: MenuGroupDef[] = $derived(createShareCopyMenu(() => menu.target !== null && menu.target >= 0 && sortedArtists[menu.target] ? `${window.location.origin}/artist/${encodeURIComponent(sortedArtists[menu.target].name)}/${sortedArtists[menu.target].id}` : ''));
	function handleSortChange(f: SortField, o: SortOrder) { sortField = f; sortOrder = o; }
</script>

<svelte:head><title>艺人 - EMOS Music</title></svelte:head>

<LibraryHeader title="艺人" showSort={true} {sortField} {sortOrder} onSortChange={handleSortChange} />

<div class="section section--full-width with-bottom-spacing" use:infiniteScroll={{ hasMore, loading: loadingMore, onLoadMore: loadMore }}>
	<div class="section-content">
		{#if error}
			<ErrorState message={error} onRetry={() => loadData(true)} />
		{:else if loading}
			<div class="page-loading"></div>
		{:else if sortedArtists.length > 0}
			<div class="library-page__content">
			<ul class="grid--artists-list">
				{#each sortedArtists as artist, _i (artist.id)}
					<li class="grid-item">
						<EllipseLockup {artist} />
					</li>
				{/each}
			</ul>
			<InfiniteScroll {hasMore} loading={loadingMore} />
			</div>
		{:else}
			<EmptyState icon={ICONS.NAV_ARTISTS} description="暂无艺人" />
		{/if}
	</div>
</div>

<ContextualMenu items={menuItems} clientPos={menu.clientPos} onclose={menu.close} />
