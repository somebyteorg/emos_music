<script lang="ts">
	import '$lib/styles/ellipse-lockup.css';
	import '$lib/styles/artwork-component.css';
	import '$lib/styles/multiline-clamp.css';

	import { ARTWORK_SIZE, ICONS } from '$lib/utils/constants';
	import { getArtworkUrl } from '$lib/services/emos';
	import type { EmosArtist } from '$lib/types/emos';

	interface Props {
		artist: EmosArtist;
		imageUrl?: string;
		linkHref?: string;
	}

	let { artist, imageUrl, linkHref }: Props = $props();
	let artworkUrl = $derived((imageUrl || getArtworkUrl(artist.cover || artist.picUrl || artist.img1v1Url || '', ARTWORK_SIZE.LIST)).replace(/^http:/, 'https:'));
	let href = $derived(linkHref ?? `/artist/${encodeURIComponent(artist.name)}/${artist.id}`);
</script>

<div class="ellipse-lockup-wrapper">
	<a class="click-action" href={href}>
		<div class="ellipse-lockup content-container">
			<div class="artwork" aria-hidden="true">
				{#if artworkUrl}
					<div class="artwork-component artwork-component--aspect-ratio artwork-component--orientation-square artwork-component--fullwidth artwork-component--has-borders" style="--aspect-ratio: 1;">
						<img alt="" class="artwork-component__image" loading="lazy" src={artworkUrl} role="presentation" decoding="async" />
					</div>
				{:else}
					<div class="artwork-fallback">
						<svg viewBox="0 0 24 24" aria-hidden="true"><path d={ICONS.PERSON}></path></svg>
					</div>
				{/if}
			</div>
			<div class="text-container">
				<div class="multiline-clamp multiline-clamp--overflow" style="--mc-lineClamp: 2;">
					<span class="multiline-clamp__text">
						<span class="title" dir="auto">{artist.name}</span>
					</span>
				</div>
			</div>
		</div>
	</a>
</div>