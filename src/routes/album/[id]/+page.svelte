<script lang="ts">
	import { goto } from '$app/navigation';
	import { getArtworkUrl } from '$lib/services/emos';
	import { playSong } from '$lib/stores/player';
	import { ARTWORK_SIZE, ICONS, createShareCopyMenu } from '$lib/utils/constants';
	import { createMenuState, createIndexMenuState, createSongMenuState } from '$lib/utils/menu-state.svelte';
	import { isEmosLoggedIn } from '$lib/stores/emos-auth';
	import { setPageData } from '$lib/stores/page-cache';

	import ErrorState from '$lib/components/ErrorState.svelte';
	import ContextualMenu from '$lib/components/ContextualMenu.svelte';
	import DetailHeader from '$lib/components/DetailHeader.svelte';
	import MoreArtistWorks from '$lib/components/MoreArtistWorks.svelte';
	import SongsList from '$lib/components/SongsList.svelte';

	import '$lib/styles/section.css';
	import '$lib/styles/songs-list-footer.css';
	import { createAlbumCache, loadAlbumData, toggleAlbumLibrary, getMetadataBottom, getFooterText } from './data';
	import YouMightAlsoLikeSection from './components/YouMightAlsoLikeSection.svelte';
	import type { EmosArtistAlbum } from '$lib/types/emos';

	let { params } = $props();
	let id = $derived(Number(params.id) || 0);

	let pc = $derived(createAlbumCache(id));
	let album = $state(pc.get('album'));
	let artistAlbums = $state(pc.get('artistAlbums'));
	let youMightAlsoLike = $state(pc.get('youMightAlsoLike'));
	let isInLibrary = $state(pc.get('isInLibrary'));
	let loading = $state(true);
	let error = $state('');

	function syncFromCache(): void {
		album = pc.get('album');
		artistAlbums = pc.get('artistAlbums');
		youMightAlsoLike = pc.get('youMightAlsoLike');
		isInLibrary = pc.get('isInLibrary');
	}

	async function handleToggleLibrary(): Promise<void> {
		if (!album) return;
		const success = await toggleAlbumLibrary(album, isInLibrary, `album-${id}`);
		if (success) {
			isInLibrary = !isInLibrary;
			pc.set('isInLibrary', isInLibrary);
			if (album) {
				album.isSub = isInLibrary;
				setPageData(`album-${id}`, 'album', album);
			}
		}
	}

	const menu = createSongMenuState(
		() => menu.songId ? `${window.location.origin}/song/${menu.songId}` : '',
		() => menu.songId ? [{ label: '查看制作人员', icon: ICONS.CREDITS, action: () => { if (menu.songId) goto(`/song/${menu.songId}`); } }] : undefined
	);

	const headerMenu = createMenuState<void>();
	const albumMenu = createIndexMenuState();

	let headerMenuItems = $derived(createShareCopyMenu(() => window.location.href));
	let albumMenuItems = $derived(createShareCopyMenu(
		() => { const al = artistAlbums[albumMenu.target ?? -1]; return al ? `${window.location.origin}/album/${al.id}` : ''; }
	));

	function openAlbumMenu(e: MouseEvent, _album: EmosArtistAlbum, index: number) { albumMenu.open(e, index); }

	let hasAlternateSections = $derived(artistAlbums.length > 0 || youMightAlsoLike.length > 0);
	let metadataBottom = $derived(getMetadataBottom(album));
	let footerText = $derived(getFooterText(album));

	$effect(() => {
		const unsub = pc.subscribe(syncFromCache);
		if (pc.loaded()) { syncFromCache(); loading = false; }
		else {
			loading = true;
			error = '';
			loadAlbumData(id, pc).then(() => { syncFromCache(); loading = false; }).catch((e) => {
				console.error('Failed to load album:', e);
				error = '加载专辑失败';
				loading = false;
			});
		}
		return unsub;
	});
</script>

<svelte:head>
	<title>{album?.name ?? '专辑'} - EMOS Music</title>
</svelte:head>

{#if error}
	<div class="section section--full-width">
		<div class="section-content">
			<ErrorState message={error} onRetry={() => { loading = true; error = ''; loadAlbumData(id, pc).then(() => { syncFromCache(); loading = false; }).catch(() => { error = '加载专辑失败'; loading = false; }); }} />
		</div>
	</div>
{:else if album}
	{@const currentAlbum = album}
	<DetailHeader
		artworkUrl={getArtworkUrl(currentAlbum.picUrl, ARTWORK_SIZE.DETAIL)}
		title={currentAlbum.name}
		tertiaryTitles=""
		{metadataBottom}
		onShare={() => { if (navigator.share) { navigator.share({ url: window.location.href }); } }}
		onMoreMenu={(e) => headerMenu.open(e, undefined)}
		moreMenuExpanded={headerMenu.isOpen}
		onPlay={() => { if (currentAlbum.songs.length > 0) playSong(currentAlbum.songs[0], currentAlbum.songs); }}
		{isInLibrary}
		onToggleLibrary={isEmosLoggedIn() ? handleToggleLibrary : undefined}
	>
	</DetailHeader>

	<div class="section section--full-width">
		<div class="section-content">
			<SongsList
				variant="album"
				songs={currentAlbum.songs.map(s => ({
					id: s.id,
					name: s.name,
					artists: s.ar,
					album: { id: currentAlbum.id, name: currentAlbum.name },
					duration: s.dt,
					popularity: s.pop
				}))}
				onSongMenu={menu.open}
				onPlay={(songId) => { const song = currentAlbum.songs.find(s => s.id === songId); if (song) playSong(song, currentAlbum.songs); }}
			/>
		</div>
	</div>

	{#if footerText}
		<div class="section section--full-width">
			<div class="section-content">
				<div class="tracklist-footer tracklist-footer--album">
					<div class="footer-body">
						<p class="footer-description">{footerText}</p>
					</div>
				</div>
			</div>
		</div>
	{/if}

	{#if hasAlternateSections}
		<div class="section section--alternate section--full-width">
			<div class="section-content">
				<div class="spacer-wrapper"></div>
			</div>
		</div>
	{/if}

	{#if artistAlbums.length > 0}
		<MoreArtistWorks
			artistId={currentAlbum.artist.id}
			artistName={currentAlbum.artist.name}
			albums={artistAlbums}
			menuOpenIndex={albumMenu.target ?? -1}
			onMoreClick={openAlbumMenu}
			showYear={true}
		/>
	{/if}

	<YouMightAlsoLikeSection albums={youMightAlsoLike} />
{/if}

<ContextualMenu items={menu.items} clientPos={menu.clientPos} onclose={menu.close} />
<ContextualMenu items={headerMenuItems} clientPos={headerMenu.clientPos} onclose={headerMenu.close} />
<ContextualMenu items={albumMenuItems} clientPos={albumMenu.clientPos} onclose={albumMenu.close} />
