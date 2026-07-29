<script lang="ts">
	import '$lib/styles/section.css';
	import '$lib/styles/shelf-grid.css';
	import ShelfSection from '$lib/components/ShelfSection.svelte';
	import ProductLockupCard from '$lib/components/ProductLockupCard.svelte';
	import ContextualMenu from '$lib/components/ContextualMenu.svelte';
	import { ARTWORK_SIZE, createShareCopyMenu } from '$lib/utils/constants';
	import { getArtworkUrl } from '$lib/services/emos';
	import { playAlbumById } from '$lib/stores/player';
	import { albumSubtitle } from '$lib/utils/format';
	import { createIndexMenuState } from '$lib/utils/menu-state.svelte';
	import type { EmosArtistAlbum } from '$lib/types/emos';

	interface Props {
		albums: EmosArtistAlbum[];
		artistSlug: string;
		artistId: number;
	}

	let { albums, artistSlug, artistId }: Props = $props();

	const menu = createIndexMenuState();

	let menuItems = $derived(createShareCopyMenu(
		() => { const al = menu.target !== null && menu.target >= 0 ? albums[menu.target] : null; return al ? `${window.location.origin}/album/${al.id}` : ''; }
	));
</script>

{#if albums.length > 0}
	<ShelfSection title="专辑" variant="albums" linkHref="/list/albums/{artistSlug}/{artistId}" itemCount={albums.length}>
			{#each albums as album, i (album.id)}
				<li class="shelf-grid__list-item" data-index={i}>
					<ProductLockupCard
						imageUrl={getArtworkUrl(album.picUrl, ARTWORK_SIZE.LIST)}
						name={album.name}
						linkHref="/album/{album.id}"
						subtitle={albumSubtitle(album)}
					hasOpenMenu={menu.target === i}
					onMoreClick={(e) => menu.open(e, i)}
						onPlayClick={() => playAlbumById(album.id)}
					/>
				</li>
			{/each}
	</ShelfSection>

	<ContextualMenu items={menuItems} clientPos={menu.clientPos} onclose={menu.close} />
{/if}