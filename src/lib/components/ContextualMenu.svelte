<script lang="ts">
	import '$lib/styles/contextual-menu.css';
	import { ICONS } from '$lib/utils/constants';

	type MenuGroup = {
		title?: string;
		items: MenuItem[];
	};

	type MenuItem = {
		label: string;
		afterLabel?: string;
		hideIconOnTransition?: boolean;
		closeAfter?: number;
		icon?: string;
		iconTransform?: string;
		disabled?: boolean;
		action?: () => void;
		menuOpenOnClick?: boolean;
		children?: MenuGroup[];
		styles?: Record<string, string>;
	};

	interface Props {
		items: MenuGroup[];
		clientPos: { x: number; y: number } | null;
		onclose: () => void;
	}

	let {
		items,
		clientPos = null,
		onclose
	}: Props = $props();

	let menuEl: HTMLDivElement | null = $state(null);
	let rootEl: HTMLDivElement | null = $state(null);
	let successfulIndex: string | null = $state(null);
	let activeSubmenuKey: string | null = $state(null);
	let activeSubmenuEl: HTMLElement | null = $state(null);
	let focusedIndex: number = $state(-1);

	// 统一 portal：菜单打开时挂载到 body 顶层，避免被父容器
	// （backdrop-filter / overflow / 定位上下文）裁剪，与原站 amp-contextual-menu 行为一致。
	$effect(() => {
		if (!clientPos || !rootEl) return;
		const portal = document.createElement('div');
		portal.className = 'contextual-menu-portal';
		portal.style.setProperty('--ctxmenu-z-index', 'var(--z-contextual-menus)');
		portal.style.setProperty('--ctxmenu-scrim-z-index', 'calc(var(--z-contextual-menus) - 1)');
		document.body.appendChild(portal);
		portal.appendChild(rootEl);
		return () => {
			portal.remove();
		};
	});

	// 菜单关闭时统一重置内部状态：避免子菜单展开态 / 键盘焦点 / 成功动画
	// 残留到下次打开（所有调用点都只置 clientPos = null，重置收敛在此处）。
	$effect(() => {
		if (clientPos) return;
		activeSubmenuKey = null;
		activeSubmenuEl = null;
		focusedIndex = -1;
		successfulIndex = null;
	});

	$effect(() => {
		const scrollEl = document.querySelector('.scrollable-page');
		if (!scrollEl) return;
		if (clientPos) {
			scrollEl.setAttribute('aria-hidden', 'true');
			document.body.classList.add('contextual-menu-open');
		} else {
			scrollEl.removeAttribute('aria-hidden');
			document.body.classList.remove('contextual-menu-open');
		}
		return () => {
			scrollEl.removeAttribute('aria-hidden');
			document.body.classList.remove('contextual-menu-open');
		};
	});

	function itemKey(gi: number, ii: number): string {
		return `${gi}-${ii}`;
	}

	function flatItems(): MenuItem[] {
		const result: MenuItem[] = [];
		for (const group of items) {
			for (const item of group.items) {
				result.push(item);
			}
		}
		return result;
	}

	let menuStyle = $derived.by(() => {
		if (!clientPos) return '';
		const vw = window.innerWidth;
		const vh = window.innerHeight;
		const menuMinWidth = 185;
		let left = clientPos.x + 1;
		if (vw - clientPos.x <= menuMinWidth) {
			left = clientPos.x - menuMinWidth - 1;
		}
		const menuHeight = menuEl?.clientHeight ?? 0;
		if (vh - clientPos.y > menuHeight + 40) {
			return `--ctxmenu-left: ${left}px; --ctxmenu-top: ${clientPos.y}px;`;
		} else {
			return `--ctxmenu-left: ${left}px; --ctxmenu-bottom: ${vh - clientPos.y}px;`;
		}
	});

	function computeSubmenuStyle(menuItemEl: HTMLElement, itemStyles?: Record<string, string>): string {
		const parentUl = menuItemEl.closest('ul');
		if (!parentUl) return '';
		const itemRect = menuItemEl.getBoundingClientRect();
		const { offsetTop, offsetHeight } = menuItemEl;
		const { scrollTop, offsetHeight: ulHeight } = parentUl;
		const vw = window.innerWidth;
		const vh = window.innerHeight;
		const submenuWidth = 185;
		const submenuHeight = 200;
		const goRight = vw - itemRect.right > submenuWidth;
		const goLeft = itemRect.x > submenuWidth;
		const flipLeft = !goRight && goLeft;
		let style = '';
		if (flipLeft) {
			style += '--ctxmenu-submenu-right: 100%; --ctxmenu-submenu-left: initial;';
		} else {
			style += '--ctxmenu-submenu-left: 100%; --ctxmenu-submenu-right: initial;';
		}
		if (vh - itemRect.y > submenuHeight + 40) {
			style += ` --ctxmenu-submenu-top: ${offsetTop - scrollTop}px; --ctxmenu-submenu-bottom: auto;`;
		} else {
			style += ` --ctxmenu-submenu-bottom: ${ulHeight - offsetTop - offsetHeight}px; --ctxmenu-submenu-top: auto;`;
		}
		if (itemStyles) {
			for (const [k, v] of Object.entries(itemStyles)) {
				style += ` ${k}: ${v};`;
			}
		}
		return style;
	}

	function handleItemClick(item: MenuItem, gi: number, ii: number, btnEl: HTMLElement): void {
		if (item.children && item.children.length > 0) {
			activeSubmenuKey = itemKey(gi, ii);
			activeSubmenuEl = btnEl;
			if (item.menuOpenOnClick && item.action) {
				item.action();
			}
			return;
		}
		item.action?.();
		if (item.afterLabel) {
			const key = itemKey(gi, ii);
			successfulIndex = key;
			const after = item.closeAfter ?? 1000;
			setTimeout(() => {
				successfulIndex = null;
				onclose();
			}, after);
		} else if (!item.menuOpenOnClick) {
			onclose();
		}
	}

	function closeSubmenu(): void {
		activeSubmenuKey = null;
		activeSubmenuEl = null;
	}

	function handleSubItemClick(subItem: MenuItem): void {
		subItem.action?.();
		if (subItem.afterLabel) {
			const after = subItem.closeAfter ?? 1000;
			setTimeout(() => {
				onclose();
			}, after);
		} else {
			onclose();
		}
	}

	function handleKeydown(e: KeyboardEvent): void {
		if (e.key === 'Escape') {
			if (activeSubmenuKey) {
				closeSubmenu();
			} else {
				onclose();
			}
			return;
		}
		const flat = flatItems();
		if (e.key === 'ArrowDown') {
			e.preventDefault();
			focusedIndex = (focusedIndex + 1) % flat.length;
		} else if (e.key === 'ArrowUp') {
			e.preventDefault();
			focusedIndex = (focusedIndex - 1 + flat.length) % flat.length;
		}
	}
