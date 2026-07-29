<script lang="ts">
	import '../styles/search-page.css';
	import '$lib/styles/section.css';
	import '$lib/styles/shelf-grid.css';
	import ShelfSection from '$lib/components/ShelfSection.svelte';
	import ProductLockupCard from '$lib/components/ProductLockupCard.svelte';
	import EllipseLockup from '$lib/components/EllipseLockup.svelte';
	import TrackLockup from '$lib/components/TrackLockup.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import ContextualMenu from '$lib/components/ContextualMenu.svelte';
	import { ICONS, createShareCopyMenu } from '$lib/utils/constants';
	import { goto } from '$app/navigation';
	import { getArtworkUrl } from '$lib/services/emos';
	import { playSong, playAlbumById } from '$lib/stores/player';
	import { loadEmosSearch, getCachedEmosSearch } from '../emos-data';
	import type { EmosArtist, EmosArtistAlbum, EmosSong } from '$lib/types/emos';
	import type { MenuGroupDef } from '$lib/utils/constants';
	import { createMenuState } from '$lib/utils/menu-state.svelte';

	interface Props {
		searchQuery: string;
	}

	let { searchQuery }: Props = $props();

	let artists = $state<EmosArtist[]>([]);
	let albums = $state<EmosArtistAlbum[]>([]);
	let songs = $state<EmosSong[]>([]);
	let loading = $state(false);
	let debounceTimer: ReturnType<typeof setTimeout> | null = null;

	$effect(() => {
		if (searchQuery) {
			const cached = getCachedEmosSearch(searchQuery);
			if (cached) {
				artists = cached.artists;
				albums = cached.albums;
				songs = cached.songs;
				loading = false;
			} else {
				artists = [];
				albums = [];
				songs = [];
				loading = true;
			}
			if (debounceTimer) clearTimeout(debounceTimer);
			debounceTimer = setTimeout(() => doSearch(searchQuery), cached ? 0 : 300);
		}
		return () => { if (debounceTimer) clearTimeout(debounceTimer); };
	});

	async function doSearch(q: string): Promise<void> {

		try {
			const result = await loadEmosSearch(q);
			artists = result.artists;
			albums = result.albums;
			songs = result.songs;
		} catch (e) {
			console.warn('Failed to search EMOS:', e);
			artists = [];
			albums = [];
			songs = [];
		} finally {
			loading = false;
		}
	}

	let hasAny = $derived(artists.length > 0 || albums.length > 0 || songs.length > 0);

	function playEmosSong(song: EmosSong): void {
		playSong(song, songs);
	}

	interface EmosMenuTarget { albumId: string | null; items: MenuGroupDef[] }

	const menu = createMenuState<EmosMenuTarget>();
	let openMenuAlbumId = $derived(menu.target?.albumId ?? null);
	let menuItems = $derived(menu.target?.items ?? []);

	function openAlbumMenu(e: MouseEvent, album: EmosArtistAlbum): void {
		menu.open(e, { albumId: String(album.id), items: createShareCopyMenu(() => `${window.location.origin}/album/${album.id}`) });
	}

	function openSongMenu(e: MouseEvent, song: EmosSong): void {
		menu.open(e, { albumId: null, items: createShareCopyMenu(
			() => `${window.location.origin}/song/${song.id}`,
			[{ label: '前往制作人员', icon: ICONS.CREDITS, action: () => { goto(`/song/${song.id}`); } }]
		) });
	}
</script>

{#if !loading && !hasAny}
	<EmptyState icon={ICONS.SEARCH_LARGE} description={`未找到"${searchQuery}"的结果`} />
{:else if hasAny}
	{#if artists.length > 0}
		<ShelfSection title="艺人" variant="artists">
			{#each artists as artist, i (artist.id)}
				<li class="shelf-grid__list-item" data-index={i}>
					<EllipseLockup
						artist={artist satisfies EmosArtist}
						imageUrl={getArtworkUrl(artist.picUrl ?? artist.img1v1Url ?? artist.cover ?? '')}
						linkHref="/artist/{encodeURIComponent(artist.name)}/{artist.id}"
					/>
				</li>
			{/each}
		</ShelfSection>
	{/if}

	{#if albums.length > 0}
		<ShelfSection title="专辑" variant="albums">
			{#each albums as album, i (album.id)}
				<li class="shelf-grid__list-item" data-index={i}>
					<ProductLockupCard
						imageUrl={getArtworkUrl(album.picUrl)}
						name={album.name}
						subtitle={album.artist?.name ?? ''}
						linkHref="/album/{album.id}"
						showControls={true}
						hasOpenMenu={openMenuAlbumId === String(album.id)}
						onPlayClick={() => {
							playAlbumById(album.id);
						}}
						onMoreClick={(e) => openAlbumMenu(e, album)}
					/>
				</li>
			{/each}
		</ShelfSection>
	{/if}

	{#if songs.length > 0}
		<ShelfSection title="歌曲" variant="tracks-wide">
			{#each songs as song, i (song.id)}
				<li class="shelf-grid__list-item" data-index={i}>
					<TrackLockup
						imageUrl={getArtworkUrl(song.al.picUrl)}
						title={song.name}
						subtitle={`${song.ar.map((artist) => artist.name).join(' / ')} · ${song.al.name}`}
						linkHref="/song/{song.id}"
						onPlay={() => playEmosSong(song)}
						onMoreClick={(e) => openSongMenu(e, song)}
					/>
				</li>
			{/each}
		</ShelfSection>
	{/if}
{/if}

<ContextualMenu items={menuItems} clientPos={menu.clientPos} onclose={menu.close} />
