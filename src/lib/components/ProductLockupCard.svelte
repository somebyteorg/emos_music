<script lang="ts">
	import '$lib/styles/artwork-component.css';
	import '$lib/styles/product-lockup.css';
	import '$lib/styles/play-more-buttons.css';
	import '$lib/styles/multiline-clamp.css';
	import { ICONS } from '$lib/utils/constants';

	interface Props {
		imageUrl?: string;
		name: string;
		linkHref?: string;
		subtitle?: string;
		hasOpenMenu?: boolean;
		onMoreClick?: (e: MouseEvent) => void;
		onPlayClick?: () => void;
		onCardClick?: () => void;
		showControls?: boolean;
		placeholderText?: string;
		ariaLabel?: string;
		largePlayButton?: boolean;
		overlayTitle?: boolean;
		overlayEyebrow?: string;
		overlaySubtitle?: string;
	}

	let {
		imageUrl: imageUrlProp,
		name,
		linkHref = '#',
		subtitle,
		hasOpenMenu = false,
		onMoreClick,
		onPlayClick,
		onCardClick,
		showControls = true,
		placeholderText,
		ariaLabel,
		largePlayButton = false,
		overlayTitle = false,
		overlayEyebrow,
		overlaySubtitle
	}: Props = $props();
	let imageUrl = $derived(imageUrlProp?.replace(/^http:/, 'https:'));
</script>

<div class="square-lockup-wrapper">
	<div class="product-lockup interactive {hasOpenMenu ? 'has-open-menu' : ''} {overlayTitle ? 'product-lockup--overlay-title' : ''}" aria-label={ariaLabel ?? name}>
		<div class="product-lockup__artwork {showControls ? 'has-controls' : ''}">
			{#if showControls}
				<div class="artwork-component artwork-component--aspect-ratio artwork-component--orientation-square artwork-component--fullwidth artwork-component--has-borders container-style">
					{#if imageUrl}
						<img alt="" class="artwork-component__image" loading="lazy"
							src={imageUrl}
							role="presentation" decoding="async" />
					{:else if placeholderText}
						<div class="category-brick__placeholder">
							<span class="category-brick__placeholder-text">{placeholderText}</span>
						</div>
					{/if}
				</div>
				<div class="product-lockup__controls">
					{#if onCardClick}
						<button class="product-lockup__link product-lockup__link-button" type="button" onclick={onCardClick}>{name}</button>
					{:else}
						<a class="product-lockup__link" href={linkHref}>{name}</a>
					{/if}
					{#if overlayTitle}
						<div class="product-lockup__overlay">
							<div class="product-lockup__overlay-content">
								{#if overlayEyebrow}
									<div class="product-lockup__overlay-eyebrow">{overlayEyebrow}</div>
								{/if}
								<div class="product-lockup__overlay-text">{name}</div>
								{#if overlaySubtitle}
									<div class="product-lockup__overlay-subtitle">{overlaySubtitle}</div>
								{/if}
							</div>
							<div class="product-lockup__overlay-play">
								<button class="play-button play-button--platter" aria-label="播放" onclick={(e) => { e.preventDefault(); e.stopPropagation(); onPlayClick?.(); }}>
									<svg aria-hidden="true" class="icon play-svg" viewBox="0 0 60 60">
										<path class="icon-circle-fill__circle" fill="transparent" d={ICONS.PLATTER_PLAY_CIRCLE} />
										<path fill="#fff" d={ICONS.PLATTER_PLAY_TRIANGLE} />
									</svg>
								</button>
							</div>
						</div>
					{:else}
						<div class="product-lockup__play-button" class:product-lockup__play-button--large={largePlayButton}>
							<button class="play-button play-button--platter" class:is-large={largePlayButton} aria-label="播放" onclick={(e) => { e.preventDefault(); e.stopPropagation(); onPlayClick?.(); }}>
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
					{/if}
				</div>
			{:else}
				<svelte:element this={onCardClick ? 'button' : 'a'} href={onCardClick ? undefined : linkHref} type={onCardClick ? 'button' : undefined} class="click-action product-lockup__artwork-action" onclick={onCardClick}>
					<div class="artwork-component artwork-component--aspect-ratio artwork-component--orientation-square artwork-component--fullwidth artwork-component--has-borders container-style">
						{#if imageUrl}
							<img alt="" class="artwork-component__image" loading="lazy"
								src={imageUrl}
								role="presentation" decoding="async" />
						{:else if placeholderText}
							<div class="category-brick__placeholder">
								<span class="category-brick__placeholder-text">{placeholderText}</span>
							</div>
						{/if}
					</div>
				</svelte:element>
			{/if}
		</div>
		{#if !overlayTitle}
			<div class="product-lockup__content">
				<div class="product-lockup__content-details product-lockup__content-details--no-subtitle-link">
					<div class="product-lockup__title-link product-lockup__title-link--multiline">
						<div class="multiline-clamp multiline-clamp--overflow multiline-clamp--with-badge" style="--mc-lineClamp: 2;">
							<span class="multiline-clamp__text">
								{#if onCardClick}
									<button class="product-lockup__title product-lockup__title-button" type="button" onclick={onCardClick}>{name}</button>
								{:else}
									<a href={linkHref} class="product-lockup__title">{name}</a>
								{/if}
							</span>
							<span class="multiline-clamp__badge"></span>
						</div>
						<div class="product-lockup__top-end"></div>
					</div>
					{#if subtitle}
						<div class="product-lockup__subtitle-links product-lockup__subtitle-links--singlet">
							<div class="multiline-clamp multiline-clamp--overflow" style="--mc-lineClamp: 1;">
								<span class="multiline-clamp__text">
									<span class="product-lockup__subtitle">{subtitle}</span>
								</span>
							</div>
						</div>
					{/if}
				</div>
			</div>
		{/if}
	</div>
</div>
