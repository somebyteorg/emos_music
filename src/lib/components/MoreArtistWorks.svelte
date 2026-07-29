<script lang="ts">
	import type { EmosArtistAlbum } from '$lib/types/emos';
	import { getArtworkUrl } from '$lib/services/emos';
	import { ARTWORK_SIZE } from '$lib/utils/constants';
	import { albumSubtitle } from '$lib/utils/format';
	import ProductLockupCard from '$lib/components/ProductLockupCard.svelte';
	import ShelfSection from '$lib/components/ShelfSection.svelte';

	interface Props {
		artistId: number;
		artistName: string;
		albums: EmosArtistAlbum[];
		menuOpenIndex: number;
		onMoreClick: (e: MouseEvent, album: EmosArtistAlbum, index: number) => void;
		showYear?: boolean;
		sectionClass?: string;
	}

	let { artistId, artistName, albums, menuOpenIndex, onMoreClick, showYear = true, sectionClass = 'section section--alternate section--full-width' }: Props = $props();
</script>

<ShelfSection title="更多{artistName}的作品" variant="playlists" linkHref="/list/albums/{encodeURIComponent(artistName)}/{artistId}" itemCount={albums.length} {sectionClass}>
		{#each albums as album, i}
			<li class="shelf-grid__list-item" data-index={i}>
				<div>
					<ProductLockupCard
						imageUrl={getArtworkUrl(album.picUrl, ARTWORK_SIZE.LIST)}
						name={album.name}
						linkHref="/album/{album.id}"
						subtitle={albumSubtitle(album, showYear)}
						hasOpenMenu={menuOpenIndex === i}
						onMoreClick={(e) => onMoreClick(e, album, i)}
					/>
				</div>
			</li>
		{/each}
</ShelfSection>
