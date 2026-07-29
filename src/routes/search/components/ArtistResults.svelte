<script lang="ts">
	import '$lib/styles/section.css';
	import '$lib/styles/shelf-grid.css';

	import SectionHeader from '$lib/components/SectionHeader.svelte';
	import EllipseLockup from '$lib/components/EllipseLockup.svelte';
	import type { EmosArtist } from '$lib/types/emos';

	interface Props {
		artists: EmosArtist[];
		searchQuery: string;
		hasMore: boolean;
	}

	let { artists, searchQuery, hasMore }: Props = $props();
</script>

<div class="section section--full-width" aria-label="艺人">
	<div class="section-content">
		<SectionHeader title="艺人" linkHref={`/list/artists/${encodeURIComponent(searchQuery)}/0`} {hasMore} />
		<div class="shelf">
			<section class="shelf-grid shelf-grid--full-width">
				<div class="shelf-grid__body">
					<ul class="shelf-grid__list grid--artists" role="list" tabindex="-1">
						{#each artists as artist}
							<li class="shelf-grid__list-item">
								<EllipseLockup {artist} />
							</li>
						{/each}
					</ul>
				</div>
			</section>
		</div>
	</div>
</div>
