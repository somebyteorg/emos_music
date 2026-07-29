<script lang="ts">
	import '$lib/styles/section.css';
	import '$lib/styles/shelf-grid.css';

	import ShelfSection from '$lib/components/ShelfSection.svelte';
	import ProductLockupCard from '$lib/components/ProductLockupCard.svelte';
	import ContextualMenu from '$lib/components/ContextualMenu.svelte';
	import { ARTWORK_SIZE, createShareCopyMenu } from '$lib/utils/constants';
	import { getArtworkUrl } from '$lib/services/emos';
	import { playSong, playPlaylistById } from '$lib/stores/player';
	import { createIndexMenuState } from '$lib/utils/menu-state.svelte';
	import type { EmosPlaylist } from '$lib/types/emos';

	interface Props {
		playlists: EmosPlaylist[];
		searchQuery: string;
		hasMore: boolean;
	}

	let { playlists, searchQuery, hasMore }: Props = $props();

	const menu = createIndexMenuState();

	function playlistSubtitle(pl: EmosPlaylist): string {
		return pl.creator?.nickname ?? '';
	}

	function getPlaylistUrl(): string {
		const pl = menu.target !== null && menu.target >= 0 ? playlists[menu.target] : null;
		if (!pl) return '';
		return `${window.location.origin}/playlist/${pl.id}`;
	}

	let menuItems = $derived(createShareCopyMenu(() => getPlaylistUrl()));</script>

<ShelfSection title="歌单" variant="playlists" linkHref={`/list/playlists/${encodeURIComponent(searchQuery)}/0`} itemCount={playlists.length} hasMore={hasMore}>
	{#each playlists as pl, i (pl.id)}
		<li class="shelf-grid__list-item" data-index={i}>
			<ProductLockupCard
				imageUrl={getArtworkUrl(pl.coverImgUrl, ARTWORK_SIZE.LIST)}
				name={pl.name}
				linkHref="/playlist/{pl.id}"
				subtitle={playlistSubtitle(pl)}
			hasOpenMenu={menu.isOpen && menu.target === i}
			onMoreClick={(e) => { e.stopPropagation(); menu.open(e, i); }}
				onPlayClick={() => playPlaylistById(pl.id)}
			/>
		</li>
	{/each}
</ShelfSection>

<ContextualMenu items={menuItems} clientPos={menu.clientPos} onclose={menu.close} />