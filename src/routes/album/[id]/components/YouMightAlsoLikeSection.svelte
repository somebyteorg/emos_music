<script lang="ts">
	import '$lib/styles/section.css';
	import ShelfSection from '$lib/components/ShelfSection.svelte';
	import ProductLockupCard from '$lib/components/ProductLockupCard.svelte';
	import { ARTWORK_SIZE } from '$lib/utils/constants';
	import { getArtworkUrl } from '$lib/services/emos';
	import type { EmosArtistAlbum } from '$lib/types/emos';

	interface Props {
		albums: EmosArtistAlbum[];
	}

	let { albums }: Props = $props();
</script>

{#if albums.length > 0}
	<ShelfSection title="你可能还喜欢" variant="playlists" itemCount={albums.length}
		sectionClass="section section--alternate section--full-width with-bottom-spacing">
			{#each albums as al}
				<li class="shelf-grid__list-item">
					<div>
						<ProductLockupCard
							imageUrl={getArtworkUrl(al.picUrl, ARTWORK_SIZE.LIST)}
							name={al.name}
							linkHref="/album/{al.id}"
							showControls={false}
						/>
					</div>
				</li>
			{/each}
	</ShelfSection>
{/if}