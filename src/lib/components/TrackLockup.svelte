<script lang="ts">
	import { getArtworkUrl } from '$lib/services/emos';
	import { ARTWORK_SIZE, ICONS } from '$lib/utils/constants';
	import '$lib/styles/track-lockup.css';
	import '$lib/styles/interactive-buttons.css';
	import '$lib/styles/artwork-component.css';
	import '$lib/styles/play-more-buttons.css';

	interface Props {
		rank?: number;
		imageUrl: string;
		title: string;
		subtitle: string;
		linkHref?: string;
		onMoreClick?: (e: MouseEvent) => void;
		onPlay?: () => void;
	}

	let { rank, imageUrl, title, subtitle, linkHref = '#', onMoreClick, onPlay }: Props = $props();

	let imgSrc = $derived(
		imageUrl.startsWith('http')
			? imageUrl.replace(/^http:/, 'https:')
			: imageUrl.startsWith('/api/')
				? imageUrl
				: getArtworkUrl(imageUrl, ARTWORK_SIZE.THUMBNAIL)
	);
	let imgFailed = $state(false);

	function handleImgError() {
		imgFailed = true;
	}
</script>

<div class="track-lockup is-link" role="listitem" aria-label="{title}、{subtitle}">
	<a class="click-action track-lockup__action" href={linkHref} aria-label="{title}、{subtitle}"></a>
	{#if rank !== undefined}
		<span class="lockup-ranking">{rank}</span>
	{/if}
	<div class="track-lockup__artwork-wrapper">
		<div class="artwork-component artwork-component--aspect-ratio artwork-component--orientation-square artwork-component--has-borders"
			style="--aspect-ratio: 1;">
			{#if imgFailed}
				<div class="artwork-component__placeholder">
					<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" class="artwork-component__placeholder-icon" aria-hidden="true">
						<path fill="var(--systemQuaternary)" d={ICONS.MUSIC_NOTE} />
					</svg>
				</div>
			{:else}
				<img alt="" class="artwork-component__image" loading="lazy"
					src={imgSrc}
					role="presentation" decoding="async"
					onerror={handleImgError} />
			{/if}
		</div>
		<div class="track-lockup__play-button-wrapper">
			<div class="interactive-play-button">
				<button aria-label="播放" class="play-button play-button--standard" onclick={onPlay}>
					<svg width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" class="icon play-svg" aria-hidden="true">
						<path fill="currentColor" d={ICONS.PLAY_SMALL}></path>
					</svg>
				</button>
			</div>
		</div>
	</div>
	<ul class="track-lockup__content">
		<li class="track-lockup__title">
			<div class="track-lockup__clamp-wrapper">
				<a class="click-action" href={linkHref} aria-label="{title}、{subtitle}">{title}</a>
			</div>
		</li>
		<li class="track-lockup__subtitle">
			<div class="track-lockup__clamp-wrapper">
				<span>{subtitle}</span>
			</div>
		</li>
	</ul>
	<div class="track-lockup__context-menu">
		{#if onMoreClick}
			<div class="cloud-buttons">
				<button class="contextual-menu__trigger" type="button" aria-label="更多" aria-haspopup="true" onclick={onMoreClick}>
					<span aria-label="更多" class="more-button more-button--non-platter">
						<svg width="28" height="28" viewBox="0 0 28 28" class="glyph" xmlns="http://www.w3.org/2000/svg">
							<path fill="var(--iconEllipsisFill, var(--contextMenuEllipsisFillOverride, var(--keyColor)))" d={ICONS.ELLIPSIS} />
						</svg>
					</span>
				</button>
			</div>
		{/if}
	</div>
</div>