</script>

{#if clientPos}
	<div bind:this={rootEl}>
		<div class="contextual-menu__overlay" role="menu" onkeydown={handleKeydown}>
		<button class="contextual-menu-scrim" onclick={onclose} aria-label="关闭">关闭</button>
		<div
			class="contextual-menu"
			class:contextual-menu--has-active-submenu={!!activeSubmenuKey}
			style={menuStyle}
			bind:this={menuEl}
			role="menu"
			aria-hidden="false"
		>
			<ul class="contextual-menu__list" role="menu">
				{#each items as group, gi}
					{#if gi > 0}
						<li class="contextual-menu__group" role="separator">
							{#if group.title}
								<span class="contextual-menu__group-title">{group.title}</span>
							{/if}
						</li>
					{/if}
					{#each group.items as item, ii}
						{@const key = itemKey(gi, ii)}
						{@const isSuccessful = successfulIndex === key}
						{@const isSubmenuActive = activeSubmenuKey === key}
						<li
							class="contextual-menu-item"
							class:contextual-menu-item--successful={isSuccessful}
							role="menuitem"
						>
							<button
								title={item.label}
								disabled={item.disabled}
								onclick={(e) => handleItemClick(item, gi, ii, e.currentTarget)}
								onmouseenter={(e) => {
									if (item.children && item.children.length > 0) {
										activeSubmenuKey = key;
										activeSubmenuEl = e.currentTarget;
									} else if (activeSubmenuKey && !item.children) {
										closeSubmenu();
									}
								}}
							>
								<span class="contextual-menu-item__option-wrapper">
									<span class="contextual-menu-item__option-text">{item.label}</span>
									<span class="contextual-menu-item__option-text contextual-menu-item__option-text--after">{item.afterLabel ?? ''}</span>
									{#if item.icon}
										<span
											class="contextual-menu-item__icon-container"
											class:contextual-menu-item__icon-container--hide={isSuccessful && item.hideIconOnTransition}
										>
											<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" class="context-menu__option-icon">
												<path d={item.icon} transform={item.iconTransform}></path>
											</svg>
										</span>
									{/if}
									{#if item.children}
										<span class="contextual-menu-item__disclosure">
											<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 8 14" width="8" height="14">
												<path d={ICONS.CHEVRON_RIGHT_STROKE} stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
											</svg>
										</span>
									{/if}
								</span>
							</button>
							{#if item.children}
								<div
									class="contextual-menu-item--nested"
									class:contextual-menu-item--nested__active={isSubmenuActive}
									style={isSubmenuActive && activeSubmenuEl ? computeSubmenuStyle(activeSubmenuEl, item.styles) : ''}
								>
									<div class="contextual-menu contextual-menu--in-submenu" role="menu" aria-hidden={!isSubmenuActive ? 'true' : 'false'}>
										{#if isSubmenuActive}
											<div class="contextual-menu__subhead">
												<button class="contextual-menu__subhead-back" onclick={closeSubmenu}>
													<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 8 14" width="8" height="14">
														<path d={ICONS.CHEVRON_LEFT_STROKE} stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
													</svg>
													<span>{item.label}</span>
												</button>
											</div>
										{/if}
										<ul class="contextual-menu__list" role="menu">
											{#each item.children as subGroup, sgi}
												{#if sgi > 0}
													<li class="contextual-menu__group" role="separator">
														{#if subGroup.title}
															<span class="contextual-menu__group-title">{subGroup.title}</span>
														{/if}
													</li>
												{/if}
												{#each subGroup.items as subItem}
													<li class="contextual-menu-item" role="menuitem">
														<button
															title={subItem.label}
															disabled={subItem.disabled}
															onclick={() => handleSubItemClick(subItem)}
														>
															<span class="contextual-menu-item__option-wrapper">
																<span class="contextual-menu-item__option-text">{subItem.label}</span>
																<span class="contextual-menu-item__option-text contextual-menu-item__option-text--after">{subItem.afterLabel ?? ''}</span>
																{#if subItem.icon}
																	<span class="contextual-menu-item__icon-container">
																		<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" class="context-menu__option-icon">
																			<path d={subItem.icon} transform={subItem.iconTransform}></path>
																		</svg>
																	</span>
																{/if}
															</span>
														</button>
													</li>
												{/each}
											{/each}
										</ul>
									</div>
								</div>
							{/if}
						</li>
					{/each}
				{/each}
			</ul>
		</div>
		</div>
	</div>
{/if}
