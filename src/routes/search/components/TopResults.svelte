<script lang="ts">
	import { goto } from '$app/navigation';
	import '../styles/search-results.css';
	import '$lib/styles/section.css';

	import SectionHeader from '$lib/components/SectionHeader.svelte';
	import ContextualMenu from '$lib/components/ContextualMenu.svelte';
	import { ICONS, createShareCopyMenu } from '$lib/utils/constants';
	import { createIndexMenuState } from '$lib/utils/menu-state.svelte';

	export interface TopResultItem {
		kind: string;
		name: string;
		subtitle: string;
		imageUrl: string;
		linkHref: string;
		onPlay?: () => void;
	}

	interface Props {
		items: TopResultItem[];
		searchQuery: string;
	}

	let { items, searchQuery }: Props = $props();

	const menu = createIndexMenuState();

	function isEllipse(item: TopResultItem): boolean {
		return item.kind === 'artist';
	}

	function hasPlayButton(item: TopResultItem): boolean {
		return item.kind !== 'artist';
	}

	function getItemUrl(): string {
		const item = menu.target !== null && menu.target >= 0 ? items[menu.target] : null;
		if (!item) return '';
		return `${window.location.origin}${item.linkHref}`;
	}

	let menuItems = $derived.by(() => {
		const item = menu.target !== null && menu.target >= 0 ? items[menu.target] : null;
		const isSong = item?.kind === 'song';
		return createShareCopyMenu(
			() => getItemUrl(),
			isSong ? [{ label: '查看制作人员', icon: ICONS.CREDITS, action: () => { if (item) goto(item.linkHref); } }] : undefined
		);
	});
</script>

<div class="section with-top-spacing section--full-width" aria-label="最佳结果">
	<div class="section-content">
		<SectionHeader title="最佳结果" />
		<ul class="grid grid--flow-row grid--top-results">
		{#each items as item, i}
			<li class="grid-item">
				<div class="top-search-lockup-wrapper" class:has-open-menu={menu.isOpen && menu.target === i}>
					<div class="top-search-lockup" class:top-search-lockup--ellipse={isEllipse(item)}>
						<div class="top-search-lockup__action">
							<a class="click-action" href={item.linkHref} aria-label="{item.name}\u00B7{item.subtitle}"></a>
						</div>
						<div class="top-search-lockup__content">
							<div class="top-search-lockup__artwork">
								{#if item.imageUrl}
									<img src={item.imageUrl.replace(/^http:/, 'https:')} alt="" loading="lazy" />
								{/if}
								{#if hasPlayButton(item)}
									<div class="top-search-lockup__play-button-wrapper">
										<div class="interactive-play-button">
											<button aria-label="播放" class="play-button play-button--standard" onclick={(e) => { e.preventDefault(); e.stopPropagation(); item.onPlay?.(); }}>
												<svg width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" class="icon play-svg" aria-hidden="true">
													<path fill="currentColor" d={ICONS.PLAY_SMALL}></path>
												</svg>
											</button>
										</div>
									</div>
								{/if}
							</div>
							<div class="top-search-lockup__description">
								<ul>
									<li class="top-search-lockup__primary">
										<span class="top-search-lockup__primary__title" dir="auto">{item.name}</span>
									</li>
									<li class="top-search-lockup__secondary">{item.subtitle}</li>
								</ul>
							</div>
						</div>
						<div class="top-search-lockup__icons">
							<div class="cloud-buttons">
								<button class="more-button more-button--non-platter" type="button" aria-label="更多" onclick={(e) => { e.stopPropagation(); menu.open(e, i); }}>
									<svg width="28" height="28" viewBox="0 0 28 28" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
										<path fill="var(--iconEllipsisFill, var(--keyColor))" d={ICONS.ELLIPSIS}></path>
									</svg>
								</button>
							</div>
						</div>
					</div>
				</div>
			</li>
		{/each}
	</ul>
	</div>
</div>

<ContextualMenu items={menuItems} clientPos={menu.clientPos} onclose={menu.close} />
