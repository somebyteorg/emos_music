<script lang="ts">
	import { goto } from '$app/navigation';
	import { getArtworkUrl } from '$lib/services/emos';
	import { playSong } from '$lib/stores/player';
	import { ARTWORK_SIZE, ICONS, createShareCopyMenu } from '$lib/utils/constants';
	import { createMenuState, createSongMenuState } from '$lib/utils/menu-state.svelte';
	import { isEmosLoggedIn, getEmosUser } from '$lib/stores/emos-auth';
	import { setPageData } from '$lib/stores/page-cache';
	import { formatTotalDuration } from '$lib/utils/format';

	import ErrorState from '$lib/components/ErrorState.svelte';
	import ContextualMenu from '$lib/components/ContextualMenu.svelte';
	import DetailHeader from '$lib/components/DetailHeader.svelte';
	import SongsList from '$lib/components/SongsList.svelte';
	import ContentModal from '$lib/components/ContentModal.svelte';

	import '$lib/styles/section.css';
	import '$lib/styles/songs-list-footer.css';
	import { createPlaylistCache, loadPlaylistData, togglePlaylistLibrary, formatPlayCount } from './data';
	import type { EmosSong, EmosPlaylist } from '$lib/types/emos';

	type PlaylistDetail = EmosPlaylist & { tracks: EmosSong[] };

	let { params } = $props();
	let id = $derived(Number(params.id) || 0);

	let pc = $derived(createPlaylistCache(id));
	let playlist = $state<PlaylistDetail | null>(pc.get('playlist'));

	let loading = $state(true);
	let error = $state('');
	let isOwnPlaylist = $derived(playlist ? playlist.creator?.userId === getEmosUser()?.id : false);
	let isInLibrary = $state(false);

	function syncFromCache(): void {
		playlist = pc.get('playlist');
		isInLibrary = (playlist?.creator?.userId === getEmosUser()?.id) || pc.get('isInLibrary');
	}

	async function handleToggleLibrary(): Promise<void> {
		if (!playlist) return;
		const success = await togglePlaylistLibrary(playlist, isInLibrary, `playlist-${id}`);
		if (success) {
			isInLibrary = !isInLibrary;
			pc.set('isInLibrary', isInLibrary);
			if (playlist) {
				playlist.subscribed = isInLibrary;
				setPageData(`playlist-${id}`, 'playlist', playlist);
			}
		}
	}


	let descriptionOpen = $state(false);
	let contentEl = $state<HTMLParagraphElement | null>(null);
	let isDescriptionTruncated = $derived(contentEl ? contentEl.scrollHeight > contentEl.clientHeight : false);

	const menu = createSongMenuState(
		() => menu.songId ? `${window.location.origin}/song/${menu.songId}` : '',
		() => menu.songId ? [{ label: '查看制作人员', icon: ICONS.CREDITS, action: () => { if (menu.songId) goto(`/song/${menu.songId}`); } }] : undefined
	);

	const headerMenu = createMenuState<void>();
	let headerMenuItems = $derived(createShareCopyMenu(() => window.location.href));


	$effect(() => {
		const unsub = pc.subscribe(syncFromCache);
		if (pc.loaded()) { syncFromCache(); loading = false; }
		else {
			loading = true;
			error = '';
			loadPlaylistData(id, pc).then(() => { syncFromCache(); loading = false; }).catch((e) => {
				console.error('Failed to load playlist:', e);
				error = '加载歌单失败';
				loading = false;
			});
		}
		return unsub;
	});
</script>

<svelte:head>
	<title>{playlist?.name ?? '歌单'} - EMOS Music</title>
</svelte:head>

{#if error}
	<div class="section section--full-width">
		<div class="section-content">
			<ErrorState message={error} onRetry={() => { loading = true; error = ''; loadPlaylistData(id, pc).then(() => { syncFromCache(); loading = false; }).catch(() => { error = '加载歌单失败'; loading = false; }); }} />
		</div>
	</div>
{:else if playlist}
	{@const currentPlaylist = playlist}
	<DetailHeader
		artworkUrl={getArtworkUrl(currentPlaylist.coverImgUrl, ARTWORK_SIZE.DETAIL)}
		title={currentPlaylist.name}
		tertiaryTitles=""
		metadataBottom={`${formatPlayCount(currentPlaylist.playCount)} 次播放`}
		onShare={() => { if (navigator.share) { navigator.share({ url: window.location.href }); } }}
		onMoreMenu={(e) => headerMenu.open(e, undefined)}
		moreMenuExpanded={headerMenu.isOpen}
		onPlay={() => { if (currentPlaylist.tracks.length > 0) playSong(currentPlaylist.tracks[0], currentPlaylist.tracks); }}
		{isInLibrary}
		onToggleLibrary={!isOwnPlaylist && isEmosLoggedIn() ? handleToggleLibrary : undefined}
	>
				{#snippet subtitles()}<span class="click-action">{currentPlaylist.creator?.nickname ?? '未知'}</span>{/snippet}
				{#if currentPlaylist.description}
					<div class="description">
						<div class="truncate-wrapper">
							<p dir="auto" class="content" class:with-more-button={isDescriptionTruncated} style="--lines: 3; --line-height: var(--lineHeight, 16); --link-length: 2;" bind:this={contentEl}>{currentPlaylist.description}</p>
							{#if isDescriptionTruncated}
								<button class="more" type="button" onclick={() => descriptionOpen = true}>更多</button>
							{/if}
						</div>
						{#if isDescriptionTruncated}
							<ContentModal title={currentPlaylist.name} subtitle={currentPlaylist.creator?.nickname ?? '未知'} open={descriptionOpen} onclose={() => descriptionOpen = false}>
									<p>{currentPlaylist.description}</p>
							</ContentModal>
						{/if}
					</div>
				{/if}
			</DetailHeader>


	<div class="section section--full-width">
		<div class="section-content">
			<SongsList
				variant="playlist"
				songs={currentPlaylist.tracks.map(s => ({
					id: s.id, name: s.name, artists: s.ar,
					album: { id: s.al.id, name: s.al.name, picUrl: s.al.picUrl },
					duration: s.dt
				}))}

				onSongMenu={menu.open}
				onPlay={(songId) => { const song = currentPlaylist.tracks.find(s => s.id === songId); if (song) playSong(song, currentPlaylist.tracks); }}
			/>
		</div>
	</div>

	<div class="section section--full-width">
		<div class="section-content">
			<div class="tracklist-footer tracklist-footer--playlist">
				<div class="footer-body">
					<p class="footer-description">{currentPlaylist.trackCount} 首歌曲、{formatTotalDuration(currentPlaylist.tracks.reduce((sum, s) => sum + s.dt, 0))}</p>
				</div>
			</div>
		</div>
	</div>

{/if}

<ContextualMenu items={menu.items} clientPos={menu.clientPos} onclose={menu.close} />
<ContextualMenu items={headerMenuItems} clientPos={headerMenu.clientPos} onclose={headerMenu.close} />
