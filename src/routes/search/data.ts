import { cloudsearch, getArtworkUrl } from '$lib/services/emos';
import { ARTWORK_SIZE } from '$lib/utils/constants';
import { concurrentLimit } from '$lib/utils/concurrent';
import { playSong, playAlbumById, playPlaylistById } from '$lib/stores/player';
import type { EmosArtist, EmosArtistAlbum, EmosSong, EmosPlaylist } from '$lib/types/emos';
import { getSearchCache, setSearchCache } from './search-cache';

export interface SearchResults {
	artists: EmosArtist[];
	artistsHasMore: boolean;
	albums: EmosArtistAlbum[];
	albumsHasMore: boolean;
	songs: EmosSong[];
	songsHasMore: boolean;
	playlists: EmosPlaylist[];
	playlistsHasMore: boolean;
}

export interface TopResultItem {
	kind: string;
	name: string;
	subtitle: string;
	imageUrl: string;
	linkHref: string;
	onPlay?: () => void;
}

const emptyResults: SearchResults = {
	artists: [], artistsHasMore: false,
	albums: [], albumsHasMore: false,
	songs: [], songsHasMore: false,
	playlists: [], playlistsHasMore: false
};

export function getEmptyResults(): SearchResults {
	return { ...emptyResults };
}

export async function loadSearchResults(q: string): Promise<SearchResults> {
	const cached = getSearchCache(q);
	if (cached) return cached;

	const r = { ...emptyResults };

	const coreTasks = [
		() => cloudsearch(q, 21, 100),
		() => cloudsearch(q, 21, 10),
		() => cloudsearch(q, 21, 1),
		() => cloudsearch(q, 21, 1000)
	];
	const [artistData, albumData, songData, playlistData] = await concurrentLimit(coreTasks, 3);

	r.artists = artistData.artists ?? [];
	r.artistsHasMore = artistData.hasMore ?? false;
	r.albums = albumData.albums ?? [];
	r.albumsHasMore = r.albums.length < (albumData.albumCount ?? 0);
	r.songs = songData.songs ?? [];
	r.songsHasMore = songData.hasMore ?? (r.songs.length < (songData.songCount ?? 0));
	r.playlists = playlistData.playlists ?? [];
	r.playlistsHasMore = playlistData.hasMore ?? (r.playlists.length < (playlistData.playlistCount ?? 0));

	setSearchCache(q, r);
	return r;
}

export function buildTopResults(r: SearchResults): TopResultItem[] {
	const items: TopResultItem[] = [];
	for (const a of r.artists.slice(0, 1)) items.push({
		kind: 'artist', name: a.name,
		subtitle: '艺人',
		imageUrl: getArtworkUrl(a.picUrl || a.img1v1Url || '', ARTWORK_SIZE.SMALL),
		linkHref: `/artist/${encodeURIComponent(a.name)}/${a.id}`
	});
	for (const s of r.songs.slice(0, 2)) items.push({
		kind: 'song', name: s.name,
		subtitle: `歌曲\u00B7${s.ar?.map(a => a.name).join(' / ') ?? ''}`,
		imageUrl: getArtworkUrl(s.al?.picUrl ?? '', ARTWORK_SIZE.SMALL),
		linkHref: `/song/${s.id}`,
		onPlay: () => playSong(s, r.songs)
	});
	for (const a of r.albums.slice(0, 1)) items.push({
		kind: 'album', name: a.name,
		subtitle: `专辑\u00B7${a.artist?.name ?? ''}`,
		imageUrl: getArtworkUrl(a.picUrl, ARTWORK_SIZE.SMALL),
		linkHref: `/album/${a.id}`,
		onPlay: () => playAlbumById(a.id)
	});
	for (const p of r.playlists.slice(0, 1)) items.push({
		kind: 'playlist', name: p.name,
		subtitle: '歌单',
		imageUrl: getArtworkUrl(p.coverImgUrl ?? '', ARTWORK_SIZE.SMALL),
		linkHref: `/playlist/${p.id}`,
		onPlay: () => playPlaylistById(p.id)
	});
	return items;
}

export function hasAnyResult(r: SearchResults): boolean {
	return r.artists.length > 0 || r.albums.length > 0 || r.songs.length > 0 || r.playlists.length > 0;
}

export function findResultByHref(href: string, r: SearchResults): { type: 'playlist' | 'artist' | 'album' | 'song'; id: number; name: string; imageUrl: string; subtitle: string } | null {
	const albumMatch = href.match(/^\/album\/(\d+)$/);
	if (albumMatch) {
		const album = r.albums.find(a => a.id === Number(albumMatch[1]));
		if (album) return { type: 'album', id: album.id, name: album.name, imageUrl: album.picUrl, subtitle: album.artist?.name ?? '' };
	}
	const songMatch = href.match(/^\/song\/(\d+)$/);
	if (songMatch) {
		const song = r.songs.find(s => s.id === Number(songMatch[1]));
		if (song) return { type: 'song', id: song.id, name: song.name, imageUrl: song.al?.picUrl ?? '', subtitle: song.ar?.map(a => a.name).join(' / ') ?? '' };
	}
	const playlistMatch = href.match(/^\/playlist\/(\d+)$/);
	if (playlistMatch) {
		const pl = r.playlists.find(p => p.id === Number(playlistMatch[1]));
		if (pl) return { type: 'playlist', id: pl.id, name: pl.name, imageUrl: pl.coverImgUrl, subtitle: pl.creator?.nickname ?? '' };
	}
	const artistMatch = href.match(/^\/artist\/(.+?)\/(\d+)$/);
	if (artistMatch) {
		const artist = r.artists.find(a => a.id === Number(artistMatch[2]));
		if (artist) return { type: 'artist', id: artist.id, name: artist.name, imageUrl: artist.picUrl || artist.img1v1Url || '', subtitle: '艺人' };
	}
	return null;
}
