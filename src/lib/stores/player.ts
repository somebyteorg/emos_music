import { getArtworkUrl, getAlbumDetail, getPlaylistDetail, getSongPlayUrl, likeSong, getLyric, parseLyricLines } from '$lib/services/emos';
import { ARTWORK_SIZE } from '$lib/utils/constants';
import type { EmosSong, EmosLyricLine } from '$lib/types/emos';

export interface PlayerTrack {
	emosId: number;
	title: string;
	artist: string;
	artistId: number;
	album: string;
	albumId: number;
	artworkUrl: string;
	duration: number;
	fee?: number;
	emosOnly?: boolean;
	isLiked?: boolean;
}

type RepeatMode = 0 | 1 | 2;

export type PlayerState = {
	isPlaying: boolean;
	currentTrack: PlayerTrack | null;
	queue: PlayerTrack[];
	queueIndex: number;
	volume: number;
	isShuffled: boolean;
	repeatMode: RepeatMode;
	isLoading: boolean;
};

export type PlaybackProgress = {
	playbackTime: number;
	playbackDuration: number;
	playbackProgress: number;
};

type StateListener = (state: PlayerState) => void;
type ProgressListener = (progress: PlaybackProgress) => void;
const stateListeners = new Set<StateListener>();
const progressListeners = new Set<ProgressListener>();
let audio: HTMLAudioElement | null = null;
let skipAborted = false;
let switchingTrack = false;
let rafId = 0;
// scrobble removed - EMOS API does not support it
let nextStreamCache: { trackId: number; url: string; timestamp: number } | null = null;
let preloadTriggered = false;
let lastPreloadedNextId = 0;
let lyricLines: EmosLyricLine[] = [];
let currentLyricText = '';



function progressLoop(): void {
	if (!audio) return;
	progress.playbackTime = audio.currentTime;
	progress.playbackDuration = audio.duration || 0;
	progress.playbackProgress = progress.playbackDuration > 0 ? (progress.playbackTime / progress.playbackDuration) * 100 : 0;
	notifyProgress();


	if (!audio.paused && !audio.ended) {
		rafId = requestAnimationFrame(progressLoop);
	}
}


async function preloadNextTrack(fromIndex?: number, retryCount = 0): Promise<void> {
	const MAX_RETRIES = 3;
	const RETRY_DELAY = 2000;
	const startIndex = fromIndex ?? (state.queueIndex + 1);
	let nextTrack: PlayerTrack | null = null;
	let nextTrackIndex = -1;

	if (startIndex < state.queue.length) {
		nextTrack = state.queue[startIndex];
		nextTrackIndex = startIndex;
	} else if (state.repeatMode === 1 && state.queue.length > 0) {
		nextTrack = state.queue[0];
		nextTrackIndex = 0;
	}
	if (!nextTrack?.emosId) return;
	if (nextStreamCache && nextStreamCache.trackId === nextTrack.emosId && nextStreamCache.timestamp + 600000 > Date.now()) return;

	try {
		let streamUrl = '';
		if (nextTrack.emosId) {
			const url = await getSongPlayUrl(nextTrack.emosId);
			if (url) streamUrl = url;
		}
		if (streamUrl) {
			nextStreamCache = { trackId: nextTrack.emosId, url: streamUrl, timestamp: Date.now() };
		} else if (nextTrackIndex + 1 < state.queue.length) {
			preloadNextTrack(nextTrackIndex + 1, 0);
		}
	} catch {
		nextStreamCache = null;
		if (retryCount < MAX_RETRIES) {
			setTimeout(() => preloadNextTrack(fromIndex, retryCount + 1), RETRY_DELAY);
		} else if (nextTrackIndex + 1 < state.queue.length) {
			preloadNextTrack(nextTrackIndex + 1, 0);
		}
	}
}



const VOLUME_STORAGE_KEY = 'emos-player-volume';
const DEFAULT_VOLUME = 0.5;

function getStoredVolume(): number {
	if (typeof window === 'undefined') return DEFAULT_VOLUME;
	const stored = localStorage.getItem(VOLUME_STORAGE_KEY);
	if (stored === null) return DEFAULT_VOLUME;
	const val = parseFloat(stored);
	return Number.isFinite(val) && val >= 0 && val <= 1 ? val : DEFAULT_VOLUME;
}

const state: PlayerState = {
	isPlaying: false,
	currentTrack: null,
	queue: [],
	queueIndex: -1,
	volume: getStoredVolume(),
	isShuffled: false,
	repeatMode: 0,
	isLoading: false
};

