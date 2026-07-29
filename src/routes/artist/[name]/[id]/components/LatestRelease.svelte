<script lang="ts">
	import { getArtworkUrl } from '$lib/services/emos';
	import { ARTWORK_SIZE, ICONS } from '$lib/utils/constants';
	import '../styles/latest-release.css';
	import '$lib/styles/product-lockup.css';
	import '$lib/styles/artwork-component.css';
	import '$lib/styles/play-more-buttons.css';

	interface Props {
		imageUrl: string;
		headline: string;
		title: string;
		subtitle: string;
		linkHref: string;
		hasOpenMenu?: boolean;
		onMoreClick?: (e: MouseEvent) => void;
		onPlay?: () => void;
	}

	let { imageUrl, headline, title, subtitle, linkHref, hasOpenMenu = false, onMoreClick, onPlay }: Props = $props();
</script>

<div class="latest-release" data-testid="artist-latest-release">
	<div class="product-lockup interactive {hasOpenMenu ? 'has-open-menu' : ''}">
		<div class="product-lockup__artwork has-controls">
			<div class="artwork-component artwork-component--aspect-ratio artwork-component--orientation-square artwork-component--fullwidth artwork-component--has-borders container-style">
				<img alt="" class="artwork-component__image" loading="lazy"
					src={getArtworkUrl(imageUrl, ARTWORK_SIZE.LIST)}
					role="presentation" decoding="async" />
			</div>
			<div class="product-lockup__controls">
				<a class="product-lockup__link" href={linkHref}>{title}</a>
				<div class="product-lockup__play-button">
					<button class="play-button play-button--platter" aria-label="播放 {title}" type="button" onclick={(e) => { e.preventDefault(); e.stopPropagation(); onPlay?.(); }}>
						<svg aria-hidden="true" class="icon play-svg" viewBox="0 0 60 60">
							<path class="icon-circle-fill__circle" fill="transparent" d={ICONS.PLATTER_PLAY_CIRCLE} />
							<path fill="#fff" d={ICONS.PLATTER_PLAY_TRIANGLE} />
						</svg>
					</button>
				</div>
				{#if onMoreClick}
					<div class="product-lockup__context-button">
						<button class="more-button more-button--platter more-button--material" aria-label="更多" onclick={onMoreClick}>
							<svg viewBox="0 0 28 28" class="glyph">
								<circle fill="var(--iconCircleFill, transparent)" cx="14" cy="14" r="14" />
								<path fill="var(--iconEllipsisFill, #fff)" d={ICONS.ELLIPSIS} />
							</svg>
						</button>
					</div>
				{/if}
			</div>
		</div>
	</div>
	<ul class="lockup-lines">
		<li class="latest-release__headline" data-testid="latest-release-headline">{headline}</li>
		<div class="latest-release__container">
			<li class="latest-release__title" data-testid="latest-release-title">
				<a class="click-action" href={linkHref}>{title}</a>
			</li>
		</div>
		<li class="latest-release__subtitle" data-testid="latest-release-subtitle">{subtitle}</li>
		<li class="latest-release__add"></li>
	</ul>
</div>
