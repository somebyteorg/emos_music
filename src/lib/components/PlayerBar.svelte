<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { goto } from '$app/navigation';
	import '$lib/styles/playback-controls.css';
	import '$lib/styles/player-lcd.css';
	import '$lib/styles/player-progress.css';
	import '$lib/styles/interactive-buttons.css';
	import '$lib/styles/play-more-buttons.css';
	import { PLAYER, ICONS, createShareCopyMenu } from '$lib/utils/constants';
	import { subscribe, subscribeProgress, getState, getProgress, togglePlay, skipPrevious, skipNext, toggleShuffle, cycleRepeat, setVolume, playQueueItem, clearQueue, seekTo, seekToThrottled, removeFromQueue } from '$lib/stores/player';
	import type { PlayerState, PlaybackProgress } from '$lib/stores/player';
	import { formatDuration } from '$lib/utils/format';
	import { isEmosLoggedIn, subscribeEmosAuth } from '$lib/stores/emos-auth';
	import { getLyric, parseLyricLines } from '$lib/services/emos';
	import type { EmosLyricLine } from '$lib/types/emos';
	import ContextualMenu from '$lib/components/ContextualMenu.svelte';
	import MiniPlayer from '$lib/components/MiniPlayer.svelte';
	import SidePanel from '$lib/components/SidePanel.svelte';
	import { createMenuState, createIndexMenuState } from '$lib/utils/menu-state.svelte';
	import { favoriteIds, getFavoriteStore } from '$lib/stores/favorite-store';

	type FullPlayerApi = {
		open: () => void;
		openInstant: () => void;
		closeInstant: () => void;
	};

	interface QueueItem {
		id: string;
		title: string;
		subtitle: string;
		artworkUrl?: string;
		duration?: string;
		isPlaying?: boolean;
	}

	let playerState: PlayerState = $state(getState());
	let playbackProgress: PlaybackProgress = $state(getProgress());
	let currentTrackId: number | undefined = $state(undefined);
	let fullPlayerOpen = $state(false);
	let fullPlayerRef: FullPlayerApi | undefined = $state();
	let mobileFullPlayerRef: FullPlayerApi | undefined = $state();
	let FullPlayerComponent: typeof import('$lib/components/FullPlayer.svelte').default | null = $state(null);
	let MobileFullPlayerComponent: typeof import('$lib/components/MobileFullPlayer.svelte').default | null = $state(null);

	let isMobile = $state(false);

	$effect(() => {
		if (typeof window === 'undefined') return;
		const mql = window.matchMedia('(max-width: 739px)');
		isMobile = mql.matches;
		const handler = (e: MediaQueryListEvent) => {
			const wasMobile = isMobile;
			isMobile = e.matches;
			if (!fullPlayerOpen) return;
			ensureFullPlayerLoaded().then(() => {
				if (wasMobile && !e.matches) {
					mobileFullPlayerRef?.closeInstant();
					fullPlayerRef?.openInstant();
				} else if (!wasMobile && e.matches) {
					fullPlayerRef?.closeInstant();
					mobileFullPlayerRef?.openInstant();
				}
			}).catch((error) => console.warn('Failed to switch full player:', error));
		};
		mql.addEventListener('change', handler);
		return () => mql.removeEventListener('change', handler);
	});

	$effect(() => {
		const unsub1 = subscribe((s) => {
			playerState = s;
			if (s.currentTrack?.emosId !== currentTrackId) {
				currentTrackId = s.currentTrack?.emosId;
			}
		});
		const unsub2 = subscribeProgress((p) => {
			playbackProgress = p;
		});
		return () => { unsub1(); unsub2(); };
	});

	let isVolumeExpanded = $state(false);
	let activePanel: 'lyrics' | 'upnext' | null = $state(null);

	let isProgressHovered = $state(false);
	let isProgressDragging = $state(false);

	let isTitleOverflowing = $state(false);
	let isArtistOverflowing = $state(false);
	let isTitleAnimating = $state(false);
	let isArtistAnimating = $state(false);
	let emosLoggedIn = $state(isEmosLoggedIn());
	const playerMenu = createMenuState<void>();
	const queueItemMenu = createIndexMenuState();
	const favStore = getFavoriteStore();
	let favIds = $state<Set<number>>(new Set());

	$effect(() => {
		const unsub = favoriteIds.subscribe((ids) => { favIds = ids; });
		return unsub;
	});


	function toggleFavorite(emosId: number): void {
		favStore.toggleFavorite(emosId);
	}

	function openPlayerMenu(e: MouseEvent): void {
		playerMenu.open(e, undefined);
	}

	function openQueueItemMenu(e: MouseEvent, index: number): void {
		queueItemMenu.open(e, index);
	}

	let queueItemMenuItems = $derived(
		queueItemMenu.target !== null && queueItemMenu.target >= 0 ? [{ items: [
			{ label: '从"待播清单"中移除项目', icon: ICONS.MINUS, action: () => { removeFromQueue(queueItemMenu.target!); queueItemMenu.close(); } },
			{ label: '查看制作人员', icon: ICONS.CREDITS, action: () => { const track = playerState.queue[queueItemMenu.target!]; if (track) { queueItemMenu.close(); goto(`/song/${track.emosId}`); } } }
		] }] : []
	);

	let playerMenuItems = $derived(
		createShareCopyMenu(() => {
			const track = playerState.currentTrack;
			if (!track) return '';
			return `${window.location.origin}/song/${track.emosId}`;
		}, playerState.currentTrack ? [{ label: '查看制作人员', icon: ICONS.CREDITS, action: () => { const track = playerState.currentTrack; if (track) goto(`/song/${track.emosId}`); } }] : undefined)
	);

	let portalEl: HTMLElement | null = $state(null);
	let menuContainer: HTMLElement | undefined = $state();

	$effect(() => {
		if (menuContainer && portalEl) {
			const container = menuContainer;
			const portal = portalEl;
			portal.appendChild(container);
			return () => {
				if (container.parentNode === portal) {
					portal.removeChild(container);
				}
			};
		}
	});

	onMount(() => {
		portalEl = document.createElement('div');
		portalEl.className = 'player-menu-portal';
		portalEl.style.setProperty('--ctxmenu-z-index', 'var(--z-contextual-menus)');
		portalEl.style.setProperty('--ctxmenu-scrim-z-index', 'calc(var(--z-contextual-menus) - 1)');
		document.body.appendChild(portalEl);
		return () => {
			portalEl?.remove();
		};
	});

	$effect(() => {
		const unsub1 = subscribeEmosAuth((user) => {
			emosLoggedIn = user !== null;
			if (user) favStore.loadLikedIds();
			else favStore.reset();
		});
		return unsub1;
	});

	let titleRef: HTMLElement | undefined = $state();
	let artistRef: HTMLElement | undefined = $state();
	let titleContainerRef: HTMLElement | undefined = $state();
	let artistContainerRef: HTMLElement | undefined = $state();
	let titleScrollerRef: HTMLElement | undefined = $state();
	let artistScrollerRef: HTMLElement | undefined = $state();

	let titleAnimTimer: ReturnType<typeof setTimeout> | undefined;
	let artistAnimTimer: ReturnType<typeof setTimeout> | undefined;

	$effect(() => {
		const _ = playerState.currentTrack?.title ?? '';
		void _;
		isTitleOverflowing = false;
		isTitleAnimating = false;
		if (titleAnimTimer) clearTimeout(titleAnimTimer);
	});

	$effect(() => {
		const _ = playerState.currentTrack?.artist ?? '';
		void _;
		isArtistOverflowing = false;
		isArtistAnimating = false;
		if (artistAnimTimer) clearTimeout(artistAnimTimer);
	});

	function startTitleAnimation() {
		if (titleAnimTimer) clearTimeout(titleAnimTimer);
		titleAnimTimer = setTimeout(() => {
			isTitleAnimating = true;
		}, 3000);
	}

	function startArtistAnimation() {
		if (artistAnimTimer) clearTimeout(artistAnimTimer);
		artistAnimTimer = setTimeout(() => {
			isArtistAnimating = true;
		}, 3000);
	}

	function handleTitleAnimationEnd() {
		isTitleAnimating = false;
		startTitleAnimation();
	}

	function handleArtistAnimationEnd() {
		isArtistAnimating = false;
		startArtistAnimation();
	}

	$effect(() => {
		if (!titleRef || !titleContainerRef) return;
		const checkOverflow = () => {
			if (titleRef && titleContainerRef) {
				const wasOverflowing = isTitleOverflowing;
				isTitleOverflowing = titleRef.scrollWidth > titleContainerRef.clientWidth;
				if (isTitleOverflowing && !wasOverflowing) {
					startTitleAnimation();
				} else if (!isTitleOverflowing) {
					isTitleAnimating = false;
					if (titleAnimTimer) clearTimeout(titleAnimTimer);
				}
			}
		};
		checkOverflow();
		const ro = new ResizeObserver(checkOverflow);
		ro.observe(titleContainerRef);
		return () => ro.disconnect();
	});

	$effect(() => {
		if (!artistRef || !artistContainerRef) return;
		const checkOverflow = () => {
			if (artistRef && artistContainerRef) {
				const wasOverflowing = isArtistOverflowing;
				isArtistOverflowing = artistRef.scrollWidth > artistContainerRef.clientWidth;
				if (isArtistOverflowing && !wasOverflowing) {
					startArtistAnimation();
				} else if (!isArtistOverflowing) {
					isArtistAnimating = false;
					if (artistAnimTimer) clearTimeout(artistAnimTimer);
				}
			}
		};
		checkOverflow();
		const ro = new ResizeObserver(checkOverflow);
		ro.observe(artistContainerRef);
		return () => ro.disconnect();
	});

	let queueItems = $derived<QueueItem[]>(
		playerState.queue.map((track, i) => ({
			id: String(track.emosId),
			title: track.title,
			subtitle: track.artist,
			artworkUrl: track.artworkUrl,
			duration: track.duration > 0 ? formatDuration(track.duration * 1000) : undefined,
			isPlaying: i === playerState.queueIndex
		}))
	);

	let isQueueEmpty = $derived(playerState.queue.length === 0);

	let showPause = $derived(playerState.isPlaying || playerState.isLoading);
	let activeState = $derived(showPause ? 'pause' as const : 'play' as const);
	let progressValue = $derived(playbackProgress.playbackProgress);
	let playbackTime = $derived(playbackProgress.playbackTime);
	let playbackDuration = $derived(playbackProgress.playbackDuration);

	let titleScrollWidth = $derived(isTitleOverflowing && titleRef ? titleRef.scrollWidth : 0);
	let artistScrollWidth = $derived(isArtistOverflowing && artistRef ? artistRef.scrollWidth : 0);


	let formattedElapsed = $derived(formatDuration(playbackTime * 1000));
	let formattedRemaining = $derived(playbackDuration > 0 ? '-' + formatDuration((playbackDuration - playbackTime) * 1000) : '');


	let lyricLines: EmosLyricLine[] = $state([]);
	let activeLyricIndex = $derived.by(() => {
		if (lyricLines.length === 0) return -1;
		let idx = -1;
		for (let i = 0; i < lyricLines.length; i++) {
			if (lyricLines[i].time <= playbackTime) idx = i;
			else break;
		}
		return idx;
	});

	$effect(() => {
		const tid = currentTrackId;
		if (!tid) { lyricLines = []; return; }
		let cancelled = false;
		(async () => {
			try {
				const data = await getLyric(tid);
				if (cancelled) return;
				if (data.lrc?.lyric) {
					lyricLines = parseLyricLines(data.lrc.lyric, data.tlyric?.lyric);
				} else {
					lyricLines = [];
				}
			} catch {
				console.warn('Failed to load lyrics for track');
				if (!cancelled) lyricLines = [];
			}
		})();
		return () => { cancelled = true; };
	});


	$effect(() => {
		const appContainer = document.querySelector('.app-container');
		if (!appContainer) return;
		if (activePanel) {
			appContainer.classList.add('is-drawer-open');
		} else {
			appContainer.classList.remove('is-drawer-open');
		}
	});

	$effect(() => {
		if (typeof window === 'undefined') return;
		const mql = window.matchMedia('(max-width: 999px)');
		const handler = (e: MediaQueryListEvent) => {
			if (e.matches && activePanel) {
				activePanel = null;
			}
		};
		mql.addEventListener('change', handler);
		return () => mql.removeEventListener('change', handler);
	});

	function getRepeatClass() {
		if (playerState.repeatMode === 0) return 'button--repeat';
		if (playerState.repeatMode === 1) return 'button--repeat mode--all';
		return 'button--repeat mode--1';
	}

	function getShuffleClass() {
		return `button--shuffle ${playerState.isShuffled ? 'shuffled' : ''}`;
	}

	function adjustVolume(e: Event) {
		const target = e.target as HTMLInputElement;
		setVolume(parseFloat(target.value));
	}

	function toggleMute() {
		setVolume(playerState.volume > 0 ? 0 : PLAYER.DEFAULT_VOLUME);
	}

	function getVolumeWave2Class() {
		if (playerState.volume < PLAYER.VOLUME_LOW_THRESHOLD) return 'chrome-volume__wave-hidden';
		return '';
	}

	function getVolumeWave3Class() {
		if (playerState.volume < PLAYER.VOLUME_HIGH_THRESHOLD) return 'chrome-volume__wave-hidden';
		return '';
	}

	function handleVolumeButtonClick() {
		if (isVolumeExpanded) {
			toggleMute();
		} else {
			isVolumeExpanded = true;
		}
	}

	function handleVolumeMouseLeave() {
		isVolumeExpanded = false;
	}

	function handleVolumeFocusOut(e: FocusEvent) {
		const currentTarget = e.currentTarget as HTMLElement;
		const relatedTarget = e.relatedTarget as HTMLElement;
		if (!relatedTarget || !currentTarget.contains(relatedTarget)) {
			isVolumeExpanded = false;
		}
	}

	function toggleUpNext() {
		activePanel = activePanel === 'upnext' ? null : 'upnext';
	}

	function toggleLyrics() {
		activePanel = activePanel === 'lyrics' ? null : 'lyrics';
	}

	async function ensureFullPlayerLoaded(): Promise<void> {
		if (FullPlayerComponent && MobileFullPlayerComponent) return;
		const [fullModule, mobileModule] = await Promise.all([
			import('$lib/components/FullPlayer.svelte'),
			import('$lib/components/MobileFullPlayer.svelte')
		]);
		FullPlayerComponent = fullModule.default;
		MobileFullPlayerComponent = mobileModule.default;
		await tick();
	}

	async function openFullPlayer(): Promise<void> {
		if (!playerState.currentTrack) return;
		fullPlayerOpen = true;
		await ensureFullPlayerLoaded();
		if (isMobile) {
			mobileFullPlayerRef?.open();
		} else {
			fullPlayerRef?.open();
		}
	}

	function handleProgressClick(e: MouseEvent) {
		const target = e.currentTarget as HTMLElement;
		const rect = target.getBoundingClientRect();
		const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
		if (playbackDuration > 0) {
			seekTo(ratio * playbackDuration);
		}
	}

	function handleScrubberMouseDown(e: MouseEvent) {
		e.preventDefault();
		isProgressDragging = true;
		seekFromMouseEvent(e);
	}

	function handleScrubberMouseMove(e: MouseEvent) {
		if (!isProgressDragging) return;
		seekFromMouseEvent(e);
	}

	function handleScrubberMouseUp(e: MouseEvent) {
		if (!isProgressDragging) return;
		seekFromMouseEvent(e);
		isProgressDragging = false;
	}

	$effect(() => {
		if (!isProgressDragging) return;
		document.addEventListener('mousemove', handleScrubberMouseMove);
		document.addEventListener('mouseup', handleScrubberMouseUp);
		return () => {
			document.removeEventListener('mousemove', handleScrubberMouseMove);
			document.removeEventListener('mouseup', handleScrubberMouseUp);
		};
	});

	function seekFromMouseEvent(e: MouseEvent) {
		const scrubber = document.querySelector('.progress__scrubber-track') as HTMLElement;
		if (!scrubber || playbackDuration <= 0) return;
		const rect = scrubber.getBoundingClientRect();
		const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
		seekToThrottled(ratio * playbackDuration);
	}
