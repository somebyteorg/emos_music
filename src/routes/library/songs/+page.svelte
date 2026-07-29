<script lang="ts">
	import { isEmosLoggedIn, subscribeEmosAuth } from '$lib/stores/emos-auth';
	import { ICONS } from '$lib/utils/constants';
	import { playSong } from '$lib/stores/player';
	import { goto } from '$app/navigation';
	import type { EmosSong } from '$lib/types/emos';
	import type { SortField, SortOrder } from '$lib/utils/constants';
	import { createSongMenuState } from '$lib/utils/menu-state.svelte';
	import { infiniteScroll } from '$lib/utils/infinite-scroll';
	import { favoriteIds, getFavoriteStore } from '$lib/stores/favorite-store';
	import LibraryHeader from '$lib/components/LibraryHeader.svelte';
	import SongsList from '$lib/components/SongsList.svelte';
	import InfiniteScroll from '$lib/components/InfiniteScroll.svelte';
	import ErrorState from '$lib/components/ErrorState.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import ContextualMenu from '$lib/components/ContextualMenu.svelte';
	import { pc, loadSongs, sortSongs } from './data';
	import '$lib/styles/section.css';
	import '$lib/styles/library-page.css';

	let loggedIn = $state(isEmosLoggedIn());
	let loading = $state(true);
	let error = $state('');
	let sortField = $state<SortField>('title');
	let sortOrder = $state<SortOrder>('ascending');
	const menu = createSongMenuState(
		() => menu.songId ? `${window.location.origin}/song/${menu.songId}` : '',
		() => [{ label: '查看制作人员', icon: ICONS.CREDITS, action: () => { if (menu.songId) goto(`/song/${menu.songId}`); } }]
	);

	let songs = $state<EmosSong[]>(pc.get('songs'));
	let total = $state(pc.get('total'));
	let loadingMore = $state(false);
	let favIds = $state<Set<number>>(new Set());

	$effect(() => {
		const unsub = favoriteIds.subscribe((ids) => {
			const prev = favIds;
			favIds = ids;
			if (prev.size > 0 && ids.size < prev.size) {
				const removed = [...prev].filter(id => !ids.has(id));
				if (removed.length > 0) {
					const removedSet = new Set(removed);
					songs = songs.filter(s => !removedSet.has(s.id));
					total = Math.max(0, total - removed.length);
				}
			}
		});
		return unsub;
	});

	function syncFromCache(): void {
		songs = pc.get('songs');
		total = pc.get('total');
	}

	let hasMore = $derived(pc.get('currentOffset') < total);
	let sortedSongs = $derived(sortSongs(songs, sortField, sortOrder));
	let songItems = $derived(sortedSongs.map(s => ({
		id: s.id, name: s.name, artists: s.ar ?? [],
		album: s.al ? { id: s.al.id, name: s.al.name, picUrl: s.al.picUrl } : undefined,
		duration: s.dt ?? 0
	})));

	async function loadData(reset = false): Promise<void> {
		if (reset) { loading = true; error = ''; }
		else loadingMore = true;
		try {
			await loadSongs(reset);
			syncFromCache();
		} catch { if (reset) error = '加载歌曲失败'; }
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

	function handleSortChange(f: SortField, o: SortOrder) { sortField = f; sortOrder = o; }
</script>

<svelte:head><title>歌曲 - EMOS Music</title></svelte:head>

<LibraryHeader title="歌曲" showSort={true} {sortField} {sortOrder} onSortChange={handleSortChange} />

<div class="section section--full-width with-bottom-spacing" use:infiniteScroll={{ hasMore, loading: loadingMore, onLoadMore: loadMore }}>
	<div class="section-content">
		{#if error}
			<ErrorState message={error} onRetry={() => loadData(true)} />
		{:else if loading}
			<div class="page-loading"></div>
		{:else if songItems.length > 0}
			<div class="library-page__content">
			<SongsList variant="playlist" songs={songItems} onPlay={(id) => { const s = songs.find(s => s.id === id); if (s) playSong(s, songs); }} onSongMenu={menu.open} />
			</div>
			<InfiniteScroll {hasMore} loading={loadingMore} />
		{:else}
			<EmptyState icon={ICONS.NAV_SONGS} description="暂无歌曲" />
		{/if}
	</div>
</div>

<ContextualMenu items={menu.items} clientPos={menu.clientPos} onclose={menu.close} />
