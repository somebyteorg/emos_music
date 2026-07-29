<script lang="ts">
	import { getArtworkUrl } from '$lib/services/emos';
	import { playSong, playAlbumById } from '$lib/stores/player';
	import { ARTWORK_SIZE, createShareCopyMenu } from '$lib/utils/constants';
	import { createMenuState } from '$lib/utils/menu-state.svelte';
	import { isEmosLoggedIn } from '$lib/stores/emos-auth';
	import { setPageData } from '$lib/stores/page-cache';

	import ErrorState from '$lib/components/ErrorState.svelte';
	import DetailHeader from '$lib/components/DetailHeader.svelte';
	import ContentModal from '$lib/components/ContentModal.svelte';
	import ContextualMenu from '$lib/components/ContextualMenu.svelte';
	import LatestRelease from './components/LatestRelease.svelte';
	import SectionHeader from '$lib/components/SectionHeader.svelte';
	import TopSongsSection from './components/TopSongsSection.svelte';
	import ArtistAlbumsSection from './components/ArtistAlbumsSection.svelte';

	import '$lib/styles/section.css';
	import '$lib/styles/shelf-grid.css';
	import './styles/artist-page.css';
	import { createArtistCache, loadArtistData, toggleArtistLibrary, latestAlbumHeadline, latestAlbumSubtitle } from './data';

	let { params } = $props();
	let id = $derived(Number(params.id) || 0);
	let artistId = id;
	let artistSlug = $derived(encodeURIComponent(params.name ?? ''));

	let pc = $derived(createArtistCache(id));
	let artist = $state(pc.get('artist'));
	let latestAlbum = $state(pc.get('latestAlbum'));
	let topSongs = $state(pc.get('topSongs'));
	let featuredAlbums = $state(pc.get('featuredAlbums'));
	let isInLibrary = $state(pc.get('isInLibrary'));
	let loading = $state(true);
	let error = $state('');

	function syncFromCache(): void {
		artist = pc.get('artist');
		latestAlbum = pc.get('latestAlbum');
		topSongs = pc.get('topSongs');
		featuredAlbums = pc.get('featuredAlbums');
		isInLibrary = pc.get('isInLibrary');
	}

	async function handleToggleLibrary(): Promise<void> {
		if (!artist) return;
		const success = await toggleArtistLibrary(artist, isInLibrary, `artist-${id}`);
		if (success) {
			isInLibrary = !isInLibrary;
			pc.set('isInLibrary', isInLibrary);
			if (artist) {
				artist.isSub = isInLibrary;
				setPageData(`artist-${id}`, 'artist', artist);
			}
		}
	}

	const headerMenu = createMenuState<void>();
	const latestMenu = createMenuState<void>();

	let headerMenuItems = $derived(createShareCopyMenu(() => window.location.href));
	let latestMenuItems = $derived(createShareCopyMenu(
		() => latestAlbum ? `${window.location.origin}/album/${latestAlbum.id}` : ''
	));

	let descriptionOpen = $state(false);
	let contentEl: HTMLParagraphElement | null = $state(null);
	let isDescriptionTruncated = $derived.by(() => contentEl ? contentEl.scrollHeight > contentEl.clientHeight : false);

	$effect(() => {
		const unsub = pc.subscribe(syncFromCache);
		if (pc.loaded()) { syncFromCache(); loading = false; }
		else {
			loading = true;
			error = '';
			loadArtistData(id, pc).then(() => { syncFromCache(); loading = false; }).catch((e) => {
				console.error('Failed to load artist:', e);
				error = '加载歌手失败';
				loading = false;
			});
		}
		return unsub;
	});
</script>

<svelte:head>
	<title>{artist?.name ?? '歌手'} - EMOS Music</title>
</svelte:head>

{#if error}
	<div class="section with-top-spacing section--full-width">
		<div class="section-content">
			<ErrorState message={error} onRetry={() => { loading = true; error = ''; loadArtistData(id, pc).then(() => { syncFromCache(); loading = false; }).catch(() => { error = '加载歌手失败'; loading = false; }); }} />
		</div>
	</div>
{:else if artist}
	<DetailHeader
		artworkUrl={getArtworkUrl(artist.avatar ?? artist.cover ?? artist.picUrl ?? '', ARTWORK_SIZE.DETAIL)}
		title={artist.name}
		tertiaryTitles=""
		metadataBottom=""
		artworkShape="circle"
		onShare={() => { if (navigator.share) { navigator.share({ title: artist!.name }); } }}
		onMoreMenu={(e) => headerMenu.open(e, undefined)}
		moreMenuExpanded={headerMenu.isOpen}
		onPlay={() => { if (topSongs.length > 0) playSong(topSongs[0], topSongs); }}
		{isInLibrary}
		onToggleLibrary={isEmosLoggedIn() ? handleToggleLibrary : undefined}
	>
				{#if artist.briefDesc}
					<div class="description">
						<div class="truncate-wrapper">
							<p dir="auto" class="content" class:with-more-button={isDescriptionTruncated} style="--lines: 3; --line-height: var(--lineHeight, 16); --link-length: 2;" bind:this={contentEl}>{artist.briefDesc}</p>
							{#if isDescriptionTruncated}
								<button class="more" type="button" onclick={() => descriptionOpen = true}>更多</button>
							{/if}
						</div>
						{#if isDescriptionTruncated}
							<ContentModal title={artist.name} open={descriptionOpen} onclose={() => descriptionOpen = false}>
									<p>{artist!.briefDesc}</p>
							</ContentModal>
						{/if}
					</div>
				{/if}
			</DetailHeader>


	{#if latestAlbum || topSongs.length > 0}
		<div class="section section--full-width with-pinned-item" aria-label="歌曲排行">
			{#if latestAlbum}
				{@const currentLatestAlbum = latestAlbum}
				<div class="pinned-item" aria-label="最新发布">
					<SectionHeader title="最新发布" />
					<div class="pinned-item-content">
						<LatestRelease
							imageUrl={currentLatestAlbum.picUrl}
							headline={latestAlbumHeadline(currentLatestAlbum)}
							title={currentLatestAlbum.name}
							subtitle={latestAlbumSubtitle(currentLatestAlbum)}
							linkHref="/album/{currentLatestAlbum.id}"
							hasOpenMenu={latestMenu.isOpen}
							onMoreClick={(e) => latestMenu.open(e, undefined)}
							onPlay={() => playAlbumById(currentLatestAlbum.id)}
						/>
					</div>
				</div>
			{/if}
			<TopSongsSection songs={topSongs} {artistSlug} {artistId} />
		</div>
	{/if}

	<ArtistAlbumsSection albums={featuredAlbums} {artistSlug} {artistId} />
{/if}

<ContextualMenu items={headerMenuItems} clientPos={headerMenu.clientPos} onclose={headerMenu.close} />
<ContextualMenu items={latestMenuItems} clientPos={latestMenu.clientPos} onclose={latestMenu.close} />