</script>

<div class="player-bar player-bar__floating-player" class:player-bar--up-next-open={activePanel !== null} data-testid="player-bar" aria-hidden="false" aria-label="音乐控制">
	<div class="wrapper">
		<div class="chrome-player" data-testid="chrome-player">
			<div class="chrome-player__playback-controls">
				<div class="playback-controls" data-testid="playback-controls">
					<amp-playback-controls-shuffle>
						<button class={getShuffleClass()} disabled={playerState.queue.length <= 1 || undefined} role="switch" aria-checked={playerState.isShuffled ? 'true' : 'false'} onclick={toggleShuffle}>
							<span class="button__label">随机播放</span>
							<amp-icon class="icon" role="presentation" aria-hidden="true">
								<svg viewBox="0 0 32 28" xmlns="http://www.w3.org/2000/svg"><path d={ICONS.SHUFFLE} fill-rule="nonzero"></path></svg>
							</amp-icon>
						</button>
					</amp-playback-controls-shuffle>
					<div class="playback-controls__main" data-testid="playback-controls-main" dir="ltr">
						<amp-playback-controls-item-skip direction="previous" class="previous">
							<button class="button--previous" disabled={playerState.queue.length === 0 || undefined} onclick={skipPrevious}>
								<amp-icon class="icon" role="presentation" aria-hidden="true">
									<svg viewBox="0 0 32 28" xmlns="http://www.w3.org/2000/svg"><path d={ICONS.SKIP_FORWARD} fill-rule="nonzero"></path></svg>
								</amp-icon>
								<span class="button__label">上一首</span>
							</button>
						</amp-playback-controls-item-skip>
						<amp-playback-controls-play class="playback-controls-play">
							<button class="playback-play__play" disabled={!playerState.currentTrack || undefined} aria-hidden={activeState !== 'play' ? 'true' : undefined} tabindex={activeState === 'play' ? undefined : -1} onclick={togglePlay} aria-label="播放">
								<amp-icon class="icon" role="presentation" aria-hidden="true">
									<svg viewBox="0 0 32 28" xmlns="http://www.w3.org/2000/svg"><path d={ICONS.PLAY} fill-rule="nonzero"></path></svg>
								</amp-icon>
								<span class="button__label">播放</span>
							</button>
							<button class="playback-play__pause" aria-hidden={activeState !== 'pause' ? 'true' : undefined} tabindex={activeState === 'pause' ? undefined : -1} onclick={togglePlay}>
								<amp-icon class="icon" role="presentation" aria-hidden="true">
									<svg viewBox="0 0 32 28" xmlns="http://www.w3.org/2000/svg"><path d={ICONS.PAUSE} fill-rule="nonzero"></path></svg>
								</amp-icon>
								<span class="button__label">暂停</span>
							</button>
						</amp-playback-controls-play>
						<amp-playback-controls-item-skip direction="next" class="next">
							<button class="button--next" disabled={playerState.queue.length === 0 || undefined} onclick={skipNext}>
								<amp-icon class="icon" role="presentation" aria-hidden="true">
									<svg viewBox="0 0 32 28" xmlns="http://www.w3.org/2000/svg"><path d={ICONS.SKIP_FORWARD} fill-rule="nonzero"></path></svg>
								</amp-icon>
								<span class="button__label">下一首</span>
							</button>
						</amp-playback-controls-item-skip>
					</div>
					<amp-playback-controls-repeat>
						<button class={getRepeatClass()} disabled={playerState.queue.length === 0 || undefined} role="switch" aria-checked={playerState.repeatMode !== 0 ? 'true' : 'false'} onclick={cycleRepeat}>
							<span class="button__label">{playerState.repeatMode === 2 ? '重复播放 1 首' : '循环播放'}</span>
							<amp-icon class="icon" role="presentation" aria-hidden="true">
								<svg viewBox="0 0 32 28" xmlns="http://www.w3.org/2000/svg"><path d={playerState.repeatMode === 2 ? ICONS.REPEAT_ONE : ICONS.REPEAT} fill-rule="nonzero"></path></svg>
							</amp-icon>
						</button>
					</amp-playback-controls-repeat>
				</div>
			</div>
			<div class="chrome-player__lcd">
				<div class="player-lcd" class:player-lcd--expanded-progress={isProgressHovered} data-testid="player-lcd">
					{#if playerState.currentTrack?.artworkUrl}
						<button class="player-lcd__artwork" class:player-lcd__artwork--with-overlay={!!playerState.currentTrack} type="button" aria-label="打开全屏幕播放器" disabled={!playerState.currentTrack || undefined} onclick={openFullPlayer}>
							<img src={playerState.currentTrack.artworkUrl} alt="" width="34" height="34" />
							<span class="player-lcd__artwork-overlay" aria-hidden="true">
								<amp-icon class="icon" role="presentation" aria-hidden="true">
									<svg xmlns="http://www.w3.org/2000/svg" viewBox="87.48 32.45 93.07 93.16">
										<path d={ICONS.EXPAND}></path>
									</svg>
								</amp-icon>
							</span>
						</button>
					{:else}
						<button class="player-lcd__artwork" class:player-lcd__artwork--with-overlay={!!playerState.currentTrack} type="button" aria-label="打开全屏幕播放器" disabled={!playerState.currentTrack || undefined} onclick={openFullPlayer}>
							<svg class="player-lcd__artwork-placeholder" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
								<g fill="none" fill-rule="evenodd">
									<path fill="var(--genericJoeColor)" d="M0 0h100v100H0z"></path>
									<path fill="var(--playerMissingArtworkIcon)" d={ICONS.MUSIC_NOTE} fill-rule="nonzero"></path>
								</g>
							</svg>
							<span class="player-lcd__artwork-overlay" aria-hidden="true">
								<amp-icon class="icon" role="presentation" aria-hidden="true">
									<svg xmlns="http://www.w3.org/2000/svg" viewBox="87.48 32.45 93.07 93.16">
										<path d={ICONS.EXPAND}></path>
									</svg>
								</amp-icon>
							</span>
						</button>
					{/if}
					<div class="player-lcd__metadata">
						<div class="lcd-meta" aria-live="assertive">
							<div class="lcd-meta__primary-container" bind:this={titleContainerRef}>
								<div class="marquee marquee--primary">
									<div class="marquee-line-container">
										<div class="marquee-line" class:active={isTitleOverflowing} class:inactive={!isTitleOverflowing} class:is-animating={isTitleAnimating} dir="auto">
											<div class="marquee-line__string-container">
												<div class="marquee-line__mask" dir="auto">
													<div class="marquee-line__scroller" class:is-animating={isTitleAnimating} style="--marquee-text-content-width: {titleScrollWidth}px" bind:this={titleScrollerRef} onanimationend={handleTitleAnimationEnd}>
														<div class="marquee-line__scrolling-text-chunk">
															<span class="marquee-line__text-content">
																<span class="marquee-line__fragment" bind:this={titleRef}>{(playerState.currentTrack?.title ?? '') || '未在播放'}</span>
															</span>
														</div>
														{#if isTitleOverflowing}
															<div class="marquee-line__scrolling-text-chunk marquee-line__scrolling-text-chunk--copy">
																<span class="marquee-line__text-content">
																	<span class="marquee-line__fragment">{(playerState.currentTrack?.title ?? '') || '未在播放'}</span>
																</span>
															</div>
														{/if}
													</div>
												</div>
												{#if emosLoggedIn && playerState.currentTrack && playerState.currentTrack.emosId !== 0}
													<div class="marquee__menu-slot-container">
														<div class="favorite-badge">
														<button class="favorite-button favorite-button--non-platter" class:is-favorited={playerState.currentTrack && favIds.has(playerState.currentTrack.emosId)} aria-label="个人收藏" onclick={() => { if (playerState.currentTrack) toggleFavorite(playerState.currentTrack.emosId); }}>
															<svg width="64" height="64" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" class="favorite-icon">
																<path class="favorite-icon__star" d={playerState.currentTrack && favIds.has(playerState.currentTrack.emosId) ? ICONS.STAR_FILLED : ICONS.STAR}></path>
																</svg>
															</button>
														</div>
													</div>
												{/if}
											</div>
										</div>
									</div>
								</div>
							</div>
							<div class="marquee marquee--secondary" bind:this={artistContainerRef}>
								<div class="marquee-line-container">
									<div class="marquee-line" class:active={isArtistOverflowing} class:inactive={!isArtistOverflowing} class:is-animating={isArtistAnimating} dir="auto">
										<div class="marquee-line__string-container">
											<div class="marquee-line__mask" dir="auto">
												<div class="marquee-line__scroller" class:is-animating={isArtistAnimating} style="--marquee-text-content-width: {artistScrollWidth}px" bind:this={artistScrollerRef} onanimationend={handleArtistAnimationEnd}>
													<div class="marquee-line__scrolling-text-chunk">
														<span class="marquee-line__text-content">
															<span class="marquee-line__fragment" bind:this={artistRef}>
																{#if (playerState.currentTrack?.artistId ?? 0) > 0}
																	<a href="/artist/{encodeURIComponent(playerState.currentTrack?.artist ?? '')}/{playerState.currentTrack?.artistId ?? 0}" class="click-action">{playerState.currentTrack?.artist ?? ''}</a>
																{:else}
																	{playerState.currentTrack?.artist ?? ''}
																{/if}
																{#if playerState.currentTrack?.album}
																	<span class="separator"> - </span>
																	{#if (playerState.currentTrack?.albumId ?? 0) > 0}
																		<a href="/album/{playerState.currentTrack?.albumId ?? 0}" class="click-action">{playerState.currentTrack?.album ?? ''}</a>
																	{:else}
																		{playerState.currentTrack?.album ?? ''}
																	{/if}
																{/if}
															</span>
														</span>
													</div>
													{#if isArtistOverflowing}
														<div class="marquee-line__scrolling-text-chunk marquee-line__scrolling-text-chunk--copy">
															<span class="marquee-line__text-content">
																<span class="marquee-line__fragment">
																	{#if (playerState.currentTrack?.artistId ?? 0) > 0}
																		<a href="/artist/{encodeURIComponent(playerState.currentTrack?.artist ?? '')}/{playerState.currentTrack?.artistId ?? 0}" class="click-action">{playerState.currentTrack?.artist ?? ''}</a>
																	{:else}
																		{playerState.currentTrack?.artist ?? ''}
																	{/if}
																	{#if playerState.currentTrack?.album}
																		<span class="separator"> - </span>
																		{#if (playerState.currentTrack?.albumId ?? 0) > 0}
																			<a href="/album/{playerState.currentTrack?.albumId ?? 0}" class="click-action">{playerState.currentTrack?.album ?? ''}</a>
																		{:else}
																			{playerState.currentTrack?.album ?? ''}
																		{/if}
																	{/if}
																</span>
															</span>
														</div>
													{/if}
												</div>
											</div>
										</div>
									</div>
								</div>
							</div>
						</div>
					</div>
					<div class="player-lcd__after-metadata">
						<div class="after-metadata">
							{#if playerState.currentTrack}
								<button class="contextual-menu__trigger" aria-label="更多" aria-haspopup="true" onclick={openPlayerMenu}>
									<span class="more-button more-button--non-platter">
										<svg width="28" height="28" viewBox="0 0 28 28" class="glyph">
											<path fill="var(--iconEllipsisFill, var(--contextMenuEllipsisFillOverride, var(--keyColor)))" d={ICONS.ELLIPSIS} />
										</svg>
									</span>
								</button>
							{/if}
						</div>
					</div>
					<div class="player-lcd__progress">
						<div class="progress-container" class:progress-container--hovered={isProgressHovered} onmouseenter={() => isProgressHovered = true} onmouseleave={() => { if (!isProgressDragging) isProgressHovered = false; }}>
							{#if isProgressHovered && playbackDuration > 0}
								<div class="progress progress--expanded">
									<div class="progress__bar">
										<span class="progress__elapsed">{formattedElapsed}</span>
										<span class="progress__remaining">{formattedRemaining}</span>
										<div class="progress__scrubber-track" onmousedown={handleScrubberMouseDown} role="slider" aria-valuenow={progressValue} aria-valuemin="0" aria-valuemax="100" aria-label="播放进度" style="--progress: {progressValue}%"></div>
									</div>
								</div>
							{:else}
								<div class="progress progress--compact">
									<div class="progress__scrubber" style="--progress: {progressValue}%"></div>
								</div>
							{/if}
						</div>
					</div>
				</div>
			</div>
			<div class="chrome-player__actions">
				<div class="right-content">
					<div class="action-buttons">
						<div class="lyrics__button-container">
							<button class="lyrics__button" aria-expanded={activePanel === 'lyrics' ? 'true' : 'false'} aria-label="歌词" data-testid="lyrics-button" onclick={toggleLyrics}>
								<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18" fill-rule="evenodd" stroke-linejoin="round" stroke-miterlimit="2" clip-rule="evenodd"><path d={ICONS.LYRICS}></path></svg>
							</button>
						</div>
						<button class="up-next-queue__button" class:active={activePanel === 'upnext'} aria-expanded={activePanel === 'upnext' ? 'true' : 'false'} aria-label="待播清单" data-testid="up-next-button" data-drop-area="" aria-controls="side-panel" onclick={toggleUpNext}>
							<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18"><path d={ICONS.UP_NEXT_QUEUE}></path></svg>
						</button>
						<div dir="auto" role="group" class="chrome-volume" class:chrome-volume--expanded={isVolumeExpanded} data-testid="chrome-volume" onmouseleave={handleVolumeMouseLeave} onfocusout={handleVolumeFocusOut}>
							<div class="chrome-volume__slider">
								<div class="volume-control">
									<input type="range" class="volume-control__range" min="0" max="1" step="0.01" value={playerState.volume} oninput={adjustVolume} onchange={adjustVolume} style="--progress: {playerState.volume * 100}%" aria-label="音量" aria-valuemin="0" aria-valuenow={playerState.volume} aria-valuemax="1" aria-orientation="horizontal" />
								</div>
							</div>
							<div class="chrome-volume__button" data-testid="chrome-volume-button-wrapper">
								<button class="chrome-volume__button" data-testid="volume-button" onclick={handleVolumeButtonClick}>
									<svg class="chrome-volume__icon" role="presentation" data-testid="volume-button-icon" version="1.1" viewBox="0 0 64 64"><path transform="translate(2,11.149)" d={ICONS.VOLUME_SPEAKER}></path><path class="chrome-volume__wave chrome-volume__wave-1 {playerState.volume === 0 ? 'chrome-volume__wave-hidden' : ''}" data-testid="volume-wave-1" transform="translate(2,11.149)" d={ICONS.VOLUME_WAVE_1}></path><path class="chrome-volume__wave chrome-volume__wave-2 {getVolumeWave2Class()}" data-testid="volume-wave-2" transform="translate(2,11.149)" d={ICONS.VOLUME_WAVE_2}></path><path class="chrome-volume__wave chrome-volume__wave-3 {getVolumeWave3Class()}" data-testid="volume-wave-3" transform="translate(2,11.149)" d={ICONS.VOLUME_WAVE_3}></path></svg>
									<span class="chrome-volume__label"></span>
								</button>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
	<MiniPlayer {playerState} {progressValue} {showPause} onTogglePlay={togglePlay} onSkipNext={skipNext} onOpenFullPlayer={openFullPlayer} />
</div>

<SidePanel
	{activePanel}
	{playerState}
	{queueItems}
	{isQueueEmpty}
	{lyricLines}
	{activeLyricIndex}
	onPlayQueueItem={playQueueItem}
	onRemoveFromQueue={removeFromQueue}
	onClearQueue={clearQueue}
	onSeekTo={seekTo}
	onOpenQueueItemMenu={openQueueItemMenu}
/>

<div bind:this={menuContainer}>
	<ContextualMenu items={playerMenuItems} clientPos={playerMenu.clientPos} onclose={playerMenu.close} />
	<ContextualMenu items={queueItemMenuItems} clientPos={queueItemMenu.clientPos} onclose={queueItemMenu.close} />
</div>

{#if FullPlayerComponent}
	<FullPlayerComponent bind:this={fullPlayerRef} onClose={() => { fullPlayerOpen = false; }} />
{/if}

{#if MobileFullPlayerComponent}
	<MobileFullPlayerComponent bind:this={mobileFullPlayerRef} onClose={() => { fullPlayerOpen = false; }} />
{/if}
