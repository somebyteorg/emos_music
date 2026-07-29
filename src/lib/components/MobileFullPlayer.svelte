<script lang="ts">
	import '$lib/styles/mobile-full-player.css';
	import { untrack } from 'svelte';
	import { ICONS, createShareCopyMenu } from '$lib/utils/constants';
	import {
		subscribe, subscribeProgress, getState, getProgress,
		togglePlay, skipPrevious, skipNext, toggleShuffle, cycleRepeat,
		seekTo, getCurrentTime, removeFromQueue, playQueueItem
	} from '$lib/stores/player';
	import type { PlayerState, PlaybackProgress } from '$lib/stores/player';
	import { LyricsScene } from '$lib/utils/lyrics-scene';
	import { formatDuration } from '$lib/utils/format';
	import { getLyric, parseLyricLines, parseYrcLines } from '$lib/services/emos';
	import { favoriteIds, getFavoriteStore } from '$lib/stores/favorite-store';
	import { isEmosLoggedIn } from '$lib/stores/emos-auth';
	import type { EmosLyricLine, EmosYrcLine } from '$lib/types/emos';
	import ContextualMenu from '$lib/components/ContextualMenu.svelte';
	import { createMenuState } from '$lib/utils/menu-state.svelte';
	import { goto } from '$app/navigation';

	interface Props {
		onClose: () => void;
	}

	let { onClose }: Props = $props();

	let playerState: PlayerState = $state(getState());
	let playbackProgress: PlaybackProgress = $state(getProgress());
	let isVisible = $state(false);
	let shouldRender = $state(false);
	let isExiting = $state(false);
	let containerRef: HTMLElement | undefined = $state();
	let backdropCanvas: HTMLCanvasElement | undefined = $state();
	let lyricsSceneReady = $state(false);
	let lyricsScene: LyricsScene | null = null;
	let currentTrackId = $state(getState().currentTrack?.emosId ?? 0);
	let currentArtworkUrl = $state(getState().currentTrack?.artworkUrl ?? '');

	let isLyricsOn = $state(false);
	let isQueueOn = $state(false);
	let lyricsMaskId = 'mfp-lyrics-mask-' + Math.random().toString(36).slice(2, 8);
	let queueMaskId = 'mfp-queue-mask-' + Math.random().toString(36).slice(2, 8);
	let shuffleMaskId = 'mfp-shuffle-mask-' + Math.random().toString(36).slice(2, 8);
	let repeatMaskId = 'mfp-repeat-mask-' + Math.random().toString(36).slice(2, 8);
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
	let isUserScrolling = false;
	let userScrollTimer: ReturnType<typeof setTimeout> | undefined;
	let isFirstScroll = true;
	let isProgressDragging = $state(false);
	let isProgressHovered = $state(false);
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
		const syllables = lineEl.querySelectorAll<HTMLElement>('.mfp-syllable:not(.mfp-syllable--static)');
		for (const syl of syllables) {
			syl.style.setProperty('--gradient-progress', '-20%');
			syl.style.setProperty('--syllable-y', '0');
			if (syl.classList.contains('emphasis')) {
				const letters = syl.querySelectorAll<HTMLElement>('.mfp-letter');
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
		const allSyllables = lyricsContainerRef.querySelectorAll<HTMLElement>('.mfp-syllable:not(.mfp-syllable--static)');
		for (const syl of allSyllables) {
			syl.style.setProperty('--gradient-progress', '-20%');
			syl.style.setProperty('--syllable-y', '0');
			if (syl.classList.contains('emphasis')) {
				const letters = syl.querySelectorAll<HTMLElement>('.mfp-letter');
				for (const letter of letters) {
					letter.style.setProperty('--syllable-scale', '1');
					letter.style.setProperty('--syllable-y', '0');
					letter.style.setProperty('--gradient-progress', '-20%');
					letter.style.setProperty('--text-shadow-blur-radius', '0px');
					letter.style.setProperty('--text-shadow-opacity', '0');
				}
			}
		}
		const lineEls = lyricsContainerRef.querySelectorAll('.mfp-lyrics-line');
		lineEls.forEach((el) => el.classList.remove('mfp-lyrics-line--active'));
	}

	function buildKeyframes(): void {
		keyframes = [];
		if (!lyricsContainerRef || !hasYrc) return;
		const lineEls = lyricsContainerRef.querySelectorAll('.mfp-lyrics-line');
		for (const lineEl of lineEls) {
			const syllables = lineEl.querySelectorAll<HTMLElement>('.mfp-syllable:not(.mfp-syllable--static)');
			for (const syl of syllables) {
				const startMs = parseFloat(syl.dataset.start ?? '0');
				const durMs = parseFloat(syl.dataset.duration ?? '0');
				if (durMs <= 0) continue;
				const startSec = startMs / 1000;
				const endSec = (startMs + durMs) / 1000;
				if (syl.classList.contains('emphasis')) {
					const letters = syl.querySelectorAll<HTMLElement>('.mfp-letter');
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
							start: letterStartSec, end: letterMidSec, el: letter,
							props: {
								scale: { from: 1, to: 1 + 0.05 * Math.min(scaleUp / 0.5, 1), unit: '' },
								y: { from: 0, to: yUp, unit: '' },
								'--gradient-progress': { from: -20, to: 90, unit: '%' },
								'--text-shadow-blur-radius': { from: 0, to: shadowBlurUp, unit: 'px' },
								'--text-shadow-opacity': { from: 0, to: shadowOpacityUp, unit: '' }
							}
						});
						keyframes.push({
							start: letterMidSec, end: letterEndSec, el: letter,
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
					keyframes.push({ start: startSec + 0.1, end: endSec + 0.1, el: syl, props: { y: { from: 0, to: -2, unit: '' } } });
					keyframes.push({ start: startSec, end: endSec, el: syl, props: { '--gradient-progress': { from: -20, to: 100, unit: '%' } } });
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
			const lineEnd = hasYrc ? (line as EmosYrcLine).time + (line as EmosYrcLine).duration : line.time;
			if (line.time <= currentTimeSec && currentTimeSec < lineEnd) return i;
			if (line.time <= currentTimeSec) idx = i;
		}
		return idx;
	}

	function lyricsTick(): void {
		if (!lyricsContainerRef || !isLyricsOn) {
			lyricsRafId = requestAnimationFrame(lyricsTick);
			return;
		}
		if (!keyframesBuilt && hasYrc) buildKeyframes();
		const currentTimeSec = getCurrentTime();
		prevTickTime = currentTimeSec;
		const activeIdx = findActiveIndex(currentTimeSec);
		if (activeIdx !== lastRafIndex) {
			lastRafIndex = activeIdx;
			rafActiveIndex = activeIdx;
			const lineEls = lyricsContainerRef.querySelectorAll('.mfp-lyrics-line');
			lineEls.forEach((el, i) => {
				if (i === activeIdx) {
					cleanLineInlineStyles(el as HTMLElement);
					el.classList.add('mfp-lyrics-line--active');
				} else {
					el.classList.remove('mfp-lyrics-line--active');
					cleanLineInlineStyles(el as HTMLElement);
				}
			});
			if (isFirstScroll && activeIdx >= 0) {
				isFirstScroll = false;
				jumpScrollToLine(activeIdx);
			}
		}
		if (hasYrc && keyframes.length > 0) tickKeyframes(currentTimeSec);
		if (activeIdx >= 0) smoothScrollToLine(activeIdx);
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
				for (const [prop, cfg] of Object.entries(kf.props)) setKfProp(kf.el, prop, cfg.to, cfg.unit);
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
		const lineEl = lyricsContainerRef.querySelectorAll('.mfp-lyrics-line')[idx] as HTMLElement | undefined;
		if (!lineEl) return;
		const containerH = lyricsContainerRef.getBoundingClientRect().height;
		const target = lineEl.offsetTop - containerH * 0.25;
		lyricsContainerRef.scrollTop = Math.max(0, target);
		scrollTarget = target;
	}

	function smoothScrollToLine(idx: number): void {
		if (!lyricsContainerRef) return;
		if (isUserScrolling) return;
		const lineEl = lyricsContainerRef.querySelectorAll('.mfp-lyrics-line')[idx] as HTMLElement | undefined;
		if (!lineEl) return;
		const containerH = lyricsContainerRef.getBoundingClientRect().height;
		const containerTop = lyricsContainerRef.scrollTop;
		const containerBottom = containerTop + containerH;
		const lineTop = lineEl.offsetTop;
		const lineBottom = lineTop + lineEl.offsetHeight;
		if (lineTop >= containerTop + containerH * 0.15 && lineBottom <= containerBottom - containerH * 0.35) return;
		const target = lineEl.offsetTop - containerH * 0.25;
		scrollTarget = Math.max(0, target);
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
		if (isLyricsOn) startLyricsRaf();
		else stopLyricsRaf();
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
		isExiting = false;
		document.body.style.overflow = 'hidden';
		requestAnimationFrame(() => {
			requestAnimationFrame(() => {
				isVisible = true;
				initLyricsScene();
			});
		});
	}

	function openInstant(): void {
		shouldRender = true;
		isExiting = false;
		isVisible = true;
		document.body.style.overflow = 'hidden';
		initLyricsScene();
	}

	function close(): void {
		isVisible = false;
		isExiting = true;
		destroyLyricsScene();
		document.body.style.overflow = '';
		setTimeout(() => {
			shouldRender = false;
			isExiting = false;
			dragOffset = 0;
			onClose();
		}, 350);
	}

	function closeInstant(): void {
		isVisible = false;
		isExiting = false;
		shouldRender = false;
		dragOffset = 0;
		destroyLyricsScene();
		document.body.style.overflow = '';
	}

	function handleKeydown(e: KeyboardEvent): void {
		if (e.key === 'Escape') close();
	}

	let dragStartY = $state(0);
	let dragCurrentY = $state(0);
	let isDragging = $state(false);
	let dragOffset = $state(0);

	function handleTouchStart(e: TouchEvent): void {
		const target = e.target as HTMLElement;
		if (target.closest('.mfp__lyrics, .mfp__controls, .mfp__volume, .mfp__queue-section')) return;
		dragStartY = e.touches[0].clientY;
		dragCurrentY = dragStartY;
		isDragging = true;
	}

	function handleTouchMove(e: TouchEvent): void {
		if (!isDragging) return;
		dragCurrentY = e.touches[0].clientY;
		const offset = dragCurrentY - dragStartY;
		if (offset > 0) {
			e.preventDefault();
			dragOffset = offset * 0.6;
		} else {
			dragOffset = 0;
		}
	}

	function handleTouchEnd(): void {
		if (!isDragging) return;
		isDragging = false;
		if (dragOffset > 100) {
			close();
		}
		dragOffset = 0;
	}

	function initLyricsScene(): void {
		if (!backdropCanvas) return;
		const url = playerState.currentTrack?.artworkUrl;
		lyricsScene = new LyricsScene(backdropCanvas, url);
		lyricsSceneReady = true;
	}

	function destroyLyricsScene(): void {
		if (lyricsScene) {
			lyricsScene.destroy();
			lyricsScene = null;
		}
		lyricsSceneReady = false;
	}

	$effect(() => {
		if (lyricsSceneReady && artworkUrl) lyricsScene?.updateArtwork(artworkUrl);
	});

	$effect(() => {
		if (isVisible && playerState.currentTrack) {
			untrack(() => requestAnimationFrame(() => measureAllMarquees()));
		}
	});




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

	function handleScrubberTouchStart(e: TouchEvent): void {
		isProgressDragging = true;
		seekFromTouchEvent(e);
	}

	function handleScrubberMouseMove(e: MouseEvent): void {
		if (!isProgressDragging) return;
		seekFromMouseEvent(e);
	}

	function handleScrubberTouchMove(e: TouchEvent): void {
		if (!isProgressDragging) return;
		seekFromTouchEvent(e);
	}

	function handleScrubberMouseUp(e: MouseEvent): void {
		if (!isProgressDragging) return;
		seekFromMouseEvent(e);
		isProgressDragging = false;
	}

	function handleScrubberTouchEnd(): void {
		isProgressDragging = false;
	}

	$effect(() => {
		if (!isProgressDragging) return;
		document.addEventListener('mousemove', handleScrubberMouseMove);
		document.addEventListener('mouseup', handleScrubberMouseUp);
		document.addEventListener('touchmove', handleScrubberTouchMove, { passive: true });
		document.addEventListener('touchend', handleScrubberTouchEnd);
		return () => {
			document.removeEventListener('mousemove', handleScrubberMouseMove);
			document.removeEventListener('mouseup', handleScrubberMouseUp);
			document.removeEventListener('touchmove', handleScrubberTouchMove);
			document.removeEventListener('touchend', handleScrubberTouchEnd);
		};
	});

	function seekFromMouseEvent(e: MouseEvent): void {
		const scrubber = document.querySelector('.mfp-progress__track') as HTMLElement;
		if (!scrubber || playbackDuration <= 0) return;
		const rect = scrubber.getBoundingClientRect();
		const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
		seekTo(ratio * playbackDuration);
	}

	function seekFromTouchEvent(e: TouchEvent): void {
		const scrubber = document.querySelector('.mfp-progress__track') as HTMLElement;
		if (!scrubber || playbackDuration <= 0) return;
		const rect = scrubber.getBoundingClientRect();
		const touch = e.touches[0] ?? e.changedTouches[0];
		if (!touch) return;
		const ratio = Math.max(0, Math.min(1, (touch.clientX - rect.left) / rect.width));
		seekTo(ratio * playbackDuration);
	}

	export { open, close, openInstant, closeInstant };
</script>

{#if shouldRender}
	<div class="mfp-backdrop" style:opacity={isVisible ? (dragOffset > 0 ? Math.max(0, 1 - dragOffset / 400) : 1) : 0} onclick={close}></div>
	<div
		class="mfp"
		class:mfp--visible={isVisible}
		class:mfp--exit={isExiting}
		class:mfp--lyrics-on={isLyricsOn}
		class:mfp--queue-on={isQueueOn}
		class:mfp--empty={!playerState.currentTrack}
		class:mfp--paused={playerState.currentTrack && !playerState.isPlaying}
		class:mfp--dragging={isDragging}
		bind:this={containerRef}
		onkeydown={handleKeydown}
		ontouchstart={handleTouchStart}
		ontouchmove={handleTouchMove}
		ontouchend={handleTouchEnd}
		style:transform={dragOffset > 0 ? `translateY(${dragOffset}px)` : undefined}
		tabindex="-1"
		role="dialog"
		aria-label="全屏播放器"
		data-testid="mobile-full-player"
	>
		<div class="mfp__platter" data-testid="now-playing-backdrop">
			<canvas bind:this={backdropCanvas}></canvas>
		</div>

		<div class="mfp__content">
			<button class="mfp__collapse" type="button" aria-label="关闭" onclick={close}>
				<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 90.64 30.831" width="24" height="8" aria-hidden="true">
					<path d={ICONS.COLLAPSE_CHEVRON}></path>
				</svg>
			</button>

			{#if isLyricsOn}
					<div class="mfp__mobile-lyrics">
						<div class="mfp__compact-playback">
							<div class="mfp__compact-artwork-container">
								<button class="mfp__compact-artwork-button" aria-label="展开控制" onclick={() => { isLyricsOn = false; }}>
									{#if hasArtwork}
										<img class="mfp__compact-artwork-img" src={largeArtworkUrl} alt="" width="60" height="60" />
									{:else}
										<svg class="mfp__compact-artwork-img" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" style="background:var(--genericJoeColor);">
											<path fill="var(--playerMissingArtworkIcon)" d={ICONS.MUSIC_NOTE} fill-rule="nonzero"></path>
										</svg>
									{/if}
								</button>
							</div>
							<div class="mfp__compact-metadata">
								<div class="mfp__compact-primary">{playerState.currentTrack?.title || '未在播放'}</div>
								<div class="mfp__compact-secondary">{playerState.currentTrack?.artist ? `${playerState.currentTrack.artist} — ${playerState.currentTrack.album ?? ''}` : ''}</div>
							</div>
							<div class="mfp__compact-accessory-buttons">
								{#if isEmosLoggedIn()}
									<button class="mfp__favorite-button" class:mfp__favorite-button--active={playerState.currentTrack && favIds.has(playerState.currentTrack.emosId)} type="button" aria-label="个人收藏" onclick={toggleLike}>
										<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg" class="mfp__favorite-icon">
											<path class="mfp__favorite-star" d={playerState.currentTrack && favIds.has(playerState.currentTrack.emosId) ? ICONS.FAVORITE_ICON_STAR_FILLED : ICONS.FAVORITE_ICON_STAR}></path>
										</svg>
									</button>
								{/if}
								<button class="mfp__more-button" type="button" aria-label="更多" onclick={handleMoreClick}>
									<svg width="28" height="28" viewBox="0 0 28 28" xmlns="http://www.w3.org/2000/svg" class="mfp__more-glyph">
										<circle fill="var(--iconCircleFill, var(--systemQuaternary-onDark))" cx="14" cy="14" r="14"></circle>
										<path fill="var(--iconEllipsisFill, white)" d={ICONS.ELLIPSIS}></path>
									</svg>
								</button>
							</div>
						</div>
						<div class="mfp__lyrics mfp__lyrics--inline" bind:this={lyricsContainerRef} ontouchstart={handleLyricsUserScroll} onwheel={handleLyricsUserScroll}>
							{#if hasYrc}
								<div class="mfp-lyrics-padding-top"></div>
								{#each yrcLines as line, i (i)}
									<div class="mfp-lyrics-line mfp-lyrics-line--yrc" class:mfp-lyrics-line--active={i === rafActiveIndex} class:mfp-lyrics-line--first={i === 0} onclick={() => { if (line.time >= 0) seekTo(line.time); }}>
										<span class="mfp-lyrics-text">
											{#each line.words as word, wi (word.startTime + '_' + wi)}
												{#if word.duration > 0 && word.text.trim().length <= 2 && word.text.trim().length > 0 && /[a-zA-Z\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff\uac00-\ud7af]/.test(word.text)}
													<span class="mfp-syllable emphasis" data-start={word.startTime} data-duration={word.duration}>
														{#each word.text.split('') as char, ci (ci)}
															<span class="mfp-letter" data-delay={ci * 40}>{char}</span>
														{/each}
													</span>
												{:else if word.duration > 0}
													<span class="mfp-syllable" data-start={word.startTime} data-duration={word.duration}>{word.text}</span>
												{:else}
													<span class="mfp-syllable mfp-syllable--static">{word.text}</span>
												{/if}&nbsp;
											{/each}
										</span>
										{#if line.translation}
											<span class="mfp-lyrics-translation">{line.translation}</span>
										{/if}
									</div>
								{/each}
								<div class="mfp-lyrics-padding-bottom"></div>
							{:else if lyricLines.length > 0}
								<div class="mfp-lyrics-padding-top"></div>
								{#each lyricLines as line, i (i)}
									<div class="mfp-lyrics-line" class:mfp-lyrics-line--active={i === rafActiveIndex} class:mfp-lyrics-line--first={i === 0} onclick={() => { if (line.time >= 0) seekTo(line.time); }}>
										<span class="mfp-lyrics-text">{line.text}</span>
										{#if line.translation}
											<span class="mfp-lyrics-translation">{line.translation}</span>
										{/if}
									</div>
								{/each}
								<div class="mfp-lyrics-padding-bottom"></div>
							{:else}
								<div class="mfp-lyrics-empty">
									<p class="mfp-lyrics-empty__title">歌词不可用</p>
									<p class="mfp-lyrics-empty__text">当前歌曲暂无歌词</p>
								</div>
							{/if}
						</div>
					</div>
				{:else if isQueueOn}
					<div class="mfp__mobile-queue">
						<div class="mfp__compact-playback">
							<div class="mfp__compact-artwork-container">
								<button class="mfp__compact-artwork-button" aria-label="展开控制" onclick={() => { isQueueOn = false; }}>
									{#if hasArtwork}
										<img class="mfp__compact-artwork-img" src={largeArtworkUrl} alt="" width="60" height="60" />
									{:else}
										<svg class="mfp__compact-artwork-img" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" style="background:var(--genericJoeColor);">
											<path fill="var(--playerMissingArtworkIcon)" d={ICONS.MUSIC_NOTE} fill-rule="nonzero"></path>
										</svg>
									{/if}
								</button>
							</div>
							<div class="mfp__compact-metadata">
								<div class="mfp__compact-primary">{playerState.currentTrack?.title || '未在播放'}</div>
								<div class="mfp__compact-secondary">{playerState.currentTrack?.artist ? `${playerState.currentTrack.artist} — ${playerState.currentTrack.album ?? ''}` : ''}</div>
							</div>
							<div class="mfp__compact-accessory-buttons">
								{#if isEmosLoggedIn()}
									<button class="mfp__favorite-button" class:mfp__favorite-button--active={playerState.currentTrack && favIds.has(playerState.currentTrack.emosId)} type="button" aria-label="个人收藏" onclick={toggleLike}>
										<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg" class="mfp__favorite-icon">
											<path class="mfp__favorite-star" d={playerState.currentTrack && favIds.has(playerState.currentTrack.emosId) ? ICONS.FAVORITE_ICON_STAR_FILLED : ICONS.FAVORITE_ICON_STAR}></path>
										</svg>
									</button>
								{/if}
								<button class="mfp__more-button" type="button" aria-label="更多" onclick={handleMoreClick}>
									<svg width="28" height="28" viewBox="0 0 28 28" xmlns="http://www.w3.org/2000/svg" class="mfp__more-glyph">
										<circle fill="var(--iconCircleFill, var(--systemQuaternary-onDark))" cx="14" cy="14" r="14"></circle>
										<path fill="var(--iconEllipsisFill, white)" d={ICONS.ELLIPSIS}></path>
									</svg>
								</button>
							</div>
						</div>
						<div class="mfp-queue-header">
							<h4 class="mfp-queue-header__title">接下来播放</h4>
							<div class="mfp-queue-controls">
								<button class="mfp-queue-header-icon" class:mfp-queue-header-icon--active={playerState.isShuffled} aria-label="随机播放" onclick={toggleShuffle}>
									<svg class="invertible-mask {playerState.isShuffled ? 'mfp__invertible-mask--inverted' : 'mfp__invertible-mask--not-inverted'}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" width="28" height="28" role="presentation">
										<mask id={shuffleMaskId}>
											<rect width="100%" height="100%" fill={playerState.isShuffled ? 'white' : 'black'}></rect>
											<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="18" height="18" x="5" y="5" fill={playerState.isShuffled ? 'black' : 'white'}>
												<path d={ICONS.SHUFFLE_64}></path>
											</svg>
										</mask>
										<rect width="100%" height="100%" mask="url(#{shuffleMaskId})"></rect>
									</svg>
								</button>
								<button class="mfp-queue-header-icon" class:mfp-queue-header-icon--active={playerState.repeatMode !== 0} aria-label="循环" onclick={cycleRepeat}>
									<svg class="invertible-mask {playerState.repeatMode !== 0 ? 'mfp__invertible-mask--inverted' : 'mfp__invertible-mask--not-inverted'}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" width="28" height="28" role="presentation">
										<mask id={repeatMaskId}>
											<rect width="100%" height="100%" fill={playerState.repeatMode !== 0 ? 'white' : 'black'}></rect>
											<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="18" height="18" x="5" y="5" fill={playerState.repeatMode !== 0 ? 'black' : 'white'}>
												<path d={playerState.repeatMode === 2 ? ICONS.REPEAT_ONE_64 : ICONS.REPEAT_64}></path>
											</svg>
										</mask>
										<rect width="100%" height="100%" mask="url(#{repeatMaskId})"></rect>
									</svg>
								</button>
							</div>
						</div>
						<div class="mfp__queue-section">
							<ul class="mfp-queue-list" role="list">
								{#each playerState.queue as track, i (i)}
									{#if i > playerState.queueIndex}
										<li class="mfp-queue-item" role="listitem" tabindex="0" onclick={() => playQueueItem(i)}>
											<div class="mfp-queue-item__artwork">
												{#if track.artworkUrl}
													<img src={track.artworkUrl} alt="" width="48" height="48" />
												{:else}
													<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" width="48" height="48" style="background:var(--genericJoeColor);">
														<path fill="var(--playerMissingArtworkIcon)" d={ICONS.MUSIC_NOTE} fill-rule="nonzero"></path>
													</svg>
												{/if}
											</div>
											<div class="mfp-queue-item__info">
												<div class="mfp-queue-item__title">{track.title}</div>
												<div class="mfp-queue-item__subtitle">{track.artist}</div>
											</div>
											<div class="mfp-queue-item__time">
												{#if track.duration > 0}
													{formatDuration(track.duration * 1000)}
												{/if}
											</div>
										</li>
									{/if}
								{/each}
							</ul>
							{#if playerState.queue.length <= playerState.queueIndex + 1}
								<div class="mfp-queue-empty">
									<p class="mfp-queue-empty__text">待播清单为空</p>
								</div>
							{/if}
						</div>
					</div>

				{:else}
				<div class="mfp__now-playing-main">
					<div class="mfp__artwork-container">
						<button class="mfp__artwork-button" aria-label={showPause ? '暂停' : '播放'} disabled={!playerState.currentTrack || undefined} onclick={togglePlay}>
							{#if hasArtwork}
								<img class="mfp__artwork-img" src={largeArtworkUrl} alt="" width="600" height="600" />
							{:else}
								<svg class="mfp__artwork-placeholder" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
									<g fill="none" fill-rule="evenodd">
										<path fill="var(--genericJoeColor)" d="M0 0h100v100H0z"></path>
										<path fill="var(--playerMissingArtworkIcon)" d={ICONS.MUSIC_NOTE} fill-rule="nonzero"></path>
									</g>
								</svg>
							{/if}
						</button>
					</div>

					<div class="mfp__metadata">
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
															<span class="lcd-meta-line__fragment">{playerState.currentTrack?.title || '未在播放'}</span>
														</span>
													</div>
													<div class="lcd-meta-line__scrolling-text-chunk lcd-meta-line__scrolling-text-chunk--copy">
														<span class="lcd-meta-line__fragment">{playerState.currentTrack?.title || '未在播放'}</span>
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
					<div class="mfp__accessory-buttons">
						{#if isEmosLoggedIn()}
							<button class="mfp__favorite-button" class:mfp__favorite-button--active={playerState.currentTrack && favIds.has(playerState.currentTrack.emosId)} type="button" aria-label="个人收藏" onclick={toggleLike}>
								<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg" class="mfp__favorite-icon">
									<path class="mfp__favorite-star" d={playerState.currentTrack && favIds.has(playerState.currentTrack.emosId) ? ICONS.FAVORITE_ICON_STAR_FILLED : ICONS.FAVORITE_ICON_STAR}></path>
								</svg>
							</button>
						{/if}
						<button class="mfp__more-button" type="button" aria-label="更多" onclick={handleMoreClick}>
							<svg width="28" height="28" viewBox="0 0 28 28" xmlns="http://www.w3.org/2000/svg" class="mfp__more-glyph">
								<circle fill="var(--iconCircleFill, var(--systemQuaternary-onDark))" cx="14" cy="14" r="14"></circle>
								<path fill="var(--iconEllipsisFill, white)" d={ICONS.ELLIPSIS}></path>
							</svg>
						</button>
					</div>
				</div>
			</div>
				{/if}


			<div class="mfp__controls">
				<div class="mfp__progress" onmouseenter={() => isProgressHovered = true} onmouseleave={() => { if (!isProgressDragging) isProgressHovered = false; }}>
					<div class="mfp-progress__track" onmousedown={handleScrubberMouseDown} ontouchstart={handleScrubberTouchStart} role="slider" aria-valuenow={progressValue} aria-valuemin="0" aria-valuemax="100" aria-label="播放进度" style="--progress: {progressValue}%"></div>
					<div class="mfp-progress__times">
						<time class="mfp-progress__elapsed" datetime="PT0S" role="timer">{formattedElapsed}</time>
						<time class="mfp-progress__remaining" datetime="PT0S" role="timer">{formattedRemaining}</time>
					</div>
				</div>

				<div class="mfp__playback-buttons">
					<div class="mfp__skip mfp__skip--previous">
						<button class="mfp__skip-button" disabled={playerState.queue.length === 0 || undefined} onclick={skipPrevious}>
							<span class="mfp__skip-icon" aria-hidden="true">
								<svg viewBox="0 0 32 28" xmlns="http://www.w3.org/2000/svg"><path d={ICONS.SKIP_FORWARD} fill-rule="nonzero"></path></svg>
							</span>
							<span class="mfp__skip-label">上一首</span>
						</button>
					</div>

					<div class="mfp__play-pause">
						<button class="mfp__play" disabled={!playerState.currentTrack || undefined} aria-hidden={activeState !== 'play' ? 'true' : undefined} tabindex={activeState === 'play' ? undefined : -1} onclick={togglePlay} aria-label="播放">
							<svg viewBox="0 0 32 28" xmlns="http://www.w3.org/2000/svg"><path d={ICONS.PLAY} fill-rule="nonzero"></path></svg>
							<span class="button__label">播放</span>
						</button>
						<button class="mfp__pause" aria-hidden={activeState !== 'pause' ? 'true' : undefined} tabindex={activeState === 'pause' ? undefined : -1} onclick={togglePlay} aria-label="暂停">
							<svg viewBox="0 0 32 28" xmlns="http://www.w3.org/2000/svg"><path d={ICONS.PAUSE} fill-rule="nonzero"></path></svg>
							<span class="button__label">暂停</span>
						</button>
					</div>

					<div class="mfp__skip mfp__skip--next">
						<button class="mfp__skip-button" disabled={playerState.queue.length === 0 || undefined} onclick={skipNext}>
							<span class="mfp__skip-icon" aria-hidden="true">
								<svg viewBox="0 0 32 28" xmlns="http://www.w3.org/2000/svg"><path d={ICONS.SKIP_FORWARD} fill-rule="nonzero"></path></svg>
							</span>
							<span class="mfp__skip-label">下一首</span>
						</button>
					</div>
				</div>
			</div>

			<div class="mfp__toggle">
				<button class="mfp__toggle-button mfp__toggle-button--lyrics" aria-label="歌词" onclick={() => { isLyricsOn = !isLyricsOn; if (isLyricsOn) isQueueOn = false; }}>
					<svg class="invertible-mask {isLyricsOn ? 'mfp__invertible-mask--inverted' : 'mfp__invertible-mask--not-inverted'}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" width="28" height="28" role="presentation">
						<mask id={lyricsMaskId}>
							<rect width="100%" height="100%" fill={isLyricsOn ? 'white' : 'black'}></rect>
							<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="22" height="22" x="3" y="3" fill={isLyricsOn ? 'black' : 'white'}>
								<path d={isLyricsOn ? ICONS.LYRICS_QUOTE_INVERTED : ICONS.LYRICS_QUOTE}></path>
							</svg>
						</mask>
						<rect width="100%" height="100%" mask="url(#{lyricsMaskId})"></rect>
					</svg>
				</button>
				<button class="mfp__toggle-button mfp__toggle-button--queue" aria-label="待播清单" onclick={() => { isQueueOn = !isQueueOn; if (isQueueOn) isLyricsOn = false; }}>
					<svg class="invertible-mask {isQueueOn ? 'mfp__invertible-mask--inverted' : 'mfp__invertible-mask--not-inverted'}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" width="28" height="28" role="presentation">
						<mask id={queueMaskId}>
							<rect width="100%" height="100%" fill={isQueueOn ? 'white' : 'black'}></rect>
							<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="20" height="20" x="4" y="4" fill={isQueueOn ? 'black' : 'white'}>
								<path d={ICONS.UP_NEXT_QUEUE_64}></path>
							</svg>
						</mask>
						<rect width="100%" height="100%" mask="url(#{queueMaskId})"></rect>
					</svg>
				</button>
			</div>
		</div>
	</div>

	<div style="--ctxmenu-z-index-override: 10002; --ctxmenu-scrim-z-index-override: 10001;">
		<ContextualMenu items={moreMenuItems} clientPos={moreMenu.clientPos} onclose={moreMenu.close} />
	</div>
{/if}
