<script lang="ts">
	import { goto } from '$app/navigation';
	import '$lib/styles/section.css';
	import '$lib/styles/shelf-grid.css';


	import SectionHeader from '$lib/components/SectionHeader.svelte';
	import InfiniteScroll from '$lib/components/InfiniteScroll.svelte';
	import ErrorState from '$lib/components/ErrorState.svelte';
	import ProductLockupCard from '$lib/components/ProductLockupCard.svelte';
	import SongsList from '$lib/components/SongsList.svelte';
	import EllipseLockup from '$lib/components/EllipseLockup.svelte';
	import ContextualMenu from '$lib/components/ContextualMenu.svelte';
	import { ICONS, ARTWORK_SIZE, createShareCopyMenu } from '$lib/utils/constants';
	import { getArtworkUrl } from '$lib/services/emos';
	import { playSong, playAlbumById, playPlaylistById } from '$lib/stores/player';
	import { albumSubtitle } from '$lib/utils/format';
	import type { EmosArtistAlbum, EmosSong, EmosPlaylist, EmosArtist } from '$lib/types/emos';
	import type { MenuGroupDef } from '$lib/utils/constants';
	import { createMenuState } from '$lib/utils/menu-state.svelte';

	type ListType = 'albums' | 'songs' | 'playlists' | 'artists';

	interface Props {
		title: string;
		type: ListType;
		albums?: EmosArtistAlbum[];
		songs?: EmosSong[];
		playlists?: EmosPlaylist[];
		artists?: EmosArtist[];
		loading?: boolean;
		error?: string;
		emptyText?: string;
		hasMore?: boolean;
		loadingMore?: boolean;
		onRetry?: () => void;
		onLoadMore?: () => void;
		songLinkPrefix?: string;
		albumLinkPrefix?: string;
		playlistLinkPrefix?: string;
		showCreditsInMenu?: boolean;
	}

	let {
		title,
		type,
		albums = [],
		songs = [],
		playlists = [],
		artists = [],
		loading = false,
		error = '',
		emptyText = '暂无内容',
		hasMore = false,
		loadingMore = false,
		onRetry,
		onLoadMore,
		songLinkPrefix = '/song',
		albumLinkPrefix = '/album',
		playlistLinkPrefix = '/playlist',
		showCreditsInMenu = false
	}: Props = $props();

	interface MenuTarget {
		index: number;
		songId?: number;
	}

	const menu = createMenuState<MenuTarget>();

	function getItemUrl(): string {
		const t = menu.target;
		if (!t) return '';
		if (type === 'artists') return t.index >= 0 && artists[t.index] ? `${window.location.origin}/artist/${encodeURIComponent(artists[t.index].name)}/${artists[t.index].id}` : '';
		if (type === 'albums') return t.index >= 0 && albums[t.index] ? `${window.location.origin}${albumLinkPrefix}/${albums[t.index].id}` : '';
		if (type === 'playlists') return t.index >= 0 && playlists[t.index] ? `${window.location.origin}${playlistLinkPrefix}/${playlists[t.index].id}` : '';
		return t.songId ? `${window.location.origin}${songLinkPrefix}/${t.songId}` : '';
	}

	let menuItems: MenuGroupDef[] = $derived.by(() => {
		const t = menu.target;
		if (!t) return [];
		const extraItems = [];
		if (showCreditsInMenu && (type === 'songs' || t.songId)) {
			extraItems.push({ label: '查看制作人员', icon: ICONS.CREDITS, action: () => { if (t.songId) goto(`${songLinkPrefix}/${t.songId}`); } });
		}
		return createShareCopyMenu(() => getItemUrl(), extraItems.length > 0 ? extraItems : undefined);
	});

	function openMenu(e: MouseEvent, index: number, songId?: number): void {
		menu.open(e, { index, songId });
	}

	function mapSongs(list: EmosSong[]) {
		return list.map(song => ({
			id: song.id,
			name: song.name,
			artists: song.ar ?? [],
			album: song.al ? { id: song.al.id, name: song.al.name, picUrl: song.al.picUrl } : undefined,
			duration: song.dt,
			popularity: 0
		}));
	}


	let isEmpty = $derived(
		(type === 'albums' && albums.length === 0) ||
		(type === 'songs' && songs.length === 0) ||
		(type === 'playlists' && playlists.length === 0) ||
		(type === 'artists' && artists.length === 0)
	);

</script>

<div class="section section--full-width with-top-spacing {type === 'songs' ? 'with-bottom-spacing' : ''}">
	<div class="section-content">
		<SectionHeader title={title} />

		{#if error}
			<ErrorState message={error} onRetry={onRetry} />
		{:else if type === 'albums' && albums.length > 0}
			<ul class="grid grid--flow-row">
				{#each albums as album, i (album.id)}
					<li class="grid-item">
						<ProductLockupCard
							imageUrl={getArtworkUrl(album.picUrl, ARTWORK_SIZE.LIST)}
							name={album.name}
							linkHref="{albumLinkPrefix}/{album.id}"
							subtitle={albumSubtitle(album)}
							hasOpenMenu={menu.target !== null && menu.target.index === i}
							onMoreClick={(e) => openMenu(e, i)}
							onPlayClick={() => playAlbumById(album.id)}
						/>
					</li>
				{/each}
			</ul>
			<InfiniteScroll {hasMore} loading={loadingMore} />
		{:else if type === 'songs' && songs.length > 0}
			<SongsList variant="playlist" songs={mapSongs(songs)} onSongMenu={(e, songId) => openMenu(e, -1, songId)} onPlay={(songId) => { const song = songs.find(s => s.id === songId); if (song) playSong(song, songs); }} />
			<InfiniteScroll {hasMore} loading={loadingMore} />
		{:else if type === 'playlists' && playlists.length > 0}
			<ul class="grid grid--flow-row">
				{#each playlists as playlist, i (playlist.id)}
					<li class="grid-item">
						<ProductLockupCard
							imageUrl={getArtworkUrl(playlist.coverImgUrl, ARTWORK_SIZE.LIST)}
							name={playlist.name}
							linkHref="{playlistLinkPrefix}/{playlist.id}"
							subtitle={playlist.creator.nickname}
							hasOpenMenu={menu.target !== null && menu.target.index === i}
							onMoreClick={(e) => openMenu(e, i)}
							onPlayClick={() => playPlaylistById(playlist.id)}
						/>
					</li>
				{/each}
			</ul>
			<InfiniteScroll {hasMore} loading={loadingMore} />
		{:else if type === 'artists' && artists.length > 0}
			<ul class="grid grid--flow-row grid--artists-list">
				{#each artists as artist, i (artist.id)}
					<li class="grid-item">
						<EllipseLockup {artist} />
					</li>
				{/each}
			</ul>
			<InfiniteScroll {hasMore} loading={loadingMore} />
		{:else if !loading}
			<div class="page-loading">{emptyText}</div>
		{/if}
	</div>
</div>

<ContextualMenu items={menuItems} clientPos={menu.clientPos} onclose={menu.close} />