const progress: PlaybackProgress = {
	playbackTime: 0,
	playbackDuration: 0,
	playbackProgress: 0
};

function notifyState(): void {
	for (const fn of stateListeners) fn({ ...state });
}

function notifyProgress(): void {
	for (const fn of progressListeners) fn({ ...progress });
}

export function subscribe(fn: StateListener): () => void {
	stateListeners.add(fn);
	fn({ ...state });
	return () => stateListeners.delete(fn);
}

export function subscribeProgress(fn: ProgressListener): () => void {
	progressListeners.add(fn);
	fn({ ...progress });
	return () => progressListeners.delete(fn);
}

export function getState(): PlayerState {
	return { ...state };
}

export function getProgress(): PlaybackProgress {
	return { ...progress };
}


let playGeneration = 0;


function initAudio(): void {
	if (audio || typeof window === 'undefined') return;

	audio = new Audio();
	audio.volume = getStoredVolume();
	audio.preload = 'auto';

	audio.addEventListener('playing', () => {
		state.isPlaying = true;
		notifyState();
		cancelAnimationFrame(rafId);
		rafId = requestAnimationFrame(progressLoop);

		if ('mediaSession' in navigator) {
			navigator.mediaSession.setActionHandler('play', () => { if (audio) audio.play(); });
			navigator.mediaSession.setActionHandler('pause', () => { if (audio) audio.pause(); });
			navigator.mediaSession.setActionHandler('previoustrack', () => {
				skipPrevious();
				if (audio) audio.play();
			});
			navigator.mediaSession.setActionHandler('nexttrack', () => {
				skipNext();
				if (audio) audio.play();
			});
			navigator.mediaSession.setActionHandler('seekto', (details) => {
				if (audio && details.seekTime !== undefined) {
					audio.currentTime = details.seekTime;
				}
			});
		}
	});

	audio.addEventListener('pause', () => {
		state.isPlaying = false;
		notifyState();
		cancelAnimationFrame(rafId);

		if (audio && audio.duration > 0 && audio.currentTime >= audio.duration - 0.5 && !audio.ended) {
			handleTrackEnded();
		}
	});

	audio.addEventListener('ended', () => {
		cancelAnimationFrame(rafId);
		handleTrackEnded();
	});

	audio.addEventListener('timeupdate', () => {
		if (!audio || audio.paused || audio.ended || audio.duration <= 0) return;
		const currentGen = playGeneration;
		if (!preloadTriggered) {
			preloadTriggered = true;
			const nextIdx = state.queueIndex + 1;
			const nextId = nextIdx < state.queue.length ? state.queue[nextIdx]?.emosId ?? 0 : 0;
			lastPreloadedNextId = nextId;
			preloadNextTrack();
		} else {
			const nextIdx = state.queueIndex + 1;
			const nextId = nextIdx < state.queue.length ? state.queue[nextIdx]?.emosId ?? 0 : 0;
			if (nextId !== lastPreloadedNextId) {
				lastPreloadedNextId = nextId;
				preloadNextTrack();
			}
		}

		if (lyricLines.length > 0) {
			let lineIndex = -1;
			for (let i = lyricLines.length - 1; i >= 0; i--) {
				if (lyricLines[i].time <= audio.currentTime) {
					lineIndex = i;
					break;
				}
			}
			const newLyricText = lineIndex >= 0 ? lyricLines[lineIndex].text : '';
			if (newLyricText !== currentLyricText) {
				currentLyricText = newLyricText;
				updateMediaSession(currentLyricText || undefined);
			}
		}
	});


	audio.addEventListener('loadedmetadata', () => {
		if (!audio) return;
		progress.playbackDuration = audio.duration || 0;
		if (state.currentTrack && progress.playbackDuration > 0) {
			state.currentTrack.duration = progress.playbackDuration;
			if (state.queueIndex >= 0 && state.queueIndex < state.queue.length) {
				state.queue[state.queueIndex].duration = progress.playbackDuration;
			}
		}
		state.isLoading = false;
		notifyState();
		notifyProgress();
	});

	audio.addEventListener('waiting', () => {
		state.isLoading = true;
		notifyState();
	});

	audio.addEventListener('canplay', () => {
		state.isLoading = false;
		notifyState();
	});

	audio.addEventListener('error', () => {
		state.isLoading = false;
		state.isPlaying = false;
		notifyState();
		trySkipNext();
	});

}

