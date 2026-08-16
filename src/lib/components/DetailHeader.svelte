<script lang="ts">
	import '$lib/styles/artwork-component.css';
	import '$lib/styles/detail-header.css';
	import '$lib/styles/play-more-buttons.css';
	import type { Snippet } from 'svelte';
	import { ICONS } from '$lib/utils/constants';

	let {
		artworkUrl,
		title,
		subtitles,
		tertiaryTitles = '',
		metadataBottom = '',
		artworkShape = 'square',
		onShare = () => {},
		onMoreMenu,
		moreMenuExpanded = false,
		onPlay,
		isInLibrary = false,
		onToggleLibrary,
		children,
		headingsSlot
	}: {
		artworkUrl: string;
		title: string;
		subtitles?: Snippet;
		tertiaryTitles?: string;
		metadataBottom?: string;
		artworkShape?: 'square' | 'circle';
		onShare?: () => void;
		onMoreMenu: (e: MouseEvent) => void;
		moreMenuExpanded?: boolean;
		onPlay?: () => void;
		isInLibrary?: boolean;
		onToggleLibrary?: () => void;
		children?: Snippet;
		headingsSlot?: Snippet;
	} = $props();

	let isCircle = $derived(artworkShape === 'circle');
</script>

<div class="container-detail-header-wrapper">
	<div class="container-detail-header">
		<div class="secondary-actions">
			<div class="cloud-buttons cloud-buttons--with-platter">
				<div class="share-button">
					<button type="button" aria-label="分享" onclick={onShare}>
						<svg viewBox="0 0 89.425 112.844">
							<path d={ICONS.SHARE_BOX} fill="var(--shareIconColor, currentColor)"/>
							<path d={ICONS.SHARE_ARROW} fill="var(--shareIconColor, currentColor)"/>
						</svg>
					</button>
				</div>
				<button class="contextual-menu__trigger" type="button" aria-label="更多" aria-haspopup="true" aria-expanded={moreMenuExpanded ? 'true' : 'false'} onclick={onMoreMenu}>
					<span aria-label="更多" class="more-button more-button--platter">
						<svg viewBox="0 0 28 28" xmlns="http://www.w3.org/2000/svg">
							<circle fill="var(--iconCircleFill, transparent)" cx="14" cy="14" r="14"/>
							<path fill="var(--iconEllipsisFill, white)" d={ICONS.ELLIPSIS}/>
						</svg>
					</span>
				</button>
			</div>
		</div>

		<div class="artwork-wrapper" class:artwork-wrapper--circle={isCircle}>
			<div class="artwork__radiosity">
				<div class="artwork-component artwork-component--aspect-ratio artwork-component--orientation-square" class:artwork-component--circle={isCircle}>
					<img alt="" class="artwork-component__image" loading="lazy"
						src={artworkUrl}
						role="presentation" decoding="async" />
				</div>
			</div>
			<div class="artwork__contrast-gradient"></div>
			<div class="artwork__main artwork__main--square" class:artwork__main--circle={isCircle}>
				<div class="artwork-component artwork-component--aspect-ratio artwork-component--orientation-square artwork-component--has-borders" class:artwork-component--circle={isCircle}>
					<img alt="" class="artwork-component__image"
						src={artworkUrl}
						role="presentation" decoding="async" fetchpriority="high" />
				</div>
				{#if !isCircle}
					<div class="artwork__base-stroke"></div>
					<div class="artwork__refraction-stroke"></div>
					<div class="artwork__sheen-overlay"></div>
				{/if}
			</div>
		</div>

		{#if headingsSlot}
			{@render headingsSlot()}
		{:else}
			<div class="headings">
				<div class="headings__metadata-top"></div>
				<h1 class="headings__title"><span dir="auto">{title}</span><span class="headings__badges"></span></h1>
				{#if subtitles}
					<div class="headings__subtitles">{@render subtitles()}</div>
				{/if}
				{#if tertiaryTitles}
					<div class="headings__tertiary-titles">{tertiaryTitles}</div>
				{/if}
				{#if metadataBottom}
					<div class="headings__metadata-bottom">{metadataBottom}</div>
				{/if}
			</div>
		{/if}

		{@render children?.()}

		<div class="primary-actions primary-actions--ordered">
			<div class="primary-actions__button primary-actions__button--play">
				<div class="button pill">
					<button class="click-action" type="button" onclick={onPlay}>
						<span class="icon">
							<svg width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
								<path d={ICONS.PLAY_SMALL}/>
							</svg>
						</span> <span class="button__text">播放</span>
					</button>
				</div>
			</div>
			{#if onToggleLibrary}
				<div class="primary-actions__button primary-actions__button--add-to-library">
					<div class="add-to-library-button-scope">
						<div class="cloud-buttons">
							<button class="add-to-library-button add-to-library-button--icon-only" class:is-in-library={isInLibrary} aria-label={isInLibrary ? '从资料库中删除' : '添加到资料库'} title={isInLibrary ? '从资料库中删除' : '添加到资料库'} onclick={onToggleLibrary}>
								<svg viewBox="0 0 16 16">
									{#if isInLibrary}
										<path d={ICONS.CHECKMARK}/>
									{:else}
										<path d={ICONS.PLUS}/>
									{/if}
								</svg>
							</button>
						</div>
					</div>
				</div>
			{/if}
		</div>
	</div>
</div>
