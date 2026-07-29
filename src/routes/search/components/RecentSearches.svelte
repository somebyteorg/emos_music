<script lang="ts">
	import { goto } from '$app/navigation';
	import '../styles/search-results.css';
	import '$lib/styles/section.css';
	import '$lib/styles/play-more-buttons.css';
	import SectionHeader from '$lib/components/SectionHeader.svelte';
	import ContextualMenu from '$lib/components/ContextualMenu.svelte';
	import { getRecentSearches, clearRecentSearches, type RecentSearchItem } from '$lib/stores/recent-search-store';
	import { ICONS, createShareCopyMenu } from '$lib/utils/constants';
	import { playSong, playAlbumById, playPlaylistById } from '$lib/stores/player';
	import { createIndexMenuState } from '$lib/utils/menu-state.svelte';

	let items = $state<RecentSearchItem[]>(getRecentSearches());
	const menu = createIndexMenuState();

	function handleClear(): void {
		clearRecentSearches();
		items = [];
	}

	function getItemUrl(): string {
		const item = menu.target !== null && menu.target >= 0 ? items[menu.target] : null;
		if (!item) return '';
		const href = getLinkHref(item);
		return `${window.location.origin}${href}`;
	}

	function getLinkHref(item: RecentSearchItem): string {
		if (item.type === 'song') return `/song/${item.id}`;
		if (item.type === 'album') return `/album/${item.id}`;
		if (item.type === 'artist') return `/artist/${encodeURIComponent(item.name)}/${item.id}`;
		if (item.type === 'playlist') return `/playlist/${item.id}`;
		return '#';
	}

	function isEllipse(item: RecentSearchItem): boolean {
		return item.type === 'artist';
	}

	async function playItem(item: RecentSearchItem): Promise<void> {
		if (item.type === 'song') {
			playSong({ id: item.id, name: item.name, ar: [{ id: 0, name: item.subtitle }], al: { id: 0, name: '', picUrl: item.imageUrl }, dt: 0, fee: 0 });
		} else if (item.type === 'album') {
			playAlbumById(item.id);
		} else if (item.type === 'playlist') {
			playPlaylistById(item.id);
		}
	}

	let menuItems = $derived.by(() => {
		const item = menu.target !== null && menu.target >= 0 ? items[menu.target] : null;
		const extraItems = item?.type === 'song' ? [{ label: '查看制作人员', icon: ICONS.CREDITS, action: () => { if (item) goto(getLinkHref(item)); } }] : undefined;
		return createShareCopyMenu(() => getItemUrl(), extraItems);
	});
</script>

{#if items.length > 0}
	<div class="section with-top-spacing section--full-width" aria-label="最近搜索">
		<div class="section-content">
			<div class="section-header">
				<div class="section-header__title-wrapper">
					<h2 class="section-header__title">最近搜索</h2>
				</div>
				<div class="section-header__accessory">
					<button class="clear-recently-searched-button" type="button" onclick={handleClear}>清除</button>
				</div>
			</div>
			<ul class="grid grid--flow-row grid--recently-searched">
				{#each items as item, i}
					<li class="grid-item">
						<div class="top-search-lockup-wrapper top-search-lockup-wrapper--recently-searched" class:has-open-menu={menu.isOpen && menu.target === i}>
							<div class="top-search-lockup" class:top-search-lockup--ellipse={isEllipse(item)}>
								<div class="top-search-lockup__action">
									<a class="click-action" href={getLinkHref(item)} aria-label="{item.name}\u00B7{item.subtitle}"></a>
								</div>
								<div class="top-search-lockup__content">
									<div class="top-search-lockup__artwork">
										{#if item.imageUrl}
											<img src={item.imageUrl.replace(/^http:/, 'https:')} alt="" loading="lazy" />
										{/if}
										{#if item.type !== 'artist'}
											<div class="top-search-lockup__play-button-wrapper">
												<div class="interactive-play-button">
													<button aria-label="播放" class="play-button play-button--standard" onclick={(e) => { e.preventDefault(); e.stopPropagation(); playItem(item); }}>
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
{/if}
