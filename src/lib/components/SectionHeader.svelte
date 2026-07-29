<script lang="ts">
	import '$lib/styles/section.css';
	import { ICONS } from '$lib/utils/constants';

	interface Props {
		title: string;
		linkHref?: string;
		hasMore?: boolean;
	}

	let { title, linkHref, hasMore = false }: Props = $props();

	let showLink = $derived(hasMore && linkHref);
</script>

<div class="section-header">
	<div class="header-title-wrapper">
		<h2 class="section-title">
			{#if showLink}
				<a class="title-link" href={linkHref}>
					<span class="dir-wrapper" dir="auto">{title}</span>
					<svg class="chevron" width="12" height="12" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
						<path d={ICONS.CHEVRON_RIGHT} />
					</svg>
				</a>
			{:else}
				<span class="dir-wrapper" dir="auto">{title}</span>
			{/if}
		</h2>
	</div>
</div>
