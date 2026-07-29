<script lang="ts">
	import SectionHeader from '$lib/components/SectionHeader.svelte';
	import { ICONS } from '$lib/utils/constants';
	import type { EmosPlaylistCategory } from '$lib/types/emos';

	interface Props {
		title: string;
		categories: EmosPlaylistCategory[];
		loading: boolean;
	}

	let { title, categories, loading }: Props = $props();
</script>

<div class="section section--full-width with-top-spacing with-bottom-spacing">
	<div class="section-content">
		<SectionHeader {title} />
		{#if loading}
			<div class="page-loading"></div>
		{:else if categories.length > 0}
			<ul class="explore-grid">
				{#each categories as cat}
					<li><div class="link-component"><a class="click-action" href="/list/playlists/{encodeURIComponent(cat.name)}/0"><div class="link-box"><p>{cat.name}</p><svg stroke-linejoin="round" viewBox="0 0 36 64" width="36" height="64" class="link-box__chevron" aria-hidden="true"><path d={ICONS.CHEVRON_RIGHT}/></svg></div></a></div></li>
				{/each}
			</ul>
		{:else}
			<div class="page-loading">暂无分类</div>
		{/if}
	</div>
</div>