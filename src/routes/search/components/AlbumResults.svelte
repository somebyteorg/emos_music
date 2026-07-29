<script lang="ts">
	import '$lib/styles/section.css';
	import '$lib/styles/shelf-grid.css';

	import SectionHeader from '$lib/components/SectionHeader.svelte';
	import ShelfSection from '$lib/components/ShelfSection.svelte';
	import ProductLockupCard from '$lib/components/ProductLockupCard.svelte';
	import ContextualMenu from '$lib/components/ContextualMenu.svelte';
	import { ARTWORK_SIZE, createShareCopyMenu } from '$lib/utils/constants';
	import { getArtworkUrl } from '$lib/services/emos';
	import { albumSubtitle } from '$lib/utils/format';
	import { playSong, playAlbumById } from '$lib/stores/player';
	import { createIndexMenuState } from '$lib/utils/menu-state.svelte';
	import type { EmosArtistAlbum } from '$lib/types/emos';

	interface Props {
		albums: EmosArtistAlbum[];
		searchQuery: string;
		hasMore: boolean;
	}

	let { albums, searchQuery, hasMore }: Props = $props();

	const menu = createIndexMenuState();

	function getAlbumUrl(): string {
		const album = menu.target !== null && menu.target >= 0 ? albums[menu.target] : null;
		if (!album) return '';
		return `${window.location.origin}/album/${album.id}`;
	}

	let menuItems = $derived(createShareCopyMenu(() => getAlbumUrl()));</script>

<ShelfSection title="专辑" variant="albums" linkHref={`/list/albums/${encodeURIComponent(searchQuery)}/0`} itemCount={albums.length} hasMore={hasMore}>
	{#each albums as album, i (album.id)}
		<li class="shelf-grid__list-item" data-index={i}>
			<ProductLockupCard
				imageUrl={getArtworkUrl(album.picUrl, ARTWORK_SIZE.LIST)}
				name={album.name}
				linkHref="/album/{album.id}"
				subtitle={albumSubtitle(album)}
			hasOpenMenu={menu.isOpen && menu.target === i}
			onMoreClick={(e) => { e.stopPropagation(); menu.open(e, i); }}
				onPlayClick={() => playAlbumById(album.id)}
			/>
		</li>
	{/each}
</ShelfSection>

<ContextualMenu items={menuItems} clientPos={menu.clientPos} onclose={menu.close} />
