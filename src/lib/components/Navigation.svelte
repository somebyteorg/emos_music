<script lang="ts">
	import '$lib/styles/navigation.css';
	import '$lib/styles/nav-item.css';
	import { page } from '$app/stores';
	import { untrack } from 'svelte';
	import { SvelteSet } from 'svelte/reactivity';
	import { navItems, libraryItems } from '$lib/data/nav-items';
	import { ICONS } from '$lib/utils/constants';
	import { subscribeEmosAuth, getEmosUser, clearEmosAuth } from '$lib/stores/emos-auth';
	import { getEmosLoginUrl } from '$lib/services/emos';
	import { getUserPlaylists } from '$lib/services/emos';
	import { subscribePlaylistLibrary, getPlaylistLibraryVersion } from '$lib/stores/page-cache';
	import ContextualMenu from '$lib/components/ContextualMenu.svelte';


	const STORAGE_KEY = 'emos-library-pins';

	function loadPins(): string[] {
		try {
			const raw = localStorage.getItem(STORAGE_KEY);
			if (raw) return JSON.parse(raw) as string[];
		} catch { /* ignore */ }
		return libraryItems.map(i => i.id);
	}

	function savePins(pins: Iterable<string>): void {
		try {
			localStorage.setItem(STORAGE_KEY, JSON.stringify([...pins]));
		} catch { /* ignore */ }
	}

	function isSelected(href: string): boolean {
		if (href === '/') return $page.url.pathname === '/';
		return $page.url.pathname === href || $page.url.pathname.startsWith(href + '/');
	}

	let emosUser = $state(getEmosUser());
	let isEditing = $state(false);
	const pinnedIds = new SvelteSet<string>(loadPins());
	let likedPlaylistId: number | null = $state(null);
	let userPlaylists: { id: number; name: string }[] = $state([]);
	let isExpanded = $state(false);
	let isTransitioning = $state(false);
	let playlistLibVer = $state(getPlaylistLibraryVersion());
	let userMenuPos = $state<{ x: number; y: number } | null>(null);

	$effect(() => {
		const unsub = subscribePlaylistLibrary(() => { playlistLibVer = getPlaylistLibraryVersion(); });
		return unsub;
	});

	$effect(() => {
		const unsub = subscribeEmosAuth((u) => { emosUser = u; });
		return unsub;
	});

	$effect(() => {
		const requestVersion = playlistLibVer;
		if (emosUser?.id) {
			const userId = emosUser.id;
			getUserPlaylists(userId, 100).then(result => {
				if (requestVersion !== playlistLibVer) return;
				const liked = result.playlists.find(p => p.creator?.userId === userId);
				if (liked) likedPlaylistId = liked.id;
				userPlaylists = result.playlists
					.filter(p => p.creator?.userId === userId && p.id !== liked?.id)
					.map(p => ({ id: p.id, name: p.name }));
			}).catch((error) => console.warn('Failed to load user playlists:', error));
		} else {
			likedPlaylistId = null;
			userPlaylists = [];
		}
	});

	function toggleEdit(): void {
		if (isEditing) {
			savePins(pinnedIds);
		}
		isEditing = !isEditing;
	}

	function togglePin(id: string): void {
		if (pinnedIds.has(id)) {
			pinnedIds.delete(id);
		} else {
			pinnedIds.add(id);
		}
	}

	function handleLoginClick(): void {
		window.location.href = getEmosLoginUrl(window.location.origin);
	}

	function handleUserClick(e: MouseEvent | KeyboardEvent): void {
		if ('clientX' in e && 'clientY' in e) {
			userMenuPos = { x: e.clientX, y: e.clientY };
			return;
		}
		const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
		userMenuPos = { x: rect.left + rect.width / 2, y: rect.bottom };
	}

	function closeUserMenu(): void {
		userMenuPos = null;
	}

	function handleLogout(): void {
		clearEmosAuth();
		closeUserMenu();
	}

	function handleSettings(): void {
		closeUserMenu();
		window.open('https://emos.club/account', '_blank', 'noopener,noreferrer');
	}

	let userMenuItems = $derived([
		{
			items: [
				{ label: '设置', icon: ICONS.SETTINGS_GEAR, action: handleSettings },
				{ label: '退出登录', action: handleLogout }
			]
		}
	]);

	function toggleMobileNav(): void {
		if (isTransitioning) return;
		isExpanded = !isExpanded;
		const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		if (!prefersReducedMotion) {
			isTransitioning = true;
		}
	}

	function handleNavTransitionEnd(): void {
		isTransitioning = false;
	}

	$effect(() => {
		const currentPath = $page.url.pathname;
		untrack(() => {
			if (currentPath && isExpanded) {
				isExpanded = false;
			}
		});
	});
