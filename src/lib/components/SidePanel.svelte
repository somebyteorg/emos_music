<script lang="ts">
	import '$lib/styles/side-panel.css';
	import { ICONS } from '$lib/utils/constants';
	import type { PlayerState } from '$lib/stores/player';
	import type { EmosLyricLine } from '$lib/types/emos';

	interface QueueItem {
		id: string;
		title: string;
		subtitle: string;
		artworkUrl?: string;
		duration?: string;
		isPlaying?: boolean;
	}

	interface Props {
		activePanel: 'lyrics' | 'upnext' | null;
		playerState: PlayerState;
		queueItems: QueueItem[];
		isQueueEmpty: boolean;
		lyricLines: EmosLyricLine[];
		activeLyricIndex: number;
		onPlayQueueItem: (index: number) => void;
		onRemoveFromQueue: (index: number) => void;
		onClearQueue: () => void;
		onSeekTo: (time: number) => void;
		onOpenQueueItemMenu: (e: MouseEvent, index: number) => void;
	}

	let {
		activePanel,
		playerState,
		queueItems,
		isQueueEmpty,
		lyricLines,
		activeLyricIndex,
		onPlayQueueItem,
		onRemoveFromQueue,
		onClearQueue,
		onSeekTo,
		onOpenQueueItemMenu
	}: Props = $props();

	let lyricsPanelRef: HTMLElement | undefined = $state();

	$effect(() => {
		if (activePanel !== 'lyrics' || !lyricsPanelRef || activeLyricIndex < 0) return;
		const activeLine = lyricsPanelRef.children[activeLyricIndex] as HTMLElement | undefined;
		if (activeLine) {
			activeLine.scrollIntoView({ behavior: 'instant', block: 'center' });
		}
	});
</script>

<div class="side-panel" class:side-panel--open={activePanel !== null} id="side-panel" aria-hidden={activePanel === null}>
	{#if activePanel === 'upnext'}
		<div class="side-panel-header-wrapper">
			<div class="side-panel-header">
				<h3 id="side-panel-heading" data-testid="side-panel-header">待播清单</h3>
				<div class="side-panel-controls" data-testid="side-panel-controls">
					{#if !isQueueEmpty}
						<button class="side-panel-controls__clear" data-testid="up-next-clear" aria-label="清除待播清单" onclick={onClearQueue}>清除</button>
					{/if}
				</div>
			</div>
		</div>
		{#if !isQueueEmpty}
			<div class="side-panel-content">
				<div class="up-next-queue" data-testid="up-next-queue">
					{#if queueItems.length > 0}
						<div role="list">
							{#each queueItems as item, i (item.id)}
								<div class="up-next-item" class:selected={item.isPlaying} role="presentation" data-testid="up-next-item" onclick={() => onPlayQueueItem(i)} onkeydown={() => {}}>
									<div class="artwork-wrapper">
										{#if item.artworkUrl}
											<img src={item.artworkUrl} alt="" width="40" height="40" />
										{/if}
									</div>
									<button class="up-next-item__remove" aria-label="从待播清单移除" onclick={(e) => { e.stopPropagation(); onRemoveFromQueue(i); }}>
										<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d={ICONS.MINUS} fill="currentColor" fill-rule="nonzero"></path></svg>
									</button>
									<div class="up-next-item-title" data-testid="up-next-item-title">
										<div class="title">{item.title}</div>
										<div class="subtitle" data-testid="up-next-item-subtitle">{item.subtitle}</div>
									</div>
									<div class="time-and-controls">
										{#if item.duration}
											<span class="up-next-item-time" data-testid="up-next-item-duration">{item.duration}</span>
										{/if}
										<div class="controls">
											<button class="up-next-item__more" aria-label="更多" onclick={(e) => { e.stopPropagation(); onOpenQueueItemMenu(e, i); }}>
												<svg viewBox="0 0 28 28" xmlns="http://www.w3.org/2000/svg"><path d={ICONS.ELLIPSIS} fill="currentColor"></path></svg>
											</button>
										</div>
									</div>
								</div>
							{/each}
						</div>
					{/if}
				</div>
			</div>
		{:else}
			<div class="side-panel-empty" data-testid="side-panel-empty">
				<div class="up-next-queue__empty" data-testid="up-next-empty">
					无待播歌曲。
				</div>
			</div>
		{/if}
	{:else if activePanel === 'lyrics'}
		<div class="side-panel-content lyrics-panel__content">
			{#if lyricLines.length > 0}
				<div class="lyrics-panel" data-testid="lyrics-panel" bind:this={lyricsPanelRef}>
					{#each lyricLines as line, i (i)}
						<div class="lyrics-panel__line" class:lyrics-panel__line--active={i === activeLyricIndex} class:lyrics-panel__line--past={i < activeLyricIndex} onclick={() => onSeekTo(line.time)}>
							<span class="lyrics-panel__text">{line.text}</span>
							{#if line.translation}
								<span class="lyrics-panel__translation">{line.translation}</span>
							{/if}
						</div>
					{/each}
				</div>
			{:else}
				<div class="side-panel-empty" data-testid="side-panel-empty">
					<div class="lyrics__empty">
					<p class="lyrics__empty-title">歌词不可用</p>
					<p>当前歌曲暂无歌词</p>
				</div>
				</div>
			{/if}
		</div>
	{/if}
</div>