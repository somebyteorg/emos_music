<script lang="ts">
	import { goto } from '$app/navigation';
	import { getArtworkUrl } from '$lib/services/emos';
	import { playSong } from '$lib/stores/player';
	import { ARTWORK_SIZE, ICONS, createShareCopyMenu } from '$lib/utils/constants';
	import { createIndexMenuState, createSongMenuState } from '$lib/utils/menu-state.svelte';

	import ErrorState from '$lib/components/ErrorState.svelte';
	import ContextualMenu from '$lib/components/ContextualMenu.svelte';
	import DetailHeader from '$lib/components/DetailHeader.svelte';
	import MoreArtistWorks from '$lib/components/MoreArtistWorks.svelte';
	import CreditSection from './components/CreditSection.svelte';
	import LyricsSnippet from './components/LyricsSnippet.svelte';
	import FullLyricsModal from './components/FullLyricsModal.svelte';

	import '$lib/styles/section.css';
	import '$lib/styles/song-header.css';
	import './styles/song-content.css';
	import { createSongCache, loadSongData } from './data';
	import type { EmosArtistAlbum } from '$lib/types/emos';

	let { params } = $props();
	let id = $derived(Number(params.id) || 0);

	let pc = $derived(createSongCache(id));
	let song = $state(pc.get('song'));
	let lyricLines = $state(pc.get('lyricLines'));
	let artistAlbums = $state<EmosArtistAlbum[]>(pc.get('artistAlbums'));
	let performingArtists = $state(pc.get('performingArtists'));
	let songwritingCredits = $state(pc.get('songwritingCredits'));
	let productionCredits = $state(pc.get('productionCredits'));
	let loading = $state(true);
	let error = $state('');
	let showFullLyrics = $state(false);

	function syncFromCache(): void {
		song = pc.get('song');
		lyricLines = pc.get('lyricLines');
		artistAlbums = pc.get('artistAlbums');
		performingArtists = pc.get('performingArtists');
		songwritingCredits = pc.get('songwritingCredits');
		productionCredits = pc.get('productionCredits');
	}

	const menu = createSongMenuState(
		() => window.location.href,
		() => [{ label: '显示专辑', icon: ICONS.SHOW_ALBUM, action: () => { if (song?.al?.id) goto(`/album/${song.al.id}`); } }]
	);

	const albumMenu = createIndexMenuState();

	let albumMenuItems = $derived(createShareCopyMenu(
		() => { const al = artistAlbums[albumMenu.target ?? -1]; return al ? `${window.location.origin}/album/${al.id}` : ''; }
	));

	function openAlbumMenu(e: MouseEvent, _album: EmosArtistAlbum, index: number) { albumMenu.open(e, index); }

	$effect(() => {
		const unsub = pc.subscribe(syncFromCache);
		if (pc.loaded()) { syncFromCache(); loading = false; }
		else {
			loading = true;
			error = '';
			loadSongData(id, pc).then(() => { syncFromCache(); loading = false; }).catch((e) => {
				console.error('Failed to load song:', e);
				error = '加载歌曲失败';
				loading = false;
			});
		}
		return unsub;
	});
</script>

<svelte:head>
	<title>{song ? `${song.name} - 由${song.ar.map(a => a.name).join('、')}演唱` : '歌曲'} - EMOS Music</title>
</svelte:head>

{#if error}
	<div class="section section--full-width">
		<div class="section-content">
			<ErrorState message={error} onRetry={() => { loading = true; error = ''; loadSongData(id, pc).then(() => { syncFromCache(); loading = false; }).catch(() => { error = '加载歌曲失败'; loading = false; }); }} />
		</div>
	</div>
{:else if song}
	{@const currentSong = song}
	<DetailHeader
		artworkUrl={getArtworkUrl(currentSong.al.picUrl, ARTWORK_SIZE.DETAIL)}
		title={currentSong.name}
		onShare={() => { if (navigator.share) { navigator.share({ url: window.location.href }); } }}
		onMoreMenu={(e) => menu.open(e, id)}
		moreMenuExpanded={menu.clientPos !== null}
		onPlay={() => playSong(currentSong, [currentSong])}
	>
		{#snippet headingsSlot()}
			<div class="song-header-page-details">
				<div class="song-header-page__song-header-title" data-testid="song-title">{currentSong.name}</div>
				<div class="song-header-page__song-header-subtitle" data-testid="song-subtitle" dir="auto">
					<span data-testid="song-subtitle-album"><a class="click-action" href="/album/{currentSong.al.id}">{currentSong.al.name}</a></span>
					<span class="song-subtitles-item" data-testid="song-subtitle-artists">
						{#each currentSong.ar as a, i}{#if i > 0} / {/if}<a class="click-action" href="/artist/{encodeURIComponent(a.name)}/{a.id}">{a.name}</a>{/each}
					</span>
					{#if currentSong.publishTime}
						<span class="song-subtitles-item" data-testid="song-subtitle-year">{new Date(currentSong.publishTime).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
					{/if}
				</div>
			</div>
		{/snippet}
	</DetailHeader>

	<LyricsSnippet {lyricLines} onViewFull={() => showFullLyrics = true} />

	{#if performingArtists.length > 0}
		<CreditSection title="出演艺人" artists={performingArtists.map(a => ({ name: a.name, roles: '声乐', picUrl: a.picUrl }))} monogramPrefix="pa" />
	{/if}

	{#if songwritingCredits.length > 0}
		<CreditSection title="作曲和作词" artists={songwritingCredits} monogramPrefix="sw" />
	{/if}

	{#if productionCredits.length > 0}
		<CreditSection title="制作和工程" artists={productionCredits} monogramPrefix="pd" />
	{/if}

	{#if artistAlbums.length > 0}
		<div class="section section--alternate section--full-width">
			<div class="section-content">
				<div class="spacer-wrapper"></div>
			</div>
		</div>
		<MoreArtistWorks
			artistId={song.ar[0]?.id ?? 0}
			artistName={song.ar[0]?.name ?? '艺人'}
			albums={artistAlbums}
			menuOpenIndex={albumMenu.target ?? -1}
			onMoreClick={openAlbumMenu}
			showYear={false}
		/>
	{/if}
{/if}

<ContextualMenu items={menu.items} clientPos={menu.clientPos} onclose={menu.close} />
<ContextualMenu items={albumMenuItems} clientPos={albumMenu.clientPos} onclose={albumMenu.close} />

{#if song && lyricLines.length > 0}
	<FullLyricsModal {song} {lyricLines} open={showFullLyrics} onclose={() => showFullLyrics = false} />
{/if}
