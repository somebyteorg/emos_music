<script lang="ts">
	import type { EmosSong } from '$lib/types/emos';
	import { getArtworkUrl } from '$lib/services/emos';
	import { ARTWORK_SIZE, ICONS } from '$lib/utils/constants';
	import { formatDuration } from '$lib/utils/format';
	import { isEmosLoggedIn, subscribeEmosAuth } from '$lib/stores/emos-auth';
	import { favoriteIds, getFavoriteStore } from '$lib/stores/favorite-store';
	import '$lib/styles/songs-list.css';
	import '$lib/styles/interactive-buttons.css';

	import '$lib/styles/artwork-component.css';

	type Variant = 'album' | 'playlist' | 'track';

	interface SongItem {
		id: number;
		name: string;
		artists: { id: number; name: string }[];
		album?: { id: number; name: string; picUrl?: string };
		duration: number;
		popularity?: number;
		subtitle?: string;
	}

	interface Props {
		variant: Variant;
		songs: SongItem[];
		onSongMenu?: (e: MouseEvent, songId: number) => void;
		onPlay?: (songId: number) => void;
		hideHeader?: boolean;
		showFavorite?: boolean;
		songLinkPrefix?: string;
		artistLinkPrefix?: string;
		albumLinkPrefix?: string;
	}

	let {
		variant,
		songs,
		onSongMenu,
		onPlay,
		hideHeader = false,
		showFavorite: showFavoriteProp,
		songLinkPrefix = '/song',
		artistLinkPrefix = '/artist',
		albumLinkPrefix = '/album'
	}: Props = $props();

	let emosLoggedIn = $state(isEmosLoggedIn());
	const favStore = getFavoriteStore();
	let favIds = $state<Set<number>>(new Set());

	$effect(() => {
		const unsub = favoriteIds.subscribe((ids) => { favIds = ids; });
		return unsub;
	});


	$effect(() => {
		const unsub = subscribeEmosAuth((user) => {
			emosLoggedIn = user !== null;
		});
		return () => { unsub(); };
	});

	let isAlbum = $derived(variant === 'album');
	let isPlaylist = $derived(variant === 'playlist');
	let isTrack = $derived(variant === 'track');
	let showArtwork = $derived(isPlaylist || isTrack);
	let showSecondary = $derived(isPlaylist);
	let showTertiary = $derived(isPlaylist);
	let showHeader = $derived(isPlaylist && !hideHeader);
	let showFavorite = $derived(emosLoggedIn && (showFavoriteProp ?? isPlaylist));
	let showDuration = $derived(!isTrack);

	function getSubtitle(song: SongItem): string {
		if (song.subtitle) return song.subtitle;
		const artistNames = song.artists.map(a => a.name).join(' / ');
		return artistNames;
	}
</script>

