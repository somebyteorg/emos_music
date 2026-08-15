<script lang="ts">
	import '$lib/styles/playback-controls.css';

	import '$lib/styles/full-player.css';
	import { untrack } from 'svelte';
	import { goto } from '$app/navigation';
	import { ICONS, PLAYER, createShareCopyMenu } from '$lib/utils/constants';
	import {
		subscribe, subscribeProgress, getState, getProgress,
		togglePlay, skipPrevious, skipNext, toggleShuffle, cycleRepeat,
		setVolume, seekTo, getCurrentTime
	} from '$lib/stores/player';
	import type { PlayerState, PlaybackProgress } from '$lib/stores/player';
	import type { LyricsScene } from '$lib/utils/lyrics-scene';
	import { formatDuration } from '$lib/utils/format';
	import { getLyric, parseLyricLines, parseYrcLines } from '$lib/services/emos';
	import { favoriteIds, getFavoriteStore } from '$lib/stores/favorite-store';
	import { isEmosLoggedIn } from '$lib/stores/emos-auth';
	import type { EmosLyricLine, EmosYrcLine } from '$lib/types/emos';
	import ContextualMenu from '$lib/components/ContextualMenu.svelte';
	import { createMenuState } from '$lib/utils/menu-state.svelte';

	interface Props {
		onClose: () => void;
	}

	let { onClose }: Props = $props();

	let playerState: PlayerState = $state(getState());
	let playbackProgress: PlaybackProgress = $state(getProgress());
	let isVisible = $state(false);
	let shouldRender = $state(false);
	let containerRef: HTMLElement | undefined = $state();
	let backdropCanvas: HTMLCanvasElement | undefined = $state();
	let lyricsSceneReady = $state(false);
	let lyricsScene: LyricsScene | null = null;
	let isProgressHovered = $state(false);
	let isProgressDragging = $state(false);
	let currentTrackId = $state(getState().currentTrack?.emosId ?? 0);
	let currentArtworkUrl = $state(getState().currentTrack?.artworkUrl ?? '');


	let isLyricsOn = $state(false);
	let lyricsMaskId = 'lyrics-mask-' + Math.random().toString(36).slice(2, 8);
	let primaryMarqueeRef: HTMLElement | undefined = $state();
	let secondaryMarqueeRef: HTMLElement | undefined = $state();
	let primaryTextRef: HTMLElement | undefined = $state();
	let secondaryTextRef: HTMLElement | undefined = $state();
	let primaryScrollerRef: HTMLElement | undefined = $state();
	let secondaryScrollerRef: HTMLElement | undefined = $state();
	let primaryIsMarquee = $state(false);
	let secondaryIsMarquee = $state(false);
	let primaryIsAnimating = $state(false);
	let secondaryIsAnimating = $state(false);
	let lyricLines: EmosLyricLine[] = $state([]);
	let yrcLines: EmosYrcLine[] = $state([]);
	let hasYrc = $derived(yrcLines.length > 0);
	let lyricsContainerRef: HTMLElement | undefined = $state();
	let rafActiveIndex = $state(-1);
	let lyricsRafId = 0;
	let lastRafIndex = -1;
	let scrollTarget = 0;
	let isFirstScroll = true;
	let isUserScrolling = false;
	let userScrollTimer: ReturnType<typeof setTimeout> | undefined;


	interface Kf {
		start: number;
		end: number;
		el: HTMLElement;
		props: Record<string, { from: number; to: number; unit: string }>;
	}

	let keyframes: Kf[] = [];
	let keyframesBuilt = false;
	let prevTickTime = -1;

	function resetLyricsState(): void {
		lastRafIndex = -1;
		rafActiveIndex = -1;
		keyframesBuilt = false;
		keyframes = [];
		isFirstScroll = true;
		prevTickTime = -1;
		if (lyricsContainerRef) {
			lyricsContainerRef.scrollTop = 0;
			resetAllSyllables();
		}
	}

	function cleanLineInlineStyles(lineEl: HTMLElement): void {
		const syllables = lineEl.querySelectorAll<HTMLElement>('.fp-syllable:not(.fp-syllable--static)');
		for (const syl of syllables) {
			syl.style.setProperty('--gradient-progress', '-20%');
			syl.style.setProperty('--syllable-y', '0');
			if (syl.classList.contains('emphasis')) {
				const letters = syl.querySelectorAll<HTMLElement>('.fp-letter');
				for (const letter of letters) {
					letter.style.setProperty('--syllable-scale', '1');
					letter.style.setProperty('--syllable-y', '0');
					letter.style.setProperty('--gradient-progress', '-20%');
					letter.style.setProperty('--text-shadow-blur-radius', '0px');
					letter.style.setProperty('--text-shadow-opacity', '0');
				}
			}
		}
	}

	function resetAllSyllables(): void {
		if (!lyricsContainerRef) return;
		const allSyllables = lyricsContainerRef.querySelectorAll<HTMLElement>('.fp-syllable:not(.fp-syllable--static)');
		for (const syl of allSyllables) {
			syl.style.setProperty('--gradient-progress', '-20%');
			syl.style.setProperty('--syllable-y', '0');
			if (syl.classList.contains('emphasis')) {
				const letters = syl.querySelectorAll<HTMLElement>('.fp-letter');
				for (const letter of letters) {
					letter.style.setProperty('--syllable-scale', '1');
					letter.style.setProperty('--syllable-y', '0');
					letter.style.setProperty('--gradient-progress', '-20%');
					letter.style.setProperty('--text-shadow-blur-radius', '0px');
					letter.style.setProperty('--text-shadow-opacity', '0');
				}
			}
		}
		const lineEls = lyricsContainerRef.querySelectorAll('.fp-lyrics-line');
		lineEls.forEach((el) => el.classList.remove('fp-lyrics-line--active'));
	}

	function buildKeyframes(): void {
		keyframes = [];
		if (!lyricsContainerRef || !hasYrc) return;

		const lineEls = lyricsContainerRef.querySelectorAll('.fp-lyrics-line');
		for (const lineEl of lineEls) {
			const syllables = lineEl.querySelectorAll<HTMLElement>('.fp-syllable:not(.fp-syllable--static)');
			for (const syl of syllables) {
				const startMs = parseFloat(syl.dataset.start ?? '0');
				const durMs = parseFloat(syl.dataset.duration ?? '0');
				if (durMs <= 0) continue;
				const startSec = startMs / 1000;
				const endSec = (startMs + durMs) / 1000;

				if (syl.classList.contains('emphasis')) {
					const letters = syl.querySelectorAll<HTMLElement>('.fp-letter');
					const textLen = letters.length || 1;
					const durSec = durMs / 1000;
					const perLetterSec = durSec / textLen;
					letters.forEach((letter, li) => {
						const letterStartSec = startSec + perLetterSec * li;
						const letterEndSec = startSec + perLetterSec * (li + 1);
						const midRatio = 0.5;
						const letterMidSec = letterStartSec + perLetterSec * midRatio;
						const scaleUp = Math.min(perLetterSec * midRatio, 0.5);
						const scaleDown = Math.min(perLetterSec * midRatio, 0.5);
						const yUp = -2.05 * Math.min(scaleUp / 0.5, 1);
						const yDown = -2 * Math.min(scaleDown / 0.5, 1);
						const shadowBlurUp = 10 * Math.min(scaleUp / 0.5, 1);
						const shadowBlurDown = 4 * Math.min(scaleDown / 0.5, 1);
						const shadowOpacityUp = 0.4 * Math.min(scaleUp / 0.5, 1);
						const shadowOpacityDown = 0.4 * Math.min(scaleDown / 0.5, 1);
						keyframes.push({
							start: letterStartSec,
							end: letterMidSec,
							el: letter,
							props: {
								scale: { from: 1, to: 1 + 0.05 * Math.min(scaleUp / 0.5, 1), unit: '' },
								y: { from: 0, to: yUp, unit: '' },
								'--gradient-progress': { from: -20, to: 90, unit: '%' },
								'--text-shadow-blur-radius': { from: 0, to: shadowBlurUp, unit: 'px' },
								'--text-shadow-opacity': { from: 0, to: shadowOpacityUp, unit: '' }
							}
						});
						keyframes.push({
							start: letterMidSec,
							end: letterEndSec,
							el: letter,
							props: {
								scale: { from: 1 + 0.05 * Math.min(scaleUp / 0.5, 1), to: 1, unit: '' },
								y: { from: yUp, to: yDown, unit: '' },
								'--gradient-progress': { from: 90, to: 100, unit: '%' },
								'--text-shadow-blur-radius': { from: shadowBlurUp, to: shadowBlurDown, unit: 'px' },
								'--text-shadow-opacity': { from: shadowOpacityUp, to: 0, unit: '' }
							}
						});
					});
				} else {
					keyframes.push({
						start: startSec + 0.1,
						end: endSec + 0.1,
						el: syl,
						props: {
							y: { from: 0, to: -2, unit: '' }
						}
					});
					keyframes.push({
						start: startSec,
						end: endSec,
						el: syl,
						props: {
							'--gradient-progress': { from: -20, to: 100, unit: '%' }
						}
					});
				}
			}
		}

		keyframes.sort((a, b) => a.start - b.start);
		keyframesBuilt = true;
	}

	function findActiveIndex(currentTimeSec: number): number {
		const lines = hasYrc ? yrcLines : lyricLines;
		if (lines.length === 0) return -1;
		let idx = -1;
		for (let i = 0; i < lines.length; i++) {
			const line = lines[i];
			const lineEnd = hasYrc
				? (line as EmosYrcLine).time + (line as EmosYrcLine).duration
				: line.time;
			if (line.time <= currentTimeSec && currentTimeSec < lineEnd) {
				return i;
			}
			if (line.time <= currentTimeSec) idx = i;
		}
		return idx;
	}

	function lyricsTick(): void {
		if (!lyricsContainerRef || !isLyricsOn) {
			lyricsRafId = requestAnimationFrame(lyricsTick);
			return;
		}

		if (!keyframesBuilt && hasYrc) {
			buildKeyframes();
		}

		const currentTimeSec = getCurrentTime();

		prevTickTime = currentTimeSec;

		const activeIdx = findActiveIndex(currentTimeSec);

		if (activeIdx !== lastRafIndex) {
			lastRafIndex = activeIdx;
			rafActiveIndex = activeIdx;
			const lineEls = lyricsContainerRef.querySelectorAll('.fp-lyrics-line');
			lineEls.forEach((el, i) => {
				if (i === activeIdx) {
					cleanLineInlineStyles(el as HTMLElement);
					el.classList.add('fp-lyrics-line--active');
				} else {
					el.classList.remove('fp-lyrics-line--active');
					cleanLineInlineStyles(el as HTMLElement);
				}
			});
			if (isFirstScroll && activeIdx >= 0) {
				isFirstScroll = false;
				jumpScrollToLine(activeIdx);
			}
		}

		if (hasYrc && keyframes.length > 0) {
			tickKeyframes(currentTimeSec);
		}

		if (activeIdx >= 0) {
			smoothScrollToLine(activeIdx);
		}

		lyricsRafId = requestAnimationFrame(lyricsTick);
	}

	function setKfProp(el: HTMLElement, prop: string, val: number, unit: string): void {
		if (prop === 'scale') el.style.setProperty('--syllable-scale', `${val}`);
		else if (prop === 'y') el.style.setProperty('--syllable-y', `${val}`);
		else el.style.setProperty(prop, `${val}${unit}`);
	}

	function tickKeyframes(currentTimeSec: number): void {
		for (const kf of keyframes) {
			if (currentTimeSec < kf.start) continue;
			if (currentTimeSec >= kf.end) {
				for (const [prop, cfg] of Object.entries(kf.props)) {
					setKfProp(kf.el, prop, cfg.to, cfg.unit);
				}
				continue;
			}
			const t = (currentTimeSec - kf.start) / (kf.end - kf.start);
			for (const [prop, cfg] of Object.entries(kf.props)) {
				const v = cfg.from + (cfg.to - cfg.from) * t;
				setKfProp(kf.el, prop, v, cfg.unit);
			}
		}
	}



	function jumpScrollToLine(idx: number): void {
		if (!lyricsContainerRef) return;
		if (isUserScrolling) return;
		const lineEl = lyricsContainerRef.querySelectorAll('.fp-lyrics-line')[idx] as HTMLElement | undefined;
		if (!lineEl) return;
		const containerH = lyricsContainerRef.getBoundingClientRect().height;
		const target = lineEl.offsetTop - containerH * 0.35;
		lyricsContainerRef.scrollTop = target;
		scrollTarget = target;
	}

	function smoothScrollToLine(idx: number): void {
		if (!lyricsContainerRef) return;
		if (isUserScrolling) return;
		const lineEl = lyricsContainerRef.querySelectorAll('.fp-lyrics-line')[idx] as HTMLElement | undefined;
		if (!lineEl) return;
		const containerH = lyricsContainerRef.getBoundingClientRect().height;
		scrollTarget = lineEl.offsetTop - containerH * 0.35;
		const current = lyricsContainerRef.scrollTop;
		const diff = scrollTarget - current;
		if (Math.abs(diff) < 0.5) return;
		lyricsContainerRef.scrollTop = current + diff * 0.1;
	}

	function handleLyricsUserScroll(): void {
		isUserScrolling = true;
		if (userScrollTimer) clearTimeout(userScrollTimer);
		userScrollTimer = setTimeout(() => {
			isUserScrolling = false;
		}, 3000);
	}

	function startLyricsRaf(): void {
		stopLyricsRaf();
		resetLyricsState();
		lyricsRafId = requestAnimationFrame(lyricsTick);
	}

	function stopLyricsRaf(): void {
		if (lyricsRafId) {
			cancelAnimationFrame(lyricsRafId);
			lyricsRafId = 0;
		}
	}

	$effect(() => {
		if (isLyricsOn) {
			startLyricsRaf();
		} else {
			stopLyricsRaf();
		}
		return () => stopLyricsRaf();
	});

	$effect(() => {
		const tid = currentTrackId;
		resetLyricsState();
		if (!tid) { lyricLines = []; yrcLines = []; return; }
		let cancelled = false;
		(async () => {
			try {
				const data = await getLyric(tid);
				if (cancelled) return;
				if (data.yrc?.lyric) {
					yrcLines = parseYrcLines(data.yrc.lyric, data.ytlrc?.lyric ?? data.tlyric?.lyric);
					lyricLines = [];
				} else if (data.lrc?.lyric) {
					lyricLines = parseLyricLines(data.lrc.lyric, data.tlyric?.lyric);
					yrcLines = [];
				} else {
					lyricLines = [];
					yrcLines = [];
				}
			} catch {
				if (!cancelled) { lyricLines = []; yrcLines = []; }
			}
		})();
		return () => { cancelled = true; };
	});


	$effect(() => {
		const unsub1 = subscribe((s) => {
			playerState = s;
			const id = s.currentTrack?.emosId ?? 0;
			if (id !== currentTrackId) currentTrackId = id;
			const url = s.currentTrack?.artworkUrl ?? '';
			if (url !== currentArtworkUrl) {
				currentArtworkUrl = url;
				resetMarquees();
			}
		});
		const unsub2 = subscribeProgress((p) => { playbackProgress = p; });
		return () => { unsub1(); unsub2(); };
	});

	let showPause = $derived(playerState.isPlaying || playerState.isLoading);
	let activeState = $derived(showPause ? 'pause' as const : 'play' as const);
	let progressValue = $derived(playbackProgress.playbackProgress);
	let playbackTime = $derived(playbackProgress.playbackTime);
	let playbackDuration = $derived(playbackProgress.playbackDuration);
	let formattedElapsed = $derived(formatDuration(playbackTime * 1000));
	let formattedRemaining = $derived(playbackDuration > 0 ? '-' + formatDuration((playbackDuration - playbackTime) * 1000) : '-0:00');

	let artworkUrl = $derived(playerState.currentTrack?.artworkUrl ?? '');
	let largeArtworkUrl = $derived(artworkUrl ? artworkUrl.replace(/param=\d+y\d+/, 'param=600y600') : '');
	let hasArtwork = $derived(!!artworkUrl);


	function open(): void {
		shouldRender = true;

		requestAnimationFrame(() => {
			requestAnimationFrame(() => {
				isVisible = true;
				initLyricsScene();
			});
		});
	}

	function openInstant(): void {
		shouldRender = true;
		isVisible = true;
		initLyricsScene();
	}

	function close(): void {
		isVisible = false;
		destroyLyricsScene();
		setTimeout(() => {
			shouldRender = false;
			onClose();
		}, 250);
	}

	function closeInstant(): void {
		isVisible = false;
		shouldRender = false;
		destroyLyricsScene();
	}

	function handleKeydown(e: KeyboardEvent): void {
		if (e.key === 'Escape') close();
		if (e.key === ' ' && e.target === containerRef) {
			e.preventDefault();
			togglePlay();
		}
	}


	async function initLyricsScene(): Promise<void> {
		if (!backdropCanvas) return;
		try {
			const { LyricsScene: LyricsSceneClass } = await import('$lib/utils/lyrics-scene');
			const url = playerState.currentTrack?.artworkUrl;
			lyricsScene = new LyricsSceneClass(backdropCanvas, url);
			lyricsSceneReady = true;
		} catch (e) {
			console.warn('LyricsScene 加载失败:', e);
		}
	}

	function destroyLyricsScene(): void {
		if (lyricsScene) {
			lyricsScene.destroy();
			lyricsScene = null;
		}
		lyricsSceneReady = false;
	}

	$effect(() => {
		if (lyricsSceneReady && artworkUrl) {
			lyricsScene?.updateArtwork(artworkUrl);
		}
	});

	$effect(() => {
		if (isVisible && playerState.currentTrack) {
			untrack(() => {
				requestAnimationFrame(() => measureAllMarquees());
			});
		}
	});

	function getRepeatClass(): string {
		if (playerState.repeatMode === 0) return 'button--repeat';
		if (playerState.repeatMode === 1) return 'button--repeat mode--all';
		return 'button--repeat mode--1';
	}

	function getShuffleClass(): string {
		return `button--shuffle ${playerState.isShuffled ? 'shuffled' : ''}`;
	}

	function adjustVolume(e: Event): void {
		const target = e.target as HTMLInputElement;
		setVolume(parseFloat(target.value));
	}

	function toggleMute(): void {
		setVolume(playerState.volume > 0 ? 0 : PLAYER.DEFAULT_VOLUME);
	}

	function getVolumeWave2Class(): string {
		if (playerState.volume < PLAYER.VOLUME_LOW_THRESHOLD) return 'fp-volume__wave-hidden';
		return '';
	}

	function getVolumeWave3Class(): string {
		if (playerState.volume < PLAYER.VOLUME_HIGH_THRESHOLD) return 'fp-volume__wave-hidden';
		return '';
	}

	const MARQUEE_ANIMATION_OFFSET = 10;
	const MARQUEE_ANIMATION_DELAY = 3000;

	function measureMarquee(
		lineRef: HTMLElement | undefined,
		textRef: HTMLElement | undefined,
		scrollerRef: HTMLElement | undefined,
		setIsMarquee: (v: boolean) => void,
		setIsAnimating: (v: boolean) => void
	): void {
		if (!lineRef || !textRef) return;
		const containerWidth = lineRef.getBoundingClientRect().width;
		const textWidth = textRef.getBoundingClientRect().width;
		const isMarquee = (containerWidth - textWidth) / 2 < MARQUEE_ANIMATION_OFFSET;
		setIsMarquee(isMarquee);
		if (isMarquee && scrollerRef) {
			scrollerRef.style.setProperty('--marquee-scroll-width', `${textWidth + 8}`);
			setTimeout(() => setIsAnimating(true), MARQUEE_ANIMATION_DELAY);
		}
	}


	function measureAllMarquees(): void {
		measureMarquee(primaryMarqueeRef, primaryTextRef, primaryScrollerRef, (v) => primaryIsMarquee = v, (v) => primaryIsAnimating = v);
		measureMarquee(secondaryMarqueeRef, secondaryTextRef, secondaryScrollerRef, (v) => secondaryIsMarquee = v, (v) => secondaryIsAnimating = v);
	}

	function resetMarquees(): void {
		primaryIsMarquee = false;
		secondaryIsMarquee = false;
		primaryIsAnimating = false;
		secondaryIsAnimating = false;
	}

	const moreMenu = createMenuState<void>();
	const favStore = getFavoriteStore();
	let favIds = $state<Set<number>>(new Set());

	$effect(() => {
		const unsub = favoriteIds.subscribe((ids) => { favIds = ids; });
		return unsub;
	});


	async function toggleLike(): Promise<void> {
		const track = playerState.currentTrack;
		if (!track?.emosId) return;
		await favStore.toggleFavorite(track.emosId);
	}

	function handleMoreClick(e: MouseEvent): void {
		moreMenu.open(e, undefined);
	}

	let moreMenuItems = $derived(
		createShareCopyMenu(() => {
			const track = playerState.currentTrack;
			if (!track) return '';
			return `${window.location.origin}/song/${track.emosId}`;
		}, playerState.currentTrack ? [{ label: '查看制作人员', icon: ICONS.CREDITS, action: () => { close(); const track = playerState.currentTrack; if (track) goto(`/song/${track.emosId}`); } }] : undefined)
	);

	function handleScrubberMouseDown(e: MouseEvent): void {
		e.preventDefault();
		isProgressDragging = true;
		seekFromMouseEvent(e);
	}

	function handleScrubberMouseMove(e: MouseEvent): void {
		if (!isProgressDragging) return;
		seekFromMouseEvent(e);
	}

	function handleScrubberMouseUp(e: MouseEvent): void {
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

	function seekFromMouseEvent(e: MouseEvent): void {
		const scrubber = document.querySelector('.fp-progress__track') as HTMLElement;
		if (!scrubber || playbackDuration <= 0) return;
		const rect = scrubber.getBoundingClientRect();
		const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
		seekTo(ratio * playbackDuration);
	}

	export { open, close, openInstant, closeInstant };
</script>

{#if shouldRender}
	<div class="full-player-backdrop" style:opacity={isVisible ? 1 : 0} onclick={close}></div>
	<div
		class="full-player"
		class:is-lyrics-off={!isLyricsOn}
		class:is-lyrics-on={isLyricsOn}
		class:is-paused={!playerState.isPlaying && !playerState.isLoading}
		class:full-player--enter={shouldRender && !isVisible}
		class:full-player--enter-active={isVisible}
		class:full-player--exit={!isVisible && shouldRender}
		class:full-player--exit-active={!isVisible && shouldRender}

		bind:this={containerRef}
		onkeydown={handleKeydown}
		tabindex="-1"
		role="dialog"
		aria-label="全屏播放器"
		data-testid="full-player"
	>
		<div class="full-player__platter" data-testid="now-playing-backdrop">
			<canvas bind:this={backdropCanvas}></canvas>
		</div>
		<button class="full-player__close-button" type="button" aria-label="关闭" onclick={close}>
			<svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
				<path d={ICONS.CLOSE}></path>
			</svg>
		</button>
		<div class="full-player__controls" data-testid="full-player-controls">
				<div class="full-player__artwork-container">
					{#if hasArtwork}
						<img class="full-player__artwork-img" src={largeArtworkUrl} alt="" width="600" height="600" />
					{:else}
						<svg class="full-player__artwork-placeholder" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
							<g fill="none" fill-rule="evenodd">
								<path fill="var(--genericJoeColor)" d="M0 0h100v100H0z"></path>
								<path fill="var(--playerMissingArtworkIcon)" d={ICONS.MUSIC_NOTE} fill-rule="nonzero"></path>
							</g>
						</svg>
					{/if}

				</div>
				<div class="full-player__metadata">
					<div class="lcd-meta" aria-live="assertive">
						<div class="lcd-meta__primary-wrapper">
							<div class="lcd-meta__primary" style="--marquee-line-padding: 8px; width: 100%;">
								<div class="lcd-meta-line-wrapper">
									<div
										class="lcd-meta-line {primaryIsMarquee ? 'is-marquee' : 'not-marquee'} {primaryIsAnimating ? 'is-animating' : ''}"
										bind:this={primaryMarqueeRef}
										dir="auto"
										onanimationend={() => { primaryIsAnimating = false; setTimeout(() => { if (primaryIsMarquee) primaryIsAnimating = true; }, MARQUEE_ANIMATION_DELAY); }}
									>
										<div class="lcd-meta-line__string-container">
											<div class="lcd-meta-line__marquee-mask">
												<div class="lcd-meta-line__marquee-scroller" bind:this={primaryScrollerRef} dir="auto">
													<div class="lcd-meta-line__scrolling-text-chunk">
														<span class="lcd-meta-line__text-content" bind:this={primaryTextRef}>
															<span class="lcd-meta-line__fragment">{playerState.currentTrack?.title ?? ''}</span>
														</span>
													</div>
													<div class="lcd-meta-line__scrolling-text-chunk lcd-meta-line__scrolling-text-chunk--copy">
														<span class="lcd-meta-line__fragment">{playerState.currentTrack?.title ?? ''}</span>
													</div>
												</div>
											</div>
										</div>
									</div>
								</div>
							</div>
						</div>
						<div class="lcd-meta__secondary" style="--marquee-line-padding: 8px; width: 100%;">
							<div class="lcd-meta-line-wrapper">
								<div
									class="lcd-meta-line {secondaryIsMarquee ? 'is-marquee' : 'not-marquee'} {secondaryIsAnimating ? 'is-animating' : ''}"
									bind:this={secondaryMarqueeRef}
									dir="auto"
									onanimationend={() => { secondaryIsAnimating = false; setTimeout(() => { if (secondaryIsMarquee) secondaryIsAnimating = true; }, MARQUEE_ANIMATION_DELAY); }}
								>
									<div class="lcd-meta-line__string-container">
										<div class="lcd-meta-line__marquee-mask">
											<div class="lcd-meta-line__marquee-scroller" bind:this={secondaryScrollerRef} dir="auto">
												<div class="lcd-meta-line__scrolling-text-chunk">
													<span class="lcd-meta-line__text-content" bind:this={secondaryTextRef}>
														<button class="lcd-meta-line__fragment">{playerState.currentTrack?.artist ?? ''}</button><span class="lcd-meta-line__fragment"> — </span><button class="lcd-meta-line__fragment">{playerState.currentTrack?.album ?? ''}</button>
													</span>
												</div>
												<div class="lcd-meta-line__scrolling-text-chunk lcd-meta-line__scrolling-text-chunk--copy">
													<button class="lcd-meta-line__fragment">{playerState.currentTrack?.artist ?? ''}</button><span class="lcd-meta-line__fragment"> — </span><button class="lcd-meta-line__fragment">{playerState.currentTrack?.album ?? ''}</button>
												</div>
											</div>
										</div>
									</div>
								</div>
							</div>
						</div>
					</div>
					<div class="accessory-buttons">
						{#if isEmosLoggedIn()}
						<button class="favorite-button favorite-button--platter" class:is-favorited={playerState.currentTrack && favIds.has(playerState.currentTrack.emosId)} type="button" aria-label="个人收藏" onclick={toggleLike}>
							<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg" class="favorite-icon">
								<path class="favorite-icon__star" d={playerState.currentTrack && favIds.has(playerState.currentTrack.emosId) ? ICONS.FAVORITE_ICON_STAR_FILLED : ICONS.FAVORITE_ICON_STAR}></path>
							</svg>
						</button>
						{/if}
						<button class="more-button more-button--platter" type="button" aria-label="更多" onclick={handleMoreClick}>
							<svg width="28" height="28" viewBox="0 0 28 28" xmlns="http://www.w3.org/2000/svg" class="more-button__glyph">
								<circle fill="var(--iconCircleFill, var(--systemQuaternary-onDark))" cx="14" cy="14" r="14"></circle>
								<path fill="var(--iconEllipsisFill, white)" d={ICONS.ELLIPSIS}></path>
							</svg>
						</button>
					</div>
				</div>
				<div class="full-player__scrubber">
					<div class="fp-progress" class:fp-progress--hovered={isProgressHovered} onmouseenter={() => isProgressHovered = true} onmouseleave={() => { if (!isProgressDragging) isProgressHovered = false; }}>
						<div class="fp-progress__track" onmousedown={handleScrubberMouseDown} role="slider" aria-valuenow={progressValue} aria-valuemin="0" aria-valuemax="100" aria-label="播放进度" style="--progress: {progressValue}%"></div>
						<div class="fp-progress__times">
							<span class="fp-progress__elapsed">{formattedElapsed}</span>
							<span class="fp-progress__remaining">{formattedRemaining}</span>
						</div>
					</div>
				</div>
				<div class="full-player__playback-controls">
					<div class="playback-controls">
						<amp-playback-controls-shuffle>
							<button class={getShuffleClass()} disabled={playerState.queue.length <= 1 || undefined} role="switch" aria-checked={playerState.isShuffled ? 'true' : 'false'} onclick={toggleShuffle}>
								<span class="button__label">随机播放</span>
								<amp-icon class="icon" role="presentation" aria-hidden="true">
									<svg viewBox="0 0 32 28" xmlns="http://www.w3.org/2000/svg"><path d={ICONS.SHUFFLE} fill-rule="nonzero"></path></svg>
								</amp-icon>
							</button>
						</amp-playback-controls-shuffle>
						<div class="playback-controls__main" dir="ltr">
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
				<div class="full-player__volume">
					<div class="fp-volume">
						<button class="fp-volume__button" onclick={toggleMute} aria-label="音量">
							<svg class="fp-volume__icon" role="presentation" viewBox="0 0 64 64">
								<path transform="translate(2,11.149)" d={ICONS.VOLUME_SPEAKER}></path>
								<path class="fp-volume__wave fp-volume__wave-1 {playerState.volume === 0 ? 'fp-volume__wave-hidden' : ''}" transform="translate(2,11.149)" d={ICONS.VOLUME_WAVE_1}></path>
								<path class="fp-volume__wave fp-volume__wave-2 {getVolumeWave2Class()}" transform="translate(2,11.149)" d={ICONS.VOLUME_WAVE_2}></path>
								<path class="fp-volume__wave fp-volume__wave-3 {getVolumeWave3Class()}" transform="translate(2,11.149)" d={ICONS.VOLUME_WAVE_3}></path>
							</svg>
						</button>
						<div class="fp-volume__slider">
							<input type="range" class="fp-volume__range" min="0" max="1" step="0.01" value={playerState.volume} oninput={adjustVolume} onchange={adjustVolume} style="--progress: {playerState.volume * 100}%" aria-label="音量" />
						</div>
					</div>
				</div>
			</div>
			<div class="now-playing-toggle" data-testid="now-playing-toggle">
				<button class="toggle-button toggle-button--lyrics lyrics-button" aria-label="歌词" onclick={() => { isLyricsOn = !isLyricsOn; }}>
					<svg class="invertible-mask" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" width="28" height="28" role="presentation">
						<mask id={lyricsMaskId}>
							<rect width="100%" height="100%" fill="black"></rect>
							<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="22" height="22" x="3" y="3" fill="white">
								<path d={ICONS.LYRICS_QUOTE}></path>
							</svg>
						</mask>
						<rect width="100%" height="100%" mask="url(#{lyricsMaskId})"></rect>
					</svg>
				</button>
			</div>
		<div class="full-player__lyrics" bind:this={lyricsContainerRef} ontouchstart={handleLyricsUserScroll} onwheel={handleLyricsUserScroll}>

			{#if hasYrc}
				<div class="fp-lyrics-padding-top"></div>
				{#each yrcLines as line, i (i)}
					<div class="fp-lyrics-line fp-lyrics-line--yrc" class:fp-lyrics-line--active={i === rafActiveIndex} class:fp-lyrics-line--first={i === 0} onclick={() => { if (line.time >= 0) seekTo(line.time); }}>
						<span class="fp-lyrics-text">
							{#each line.words as word, wi (word.startTime + '_' + wi)}
								{#if word.duration > 0 && word.text.trim().length <= 2 && word.text.trim().length > 0 && /[a-zA-Z\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff\uac00-\ud7af]/.test(word.text)}
									<span class="fp-syllable emphasis" data-start={word.startTime} data-duration={word.duration}>
										{#each word.text.split('') as char, ci (ci)}
											<span class="fp-letter" data-delay={ci * 40}>{char}</span>
										{/each}
									</span>
								{:else if word.duration > 0}
									<span class="fp-syllable" data-start={word.startTime} data-duration={word.duration}>{word.text}</span>
								{:else}
									<span class="fp-syllable fp-syllable--static">{word.text}</span>
								{/if}&nbsp;
							{/each}
						</span>
						{#if line.translation}
							<span class="fp-lyrics-translation">{line.translation}</span>
						{/if}
					</div>
				{/each}
				<div class="fp-lyrics-padding-bottom"></div>
			{:else if lyricLines.length > 0}
				<div class="fp-lyrics-padding-top"></div>
				{#each lyricLines as line, i (i)}
					<div class="fp-lyrics-line" class:fp-lyrics-line--active={i === rafActiveIndex} class:fp-lyrics-line--first={i === 0} onclick={() => { if (line.time >= 0) seekTo(line.time); }}>
						<span class="fp-lyrics-text">{line.text}</span>
						{#if line.translation}
							<span class="fp-lyrics-translation">{line.translation}</span>
						{/if}
					</div>
				{/each}
				<div class="fp-lyrics-padding-bottom"></div>
			{:else}
				<div class="fp-lyrics-empty">
					<p class="fp-lyrics-empty__title">歌词不可用</p>
					<p class="fp-lyrics-empty__text">当前歌曲暂无歌词</p>
				</div>
			{/if}
		</div>
	</div>

<div style="--ctxmenu-z-index-override: 10002; --ctxmenu-scrim-z-index-override: 10001;">
	<ContextualMenu items={moreMenuItems} clientPos={moreMenu.clientPos} onclose={moreMenu.close} />
</div>
{/if}
