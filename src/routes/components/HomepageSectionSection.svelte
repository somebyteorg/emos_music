<script lang="ts">
	import '$lib/styles/section.css';
	import '$lib/styles/shelf-grid.css';
	import ShelfSection from '$lib/components/ShelfSection.svelte';
	import ProductLockupCard from '$lib/components/ProductLockupCard.svelte';
	import ContextualMenu from '$lib/components/ContextualMenu.svelte';
	import { ARTWORK_SIZE, createShareCopyMenu } from '$lib/utils/constants';
	import { getArtworkUrl } from '$lib/services/emos';
	import { createMenuState } from '$lib/utils/menu-state.svelte';
	import { getResourceLinkHref, getResourceOnPlay } from '../data';
	import type { HomepageResource, HomepageSection } from '$lib/services/emos';

	interface Props {
		sections: HomepageSection[];
	}

	let { sections }: Props = $props();

	const menu = createMenuState<HomepageResource>();

	let menuItems = $derived(createShareCopyMenu(() => menu.target ? `${window.location.origin}${getResourceLinkHref(menu.target)}` : ''));
</script>

{#each sections as section (section.blockCode)}
	<ShelfSection title={section.title} variant="playlists">
			{#each section.resources as r, ri (r.id)}
				<li class="shelf-grid__list-item" data-index={ri}>
					<ProductLockupCard
						imageUrl={getArtworkUrl(r.imageUrl, ARTWORK_SIZE.LIST)}
						name={r.name}
						subtitle={r.subTitle}
						linkHref={getResourceLinkHref(r)}
						showControls={true}
						onPlayClick={getResourceOnPlay(r)}
						onMoreClick={(e) => { e.stopPropagation(); menu.open(e, r); }}
					/>
				</li>
			{/each}
	</ShelfSection>
{/each}

<ContextualMenu items={menuItems} clientPos={menu.clientPos} onclose={menu.close} />