<div class="songs-list songs-list--header-is-visible songs-list--has-preview {isPlaylist ? 'songs-list--playlist' : ''} {isAlbum ? 'songs-list--album' : ''} {isTrack ? 'songs-list--track' : ''}" role="grid" draggable="true">
	{#if showHeader}
		<div class="songs-list__header songs-list__header--is-visible" aria-hidden="true" role="row">
			<div class="songs-list__col songs-list__col--favorite-or-popular songs-list__header-col songs-list__header-col--favorite-or-popular" role="columnheader">
				<div class="songs-list__header-col-label songs-list__header-col-label--favorite-or-popular"></div>
			</div>
			<div class="songs-list__col songs-list__col--song songs-list__header-col songs-list__header-col--song" role="columnheader">
				<div class="songs-list__header-col-label songs-list__header-col-label--song">歌曲</div>
			</div>
			{#if showSecondary}
				<div class="songs-list__col songs-list__col--secondary songs-list__header-col songs-list__header-col--secondary" role="columnheader">
					<div class="songs-list__header-col-label">艺人</div>
				</div>
			{/if}
			{#if showTertiary}
				<div class="songs-list__col songs-list__col--tertiary songs-list__header-col songs-list__header-col--tertiary" role="columnheader">
					<div class="songs-list__header-col-label">专辑</div>
				</div>
			{/if}
			<div class="songs-list__col songs-list__col--time songs-list__header-col songs-list__header-col--time" role="columnheader">
				<div class="songs-list__header-col-label songs-list__header-col-label--time">时长</div>
			</div>
		</div>
	{/if}
	{#each songs as song, i (song.id)}
		<div class="songs-list-row {showArtwork ? 'songs-list-row--artwork' : 'songs-list-row--no-artwork'} songs-list-row--two-lines {isPlaylist ? 'songs-list-row--playlist' : ''} {isAlbum ? 'songs-list-row--album' : ''} {isTrack ? 'songs-list-row--track' : ''} songs-list-row--preview" role="row" tabindex="0" data-row={i}>
			{#if !isTrack}
				<div class="songs-list__col songs-list__col--favorite-or-popular">
					<div class="favorite-or-popular">
						{#if isAlbum && song.popularity && song.popularity >= 70}
							<div class="popular" role="img" aria-label="热门曲目">
								<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="6" height="6">
									<path d={ICONS.POPULAR_DOT} />
								</svg>
							</div>
						{/if}
						{#if showFavorite}
							<div class="favorite">
								<button class="favorite-button favorite-button--non-platter" class:is-favorited={favIds.has(song.id)} onclick={() => favStore.toggleFavorite(song.id)} aria-label={favIds.has(song.id) ? '取消收藏' : '收藏'}>
									<svg width="64" height="64" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" class="favorite-icon">
										<path class="favorite-icon__star" d={favIds.has(song.id) ? ICONS.STAR_FILLED : ICONS.STAR} />
									</svg>
								</button>
							</div>
						{/if}
					</div>
				</div>
			{/if}
			<div class="songs-list__col songs-list__col--song">
				<div class="songs-list-row__song-container">
					{#if showArtwork && song.album?.picUrl}
						<div class="songs-list-row__song-index">
							<div class="artwork-with-badge">
								<div class="artwork-with-badge__artwork">
									<div class="artwork-component artwork-component--aspect-ratio artwork-component--orientation-square artwork-component--has-borders">
										<img alt="" class="artwork-component__image" loading="lazy"
											src={getArtworkUrl(song.album.picUrl, ARTWORK_SIZE.THUMBNAIL)}
											role="presentation" decoding="async" width="40" height="40" />
									</div>
								</div>
							</div>
							<div class="songs-list-row__play-button-wrapper">
								<div class="interactive-play-button">
									<button class="play-button play-button--standard" aria-label="播放" onclick={() => onPlay?.(song.id)}>
										<svg width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" class="icon">
										<path fill="currentColor" d={ICONS.PLAY_SMALL} />
									</svg>
									</button>
							</div>
						</div>
					</div>
					{:else if isAlbum}
						<div class="songs-list-row__song-index">
							<div class="songs-list-row__column-data" data-testid="track-number">{i + 1}</div>
							<div class="songs-list-row__play-button-wrapper">
							<div class="interactive-play-button">
								<button class="play-button play-button--standard" aria-label="播放" onclick={() => onPlay?.(song.id)}>
									<svg width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" class="icon">
										<path fill="currentColor" d={ICONS.PLAY_SMALL} />
									</svg>
								</button>
							</div>
							</div>
						</div>
					{/if}
					<div class="songs-list-row__song-wrapper">
						<div class="songs-list-row__song-name-wrapper">
							<a class="click-action" href="{songLinkPrefix}/{song.id}">
								<div class="songs-list-row__song-name" dir="auto" role="checkbox" tabindex="-1">{song.name}</div>
							</a>
							{#if isTrack}
								<div class="songs-list-row__by-line songs-list-row__by-line__mobile">
									<span>{getSubtitle(song)}</span>
								</div>
							{:else if isPlaylist}
								<div class="songs-list-row__by-line songs-list-row__by-line__mobile">
									<span>{song.artists.map((a, i) => `${i > 0 ? ' / ' : ''}${a.name}`).join('')}</span>
								</div>
							{/if}
						</div>
					</div>
				</div>
			</div>
			{#if showSecondary}
				<div class="songs-list__col songs-list__col--secondary">
					<span>{#each song.artists as a, i}{#if i > 0} / {/if}<a class="click-action" href="{artistLinkPrefix}/{encodeURIComponent(a.name)}/{a.id}">{a.name}</a>{/each}</span>
				</div>
			{/if}
			{#if showTertiary && song.album}
				<div class="songs-list__col songs-list__col--tertiary">
					<span><a class="click-action" href="{albumLinkPrefix}/{song.album.id}">{song.album.name}</a></span>
				</div>
			{/if}
			<div class="songs-list__col songs-list__col--time">
				<div class="songs-list-row__controls">
					{#if isPlaylist}
						<div class="songs-list-row__add-to-library"></div>
					{/if}
					<div class="songs-list-row__preview-button">
						<button type="button" aria-label="播放" onclick={() => onPlay?.(song.id)}>
							播放
						</button>
					</div>
					{#if showDuration}
						<time class="songs-list-row__length" datetime="PT{Math.floor(song.duration / 1000 / 60)}M{Math.floor(song.duration / 1000 % 60)}S">{formatDuration(song.duration)}</time>
					{/if}
					<div class="songs-list-row__context-menu">
						<button class="contextual-menu__trigger" type="button" aria-label="更多" aria-haspopup="true" onclick={(e) => onSongMenu?.(e, song.id)}>
							<span aria-label="更多" class="more-button more-button--non-platter">
								<svg width="28" height="28" viewBox="0 0 28 28" class="glyph" xmlns="http://www.w3.org/2000/svg">
									<path fill="var(--iconEllipsisFill, white)" d={ICONS.ELLIPSIS}></path>
								</svg>
							</span>
						</button>
					</div>
				</div>
			</div>
		</div>
	{/each}
</div>