</script>

<nav class="navigation" class:is-expanded={isExpanded} class:is-transitioning={isTransitioning} ontransitionend={handleNavTransitionEnd}>
	<div class="navigation__header">
		<button class="menuicon" aria-controls="navigation" aria-label={isExpanded ? '关闭导航' : '打开导航'} aria-expanded={isExpanded ? 'true' : 'false'} onclick={toggleMobileNav}>
			<span class="menuicon-bread menuicon-bread-top">
				<span class="menuicon-bread-crust menuicon-bread-crust-top"></span>
			</span>
			<span class="menuicon-bread menuicon-bread-bottom">
				<span class="menuicon-bread-crust menuicon-bread-crust-bottom"></span>
			</span>
		</button>
		<div class="logo">
			<a aria-label="EMOS Music" href="/">
				<span class="logo-text">EMOS Music</span>
			</a>
		</div>
		<div class="account-menu">
			{#if emosUser}
				<button class="user" type="button" onclick={handleUserClick} aria-label="账号">
					{#if emosUser.avatarUrl}
						<img src={emosUser.avatarUrl} alt="" />
					{:else}
						<svg viewBox="0 0 28 28" xmlns="http://www.w3.org/2000/svg">
							<path d={ICONS.ACCOUNT_CIRCLE}></path>
						</svg>
					{/if}
				</button>
			{:else}
				<button class="signin signin--compact" type="button" onclick={handleLoginClick}>
					<svg height="11" viewBox="0 0 10 11" width="10" class="auth-icon"><path d={ICONS.PERSON}></path></svg>
					登录
				</button>
			{/if}
		</div>
	</div>
	<div class="navigation__content">
		<div class="navigation__scrollable-container">
			<div class="navigation-items navigation-items--primary">
				<ul class="navigation-items__list">
					{#each navItems as item}
						<li class="navigation-item navigation-item__{item.id}" class:navigation-item--selected={isSelected(item.href)}>
							<a href={item.href} class="navigation-item__link">
								<div class="navigation-item__content">
									<span class="navigation-item__icon">
										<svg height="24" viewBox="0 0 24 24" width="24" aria-hidden="true">
											<path d={item.iconPath} fill-opacity=".95"></path>
										</svg>
									</span>
									<span class="navigation-item__label" dir="auto">{item.label}</span>
								</div>
							</a>
						</li>
					{/each}
				</ul>
			</div>
			{#if emosUser}
				<div class="navigation-items navigation-items--library" class:navigation-items--editing={isEditing}>
					<div class="navigation-items__header">
						<span>资料库</span>
						<button class="edit-toggle-button" type="button" onclick={toggleEdit}>
							<span>{isEditing ? '完成' : '编辑'}</span>
						</button>
					</div>
					{#if isEditing}
						<ul class="navigation-items__list" aria-label="资料库">
							{#each libraryItems as item}
								<li class="navigation-item navigation-item__{item.id}" class:navigation-item--selected={isSelected(item.href)}>
									<label for="pin-{item.id}" class="navigation-item__label navigation-item__label--editing">
										<div class="navigation-item__content">
											<input class="navigation-item__checkbox" type="checkbox" id="pin-{item.id}" checked={pinnedIds.has(item.id)} onchange={() => togglePin(item.id)} />
											<span class="navigation-item__icon">
												<svg height="24" viewBox="0 0 24 24" width="24" aria-hidden="true">
													<path d={item.iconPath} fill-opacity=".95"></path>
												</svg>
											</span>
											<span class="navigation-item__label" dir="auto">{item.label}</span>
										</div>
									</label>
								</li>
							{/each}
						</ul>
					{:else}
						<ul class="navigation-items__list" aria-label="资料库">
							{#each libraryItems as item}
								{#if pinnedIds.has(item.id)}
									<li class="navigation-item navigation-item__{item.id}" class:navigation-item--selected={isSelected(item.href)}>
										<a href={item.href} class="navigation-item__link">
											<div class="navigation-item__content">
												<span class="navigation-item__icon">
													<svg height="24" viewBox="0 0 24 24" width="24" aria-hidden="true">
														<path d={item.iconPath} fill-opacity=".95"></path>
													</svg>
												</span>
												<span class="navigation-item__label" dir="auto">{item.label}</span>
											</div>
										</a>
									</li>
								{/if}
							{/each}
						</ul>
					{/if}
				</div>
			{/if}
			{#if emosUser}
				<div class="navigation-items navigation-items--playlists">
					<div class="navigation-items__header">
						<span>播放列表</span>
					</div>
					<ul class="navigation-items__list" aria-label="播放列表">
						<li class="navigation-item navigation-item__all-playlists" class:navigation-item--selected={isSelected('/library/all-playlists')}>
							<a href="/library/all-playlists" class="navigation-item__link">
								<div class="navigation-item__content">
									<span class="navigation-item__icon">
										<svg height="24" viewBox="0 0 24 24" width="24" aria-hidden="true">
											<path d={ICONS.NAV_ALL_PLAYLISTS} fill-opacity=".95" style="fill-rule: nonzero;" transform="translate(.7 .94) scale(.92237)"></path>
										</svg>
									</span>
									<span class="navigation-item__label" dir="auto">所有播放列表</span>
								</div>
							</a>
						</li>
						{#if likedPlaylistId}
							<li class="navigation-item navigation-item__liked-songs" class:navigation-item--selected={isSelected(`/playlist/${likedPlaylistId}`)}>
								<a href="/playlist/{likedPlaylistId}" class="navigation-item__link">
									<div class="navigation-item__content">
										<span class="navigation-item__icon">
											<svg height="24" viewBox="0 0 24 24" width="24" aria-hidden="true">
												<path d={ICONS.FAVOURITE_SONGS_BG} fill-opacity=".95"></path>
												<path d={ICONS.FAVOURITE_SONGS_STAR} fill-opacity=".95"></path>
											</svg>
										</span>
										<span class="navigation-item__label" dir="auto">Favourite Songs</span>
									</div>
								</a>
							</li>
						{/if}
						{#each userPlaylists as pl (pl.id)}
							<li class="navigation-item navigation-item__playlist-{pl.id}" class:navigation-item--selected={isSelected(`/playlist/${pl.id}`)}>
								<a href="/playlist/{pl.id}" class="navigation-item__link">
									<div class="navigation-item__content">
										<span class="navigation-item__icon">
											<svg height="24" viewBox="0 0 24 24" width="24" aria-hidden="true">
												<path d={ICONS.PLAYLIST_NOTE} fill-opacity=".95"></path>
											</svg>
										</span>
										<span class="navigation-item__label" dir="auto">{pl.name}</span>
									</div>
								</a>
							</li>
						{/each}
					</ul>
				</div>
			{/if}
		</div>
		<div class="navigation__native-cta">
			<div class="auth-button">
				<div class="auth-content">
					{#if emosUser}
						<div class="navigation-item" role="button" tabindex="0" onclick={handleUserClick} onkeydown={(e) => { if (e.key === 'Enter') handleUserClick(e); }}>
							<div class="navigation-item__link">
								<div class="navigation-item__content">
									<span class="navigation-item__icon">
										{#if emosUser.avatarUrl}
											<img src={emosUser.avatarUrl} alt="" class="nav-user-avatar" />
										{:else}
											<svg viewBox="0 0 28 28" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
												<path d={ICONS.ACCOUNT_CIRCLE}></path>
											</svg>
										{/if}
									</span>
									<span class="navigation-item__label" dir="auto">{emosUser.nickname}</span>
								</div>
							</div>
						</div>
					{:else}
						<button class="signin" type="button" onclick={handleLoginClick}>
							<svg height="11" viewBox="0 0 10 11" width="10" class="auth-icon"><path d={ICONS.PERSON}></path></svg>
							登录
						</button>
					{/if}
				</div>
			</div>
		</div>
		<ContextualMenu items={userMenuItems} clientPos={userMenuPos} onclose={closeUserMenu} />
	</div>
</nav>