function emosSongToTrack(song: EmosSong): PlayerTrack {
	return {
		emosId: song.id,
		title: song.name,
		artist: song.ar?.map(a => a.name).join(', ') ?? '',
		artistId: song.ar?.[0]?.id ?? 0,
		album: song.al?.name ?? '',
		albumId: song.al?.id ?? 0,
		artworkUrl: song.al?.picUrl ? getArtworkUrl(song.al.picUrl, ARTWORK_SIZE.THUMBNAIL) : '',
		duration: song.dt ? song.dt / 1000 : 0,
		fee: song.fee
	};
}

function updateMediaSession(lyricOverride?: string): void {
	if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;
	if (!state.currentTrack) return;
	const track = state.currentTrack;
	let mediaArtworkSrc = track.artworkUrl;
	if (mediaArtworkSrc && mediaArtworkSrc.includes('param=')) {
		mediaArtworkSrc = mediaArtworkSrc.replace(/param=\d+y\d+/, `param=${ARTWORK_SIZE.MEDIUM}y${ARTWORK_SIZE.MEDIUM}`);
	}
	navigator.mediaSession.metadata = new MediaMetadata({
		title: lyricOverride || track.title,
		artist: track.artist,
		album: track.album,
		artwork: mediaArtworkSrc
			? [{ src: mediaArtworkSrc }]
			: []
	});

}


async function playTrack(track: PlayerTrack): Promise<void> {
	initAudio();
	if (!audio) return;

	skipAborted = false;
	switchingTrack = false;
	preloadTriggered = false;
	lyricLines = [];
	currentLyricText = '';

	state.currentTrack = track;
	progress.playbackTime = 0;
	progress.playbackDuration = 0;
	progress.playbackProgress = 0;
	state.isLoading = true;
	state.isPlaying = false;
	playGeneration++;
	updateMediaSession();
	notifyState();
	notifyProgress();

	let streamUrl = '';

	if (nextStreamCache && nextStreamCache.trackId === track.emosId && nextStreamCache.timestamp + 600000 > Date.now()) {
		streamUrl = nextStreamCache.url;
		nextStreamCache = null;
	} else {
		if (track.emosId) {
			const url = await getSongPlayUrl(track.emosId);
			if (skipAborted) return;
			if (url) streamUrl = url;
		}
	}

	if (!streamUrl) {
		trySkipNext();
		return;
	}

	audio.src = streamUrl;

	if (track.emosId) {
		const lyricTrackId = track.emosId;
		getLyric(lyricTrackId).then((data) => {
			if (state.currentTrack?.emosId !== lyricTrackId) return;
			if (data.lrc?.lyric) {
				lyricLines = parseLyricLines(data.lrc.lyric, data.tlyric?.lyric);
			}
		}).catch(() => {});
	}

	try {
		await audio.play();
	} catch (e) {
		const errName = (e as { name?: string })?.name ?? '';
		if (errName === 'AbortError') {
			setTimeout(() => { if (audio && audio.paused && audio.src) audio.play().catch(() => {}); }, 300);
			return;
		}

		state.isLoading = false;
		notifyState();
		trySkipNext();
	}
}

function trySkipNext(): void {
	if (skipAborted) return;
	const nextIndex = state.queueIndex + 1;
	if (nextIndex < state.queue.length) {
		state.queueIndex = nextIndex;
		notifyState();
		playTrack(state.queue[nextIndex]);
	} else {
		state.isLoading = false;
		state.isPlaying = false;
		notifyState();
	}
}

async function handleTrackEnded(): Promise<void> {
	if (switchingTrack) return;
	switchingTrack = true;

	// repeat-one: sync restart — 在 ended 同步调用栈中完成，iOS 不会拒绝
	if (state.repeatMode === 2) {
		if (audio) {
			audio.currentTime = 0;
			audio.play().catch(() => { switchingTrack = false; });
			return;
		}
		switchingTrack = false;
		return;
	}

	// 确定下一首
	const nextIndex = state.queueIndex + 1;
	let nextTrack: PlayerTrack | null = null;
	let targetIndex = -1;

	if (nextIndex < state.queue.length) {
		nextTrack = state.queue[nextIndex];
		targetIndex = nextIndex;
	} else if (state.repeatMode === 1 && state.queue.length > 0) {
		nextTrack = state.queue[0];
		targetIndex = 0;
	}

	// 同步快速路径：下一首有预加载 URL → 在 ended 同步栈中直接 src+play，iOS 不会拒绝
	if (nextTrack && nextTrack.emosId && !nextTrack.emosOnly &&
		nextStreamCache && nextStreamCache.trackId === nextTrack.emosId &&
		nextStreamCache.timestamp + 600000 > Date.now()) {
		const url = nextStreamCache.url;
		nextStreamCache = null;

		state.queueIndex = targetIndex;
		notifyState();

		playTrackFromCacheSync(nextTrack, url);
		return;
	}

	try {


		if (nextTrack) {
			await playTrack(nextTrack);
		} else {
			state.isPlaying = false;
			notifyState();
		}
	} finally {
		switchingTrack = false;
	}
}

