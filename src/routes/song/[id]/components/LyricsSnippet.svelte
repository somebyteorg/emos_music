<script lang="ts">
	import { ICONS } from '$lib/utils/constants';
	import type { EmosLyricLine } from '$lib/types/emos';

	interface Props {
		lyricLines: EmosLyricLine[];
		onViewFull: () => void;
	}

	let { lyricLines, onViewFull }: Props = $props();
</script>

{#if lyricLines.length > 0}
	<div class="section section--full-width">
		<div class="section-content">
			<section class="cell-container">
				<h2 class="cell-title">歌词</h2>
				<div class="cell-details">
					<div class="credits__lyrics-snippet">
						{#each lyricLines.slice(0, 3) as line}
							<p class="credits__lyrics-snippet-line">{line.text}</p>
						{/each}
						<button class="credits__view-full-lyrics" type="button" onclick={onViewFull}>
							查看完整歌词
							<svg class="chevron" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" aria-hidden="true"><path d={ICONS.CHEVRON_RIGHT}></path></svg>
						</button>
					</div>
				</div>
			</section>
		</div>
	</div>
{/if}