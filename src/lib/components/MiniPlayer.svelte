<script lang="ts">
	import '$lib/styles/mini-player.css';
	import { ICONS } from '$lib/utils/constants';
	import type { PlayerState } from '$lib/stores/player';

	interface Props {
		playerState: PlayerState;
		progressValue: number;
		showPause: boolean;
		onTogglePlay: () => void;
		onSkipNext: () => void;
		onOpenFullPlayer: () => void;
	}

	let { playerState, progressValue, showPause, onTogglePlay, onSkipNext, onOpenFullPlayer }: Props = $props();
</script>

<div class="mini-player" class:is-empty={!playerState.currentTrack}>
	<div class="mini-player__body">
		<button class="mini-player__metadata mini-player__metadata-button" data-testid="mini-player-metadata" onclick={onOpenFullPlayer}>
			<div class="mini-player__artwork">
				{#if playerState.currentTrack?.artworkUrl}
					<img src={playerState.currentTrack.artworkUrl} alt="" width="32" height="32" />
				{:else}
					<svg class="mini-player__artwork-placeholder" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
						<g fill="none" fill-rule="evenodd">
							<path fill="var(--genericJoeColor)" d="M0 0h100v100H0z"></path>
							<path fill="var(--playerMissingArtworkIcon)" d={ICONS.MUSIC_NOTE} fill-rule="nonzero"></path>
						</g>
					</svg>
				{/if}
			</div>
			<div class="mini-player__metadata--text">
				<div class="mini-player__text--primary"><div class="mini-player__clamp-wrapper">{playerState.currentTrack?.title ?? ''}</div></div>
				<div class="mini-player__text--subtitle"><div class="mini-player__clamp-wrapper">{playerState.currentTrack?.artist ?? ''}</div></div>
			</div>
		</button>
		<div class="mini-player__controls">
			<button class="playback-play__play" disabled={!playerState.currentTrack || undefined} aria-label="播放" aria-hidden={showPause ? 'true' : undefined} tabindex={showPause ? -1 : undefined} onclick={onTogglePlay}>
				<svg viewBox="0 0 32 28" xmlns="http://www.w3.org/2000/svg"><path d={ICONS.PLAY} fill-rule="nonzero"></path></svg>
				<span class="button__label">播放</span>
			</button>
			<button class="playback-play__pause" aria-label="暂停" aria-hidden={showPause ? undefined : 'true'} tabindex={showPause ? undefined : -1} onclick={onTogglePlay}>
				<svg viewBox="0 0 32 28" xmlns="http://www.w3.org/2000/svg"><path d={ICONS.PAUSE} fill-rule="nonzero"></path></svg>
				<span class="button__label">暂停</span>
			</button>
			<button class="button--next" disabled={playerState.queue.length === 0 || undefined} aria-label="下一首" onclick={onSkipNext}>
				<svg viewBox="0 0 32 28" xmlns="http://www.w3.org/2000/svg"><path d={ICONS.SKIP_FORWARD} fill-rule="nonzero"></path></svg>
				<span class="button__label">下一首</span>
			</button>
		</div>
	</div>
</div>