function playTrackFromCacheSync(track: PlayerTrack, url: string): void {
	initAudio();
	if (!audio) { switchingTrack = false; return; }

	skipAborted = false;
	switchingTrack = false;
	preloadTriggered = false;
	lyricLines = [];
	currentLyricText = '';

	state.currentTrack = track;
	progress.playbackTime = 0;
	progress.playbackDuration = 0;
	progress.playbackProgress = 0;
	state.isLoading = true;
	state.isPlaying = false;
	playGeneration++;
	updateMediaSession();
	notifyState();
	notifyProgress();

	audio.src = url;

	if (track.emosId) {
		const lyricTrackId = track.emosId;
		getLyric(lyricTrackId).then((data) => {
			if (state.currentTrack?.emosId !== lyricTrackId) return;
			if (data.lrc?.lyric) {
				lyricLines = parseLyricLines(data.lrc.lyric, data.tlyric?.lyric);
			}
		}).catch(() => {});
	}

	// 同步调用 play()——在 ended 事件的同步调用栈中，iOS Safari 不会拒绝
	audio.play().then(() => {
		state.isPlaying = true;
		state.isLoading = false;
		notifyState();
		notifyProgress();

		if (!audio || audio.paused || audio.ended) return;
		rafId = requestAnimationFrame(progressLoop);

		// 触发下一首预加载
		preloadNextTrack().catch(() => {});
	}).catch((e) => {
		state.isLoading = false;
		state.isPlaying = false;
		notifyState();

		const errName = (e as { name?: string })?.name ?? '';
		if (errName === 'AbortError') {
			setTimeout(() => { if (audio && audio.paused && audio.src) audio.play().catch(() => {}); }, 300);
		} else {
			trySkipNext();
		}
	});
}

export function canPlay(): boolean {
	return true;
}

export async function playSong(song: EmosSong, songList?: EmosSong[]): Promise<void> {
	if (!canPlay()) return;
	initAudio();
	const track = emosSongToTrack(song);

	if (songList && songList.length > 0) {
		state.queue = songList.map(emosSongToTrack);
		state.queueIndex = songList.findIndex(s => s.id === song.id);
		if (state.queueIndex === -1) state.queueIndex = 0;
	} else {
		state.queue = [track];
		state.queueIndex = 0;
	}

	if (state.isShuffled) {
		shuffleQueue();
	}

	notifyState();
	await playTrack(track);

}

export async function playEmosTrack(track: PlayerTrack, trackList?: PlayerTrack[]): Promise<void> {
	if (!canPlay()) return;
	initAudio();

	if (trackList && trackList.length > 0) {
		state.queue = [...trackList];
		state.queueIndex = trackList.findIndex(t => t.emosId === track.emosId);
		if (state.queueIndex === -1) state.queueIndex = 0;
	} else {
		state.queue = [track];
		state.queueIndex = 0;
	}

	if (state.isShuffled) {
		shuffleQueue();
	}

	notifyState();
	await playTrack(track);
}

export async function togglePlay(): Promise<void> {
	initAudio();
	if (!audio) return;

	if (state.isPlaying || state.isLoading) {
		skipAborted = true;
		audio.pause();
		state.isLoading = false;
		notifyState();
	} else {
		if (audio.src) {
			try { await audio.play(); } catch { /* AbortError/NotAllowedError in background */ }
		} else if (state.queue.length > 0) {
			state.queueIndex = 0;
			notifyState();
			await playTrack(state.queue[0]);
		}
	}
}

export async function skipPrevious(): Promise<void> {
	initAudio();
	if (!audio) return;

	if (audio.currentTime >= 4) {
		audio.currentTime = 0;
		return;
	}

	const prevIndex = state.queueIndex - 1;
	if (prevIndex >= 0) {
		state.queueIndex = prevIndex;
		notifyState();
		await playTrack(state.queue[prevIndex]);
	} else if (state.queue.length > 0) {
		state.queueIndex = state.queue.length - 1;
		notifyState();
		await playTrack(state.queue[state.queue.length - 1]);
	}
}

export async function skipNext(): Promise<void> {
	initAudio();
	if (!audio) return;

	const nextIndex = state.queueIndex + 1;
	if (nextIndex < state.queue.length) {
		state.queueIndex = nextIndex;
		notifyState();
		await playTrack(state.queue[nextIndex]);
	} else if (state.repeatMode === 1 && state.queue.length > 0) {
		state.queueIndex = 0;
		notifyState();
		await playTrack(state.queue[0]);
	}
}


export function setVolume(val: number): void {
	initAudio();
	if (!audio) return;
	audio.volume = val;
	state.volume = val;
	if (typeof localStorage !== 'undefined') {
		localStorage.setItem(VOLUME_STORAGE_KEY, String(val));
	}
	notifyState();
}

export function toggleShuffle(): void {
	if (state.queue.length <= 1) return;

	state.isShuffled = !state.isShuffled;
	if (state.isShuffled) {
		state.repeatMode = 0;
		shuffleQueue();
	}
	notifyState();
}

function shuffleQueue(): void {
	if (state.queue.length <= 1) return;

	const current = state.queue[state.queueIndex];
	const remaining = state.queue.filter((_, i) => i !== state.queueIndex);

	for (let i = remaining.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[remaining[i], remaining[j]] = [remaining[j], remaining[i]];
	}

	state.queue = [current, ...remaining];
	state.queueIndex = 0;
}

export function cycleRepeat(): void {
	state.repeatMode = ((state.repeatMode + 1) % 3) as RepeatMode;
	if (state.repeatMode !== 0) {
		state.isShuffled = false;
	}
	notifyState();
}

export function playQueueItem(index: number): void {
	if (index < 0 || index >= state.queue.length) return;
	state.queueIndex = index;
	notifyState();
	playTrack(state.queue[index]);
}

export function removeFromQueue(index: number): void {
	if (index < 0 || index >= state.queue.length) return;
	state.queue.splice(index, 1);
	if (state.queue.length === 0) {
		state.queueIndex = -1;
		state.currentTrack = null;
		state.isPlaying = false;
		if (audio) {
			audio.pause();
			audio.src = '';
		}
	} else if (index < state.queueIndex) {
		state.queueIndex--;
	} else if (index === state.queueIndex) {
		if (state.queueIndex >= state.queue.length) {
			state.queueIndex = state.queue.length - 1;
		}
		playTrack(state.queue[state.queueIndex]);
	}
	notifyState();
}

export function clearQueue(): void {
	state.queue = [];
	state.queueIndex = -1;
	progress.playbackTime = 0;
	progress.playbackDuration = 0;
	progress.playbackProgress = 0;
	state.isLoading = false;

	if (audio) {
		audio.pause();
		audio.removeAttribute('src');
		audio.load();
	}
	state.currentTrack = null;
	state.isPlaying = false;
	notifyState();
	notifyProgress();
}

export function seekTo(time: number): void {
	initAudio();
	if (!audio || !isFinite(time)) return;
	audio.currentTime = time;
	progress.playbackTime = time;
	if (progress.playbackDuration > 0) {
		progress.playbackProgress = (time / progress.playbackDuration) * 100;
	}
	notifyProgress();
}

export function getCurrentTime(): number {
	if (!audio) return 0;
	return audio.currentTime;
}

export function isAudioPlaying(): boolean {
	if (!audio) return false;
	return !audio.paused && !audio.ended;
}

export async function toggleLikeCurrentTrack(): Promise<void> {
	const track = state.currentTrack;
	if (!track || !track.emosId) return;
	const newLiked = !track.isLiked;
	try {
		const ok = await likeSong(track.emosId, newLiked);
		if (ok) {
			track.isLiked = newLiked;
			if (state.queueIndex >= 0 && state.queueIndex < state.queue.length) {
				state.queue[state.queueIndex].isLiked = newLiked;
			}
			notifyState();
		}
	} catch {
		console.warn('Failed to toggle like for track', track.title);
	}
}

// FM mode removed - EMOS API does not support personalized FM

export async function playAlbumById(albumId: number): Promise<void> {
	if (!canPlay()) return;
	try {
		const album = await getAlbumDetail(albumId);
		if (album.songs?.length) playSong(album.songs[0], album.songs);
	} catch (e) {
		console.warn('Failed to play album:', e);
	}
}

export async function playPlaylistById(playlistId: number): Promise<void> {
	if (!canPlay()) return;
	try {
		const data = await getPlaylistDetail(playlistId);
		if (data.playlist.tracks.length > 0) playSong(data.playlist.tracks[0], data.playlist.tracks);
	} catch (e) {
		console.warn('Failed to play playlist:', e);
	}
}
