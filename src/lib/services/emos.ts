import type {
	EmosAlbum,
	EmosArtist,
	EmosArtistAlbum,
	EmosCloudSearchResult,
	EmosLyric,
	EmosLyricLine,
	EmosPlaylist,
	EmosSong,
	EmosYrcLine,
	EmosYrcWord,
	SongCredit
} from '$lib/types/emos';
import { getEmosToken, getEmosUser } from '$lib/stores/emos-auth';

const BASE_URL = '/api/emos';
const EMOS_ORIGIN = import.meta.env.VITE_EMOS_ORIGIN || import.meta.env.VITE_EMOS_API_URL?.replace(/\/api\/?$/, '') || '';
const REQUEST_TIMEOUT = 15_000;

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
type RequestParams = Record<string, string | number | boolean | null | undefined>;

interface EmosPage<T> {
	page: number;
	page_size: number;
	total: number;
	items: T[];
}

interface EmosPerson {
	person_id: number | null;
	name: string;
	original_name?: string | null;
	biography?: string | null;
	image_profile?: string | null;
	image_profile_url?: string | null;
	image_backdrop?: string | null;
	image_backdrop_url?: string | null;
	is_adult?: boolean | null;
	is_virtual?: boolean | number | null;
}

interface EmosAlbumRef {
	album_id?: number;
	todb_music_album_id?: number;
	name: string;
	image_poster_url?: string | null;
}

interface EmosSongRaw {
	song_id: number;
	todb_music_song_id?: number | null;
	todb_music_music_id?: number | null;
	name: string;
	image_poster_url?: string | null;
	description?: string | null;
	tagline?: string | null;
	release_date?: string | null;
	duration?: number | null;
	video_list_id?: number | null;
	rating?: number | null;
	rating_user?: number | null;
	has_media?: boolean | null;
	is_favorite?: boolean | null;
	person_artists?: EmosPerson[];
	albums?: EmosAlbumRef[];
	count_medias?: number;
	count_lryics?: number;
}

interface EmosAlbumRaw {
	album_id: number;
	name: string;
	description?: string | null;
	image_poster_url?: string | null;
	image_background_url?: string | null;
	tagline?: string | null;
	release_date?: string | null;
	release_company?: string | null;
	video_list_id?: number | null;
	type?: string | null;
	rating?: number | null;
	rating_user?: number | null;
	has_media?: boolean | null;
	person_artists?: EmosPerson[];
	is_favorite?: boolean | null;
	count_song?: number;
}

interface EmosLyricRaw {
	lyric_id: number;
	type: 'text' | 'lrc' | 'qrc' | string;
	language: string;
	content: string;
	name?: string;
	created_at?: string;
}

interface EmosMedia {
	media_id: string;
	file_suffix?: string;
	file_type?: string;
	file_size?: number;
	file_duration?: number;
	file_quality?: string;
	is_primary?: boolean;
	name?: string;
}

interface EmosSignStatus {
	is_sign: boolean;
	user_id?: string;
}

interface EmosUserInfo {
	user_id?: string;
	username?: string;
	pseudonym?: string;
	avatar?: string;
}

const pendingRequests = new Map<string, Promise<unknown>>();

function getOrigin(): string {
	if (typeof window !== 'undefined') return window.location.origin;
	return 'http://localhost:5173';
}

function toQuery(params: RequestParams): URLSearchParams {
	const query = new URLSearchParams();
	for (const [key, value] of Object.entries(params)) {
		if (value === undefined || value === null || value === '') continue;
		query.set(key, String(value));
	}
	return query;
}

async function request<T>(path: string, params: RequestParams = {}, method: HttpMethod = 'GET'): Promise<T> {
	const isBodyMethod = method === 'POST' || method === 'PATCH';
	const url = new URL(BASE_URL + path, getOrigin());
	const query = toQuery(params);
	const cacheKey = `${method}:${path}?${query.toString()}`;

	if (method === 'GET' && pendingRequests.has(cacheKey)) {
		return pendingRequests.get(cacheKey) as Promise<T>;
	}

	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
	const headers: Record<string, string> = {};
	const token = getEmosToken();
	if (token) headers.Authorization = `Bearer ${token}`;
	const init: RequestInit = {
		method,
		signal: controller.signal,
		headers,
		credentials: 'include'
	};

	if (isBodyMethod) {
		headers['Content-Type'] = 'application/json';
		init.body = JSON.stringify(Object.fromEntries(query));
	} else {
		for (const [key, value] of query) url.searchParams.set(key, value);
	}

	const promise = fetch(url, init)
		.then(async (res) => {
			if (!res.ok) {
				let detail = '';
				try {
					const body = await res.text();
					const parsed = JSON.parse(body) as { message?: string; error?: string };
					detail = parsed.message || parsed.error || '';
				} catch {
					// 非 JSON 响应体，忽略
				}
				throw new Error(detail || `EMOS API error: ${res.status}`);
			}
			if (res.status === 204) return null as T;
			return await res.json() as T;
		})
		.catch((err: unknown) => {
			if (err instanceof Error && err.name === 'AbortError') throw new Error(`EMOS API timeout: ${path}`);
			throw err;
		})
		.finally(() => {
			clearTimeout(timer);
			if (method === 'GET') pendingRequests.delete(cacheKey);
		});

	if (method === 'GET') pendingRequests.set(cacheKey, promise);
	return promise;
}

// --- Data mapping helpers ---

function parseDateMs(date?: string | null): number {
	if (!date) return 0;
	const time = new Date(date).getTime();
	return Number.isFinite(time) ? time : 0;
}

function getPersonId(person?: EmosPerson): number {
	return person?.person_id ?? 0;
}

function getPersonImage(person?: EmosPerson): string {
	return person?.image_profile_url ?? person?.image_profile ?? person?.image_backdrop_url ?? person?.image_backdrop ?? '';
}

function albumImage(album?: EmosAlbumRaw | EmosAlbumRef | null): string {
	return album?.image_poster_url ?? '';
}

function mapSong(song: EmosSongRaw): EmosSong {
	const firstAlbum = song.albums?.[0];
	const artists = song.person_artists ?? [];
	return {
		id: song.song_id,
		name: song.name,
		ar: artists.map((artist) => ({ id: getPersonId(artist), name: artist.name })),
		al: {
			id: firstAlbum?.album_id ?? firstAlbum?.todb_music_album_id ?? 0,
			name: firstAlbum?.name ?? '',
			picUrl: song.image_poster_url ?? albumImage(firstAlbum)
		},
		dt: (song.duration ?? 0) * 1000,
		fee: 0,
		pop: song.rating ?? song.rating_user ?? 0,
		publishTime: parseDateMs(song.release_date)
	};
}

function mapArtist(person: EmosPerson): EmosArtist {
	return {
		id: getPersonId(person),
		name: person.name,
		picUrl: getPersonImage(person),
		img1v1Url: getPersonImage(person),
		cover: person.image_backdrop_url ?? person.image_backdrop ?? getPersonImage(person),
		albumSize: 0,
		briefDesc: person.biography ?? '',
		isSub: false
	};
}

function mapAlbumSummary(album: EmosAlbumRaw): EmosArtistAlbum {
	const firstArtist = album.person_artists?.[0];
	return {
		id: album.album_id,
		name: album.name,
		picUrl: album.image_poster_url ?? '',
		type: album.type ?? 'album',
		size: album.count_song ?? 0,
		publishTime: parseDateMs(album.release_date),
		artist: firstArtist ? { id: getPersonId(firstArtist), name: firstArtist.name, picUrl: getPersonImage(firstArtist) } : { id: 0, name: '' }
	};
}

function mapPlaylistFromAlbum(album: EmosAlbumRaw): EmosPlaylist {
	const firstArtist = album.person_artists?.[0];
	return {
		id: album.album_id,
		name: album.name,
		coverImgUrl: album.image_poster_url ?? '',
		creator: { nickname: firstArtist?.name ?? 'EMOS', userId: getPersonId(firstArtist) },
		description: album.description ?? album.tagline ?? '',
		tags: [album.type ?? 'album'].filter(Boolean),
		playCount: 0,
		trackCount: album.count_song ?? 0,
		subscribed: album.is_favorite ?? false
	};
}

function pageSize(limit: number): number {
	return Math.max(1, Math.min(limit, 100));
}

function pageFromOffset(limit: number, offset: number): number {
	return Math.floor(offset / pageSize(limit)) + 1;
}

// --- Internal API helpers ---

async function listSongs(limit = 30, offset = 0, params: RequestParams = {}): Promise<EmosPage<EmosSongRaw>> {
	return request<EmosPage<EmosSongRaw>>('/music/song/list', {
		page: pageFromOffset(limit, offset),
		page_size: pageSize(limit),
		has_media: 1,
		...params
	});
}

async function searchSongs(keywords: string, limit = 30, offset = 0, params: RequestParams = {}): Promise<EmosPage<EmosSongRaw>> {
	return request<EmosPage<EmosSongRaw>>('/music/song/search', {
		page: pageFromOffset(limit, offset),
		page_size: pageSize(limit),
		name: keywords,
		has_media: 1,
		...params
	});
}

async function listAlbumsRaw(limit = 30, offset = 0, params: RequestParams = {}): Promise<EmosPage<EmosAlbumRaw>> {
	return request<EmosPage<EmosAlbumRaw>>('/music/album/list', {
		page: pageFromOffset(limit, offset),
		page_size: pageSize(limit),
		...params
	});
}

async function listArtists(limit = 30, offset = 0, params: RequestParams = {}): Promise<EmosPage<EmosPerson>> {
	return request<EmosPage<EmosPerson>>('/music/person/list', {
		page: pageFromOffset(limit, offset),
		page_size: pageSize(limit),
		...params
	});
}

// --- Public API ---

export function resetSession(): void {
	pendingRequests.clear();
}

export function getArtworkUrl(picUrl: string, size = 68, height?: number): string {
	if (!picUrl) return '';
	const cleanUrl = picUrl.replace(/^http:/, 'https:');
	if (cleanUrl.includes('image.theotherdb.org/original/')) {
		return cleanUrl.replace('/original/', `/w${Math.max(size, height ?? size)}/`);
	}
	const match = cleanUrl.match(/^https?:\/\/[a-z0-9-]+\.music\.126\.net\//);
	if (match) {
		const h = height ?? size;
		const sep = cleanUrl.includes('?') ? '&' : '?';
		return cleanUrl + `${sep}param=${size}x${h}`;
	}
	return cleanUrl;
}

// --- Song APIs ---

export async function getSongDetail(id: number): Promise<EmosSong> {
	const data = await listSongs(1, 0, { song_id: id });
	const song = data.items[0];
	if (!song) throw new Error('歌曲不存在');
	return mapSong(song);
}

export async function getSongPlayUrl(id: number): Promise<string | null> {
	const mediaList = await request<EmosMedia[]>(`/music/song/${id}/media/list`);
	const media = mediaList.find((item) => item.is_primary) ?? mediaList[0];
	if (!media) return null;
	const result = await request<{ url: string }>(`/music/song/${id}/media/playUrl`, { media_id: media.media_id });
	return result.url || null;
}

// --- Lyric APIs ---

const lyricCache = new Map<number, { data: EmosLyric; fetchedAt: number }>();
const LYRIC_CACHE_TTL = 12 * 60 * 60 * 1000; // 12 小时

export async function getLyric(id: number): Promise<EmosLyric> {
	const cached = lyricCache.get(id);
	if (cached && Date.now() - cached.fetchedAt < LYRIC_CACHE_TTL) {
		return cached.data;
	}
	const lyrics = await request<EmosLyricRaw[]>(`/music/song/${id}/lyric/list`);
	const lrc = lyrics.find((item) => item.type === 'lrc') ?? lyrics.find((item) => item.type === 'qrc') ?? lyrics[0];
	const data: EmosLyric = {
		lrc: lrc ? { lyric: lrc.content } : undefined,
		yrc: lyrics.find((item) => item.type === 'qrc') ? { lyric: lyrics.find((item) => item.type === 'qrc')!.content } : undefined,
		code: 200
	};
	lyricCache.set(id, { data, fetchedAt: Date.now() });
	if (lyricCache.size > 500) {
		const oldestKey = lyricCache.keys().next().value;
		if (oldestKey !== undefined) lyricCache.delete(oldestKey);
	}
	return data;
}

export function parseLyricLines(lrcLyric: string, tlyricLyric?: string): EmosLyricLine[] {
	const lines: EmosLyricLine[] = [];
	const translationMap = new Map<number, string>();
	const lineRegex = /^\[(\d{2}):(\d{2})\.(\d{2,3})\]\s*(.*)$/;

	if (tlyricLyric) {
		for (const raw of tlyricLyric.split('\n')) {
			const match = raw.trim().match(lineRegex);
			if (!match) continue;
			const time = parseTimeFromMatch(match);
			const text = match[4].trim();
			if (text) translationMap.set(Math.round(time * 100) / 100, text);
		}
	}

	for (const raw of lrcLyric.split('\n')) {
		const match = raw.trim().match(lineRegex);
		if (!match) continue;
		const text = match[4].trim();
		if (!text) continue;
		const time = Math.round(parseTimeFromMatch(match) * 100) / 100;
		lines.push({ time, text, translation: translationMap.get(time) });
	}

	return lines.sort((a, b) => a.time - b.time);
}

function parseTimeFromMatch(match: RegExpMatchArray): number {
	const min = Number.parseInt(match[1]);
	const sec = Number.parseInt(match[2]);
	const ms = match[3].length === 2 ? Number.parseInt(match[3]) * 10 : Number.parseInt(match[3]);
	return min * 60 + sec + ms / 1000;
}

export function parseYrcLines(yrcLyric: string, tlyricLyric?: string): EmosYrcLine[] {
	return parseLyricLines(yrcLyric, tlyricLyric).map((line): EmosYrcLine => ({
		time: line.time,
		duration: 0,
		words: [{ startTime: line.time * 1000, duration: 0, text: line.text } as EmosYrcWord],
		text: line.text,
		translation: line.translation
	}));
}

export function parseSongCredits(yrcLyric: string): SongCredit[] {
	const credits: SongCredit[] = [];
	const regex = /(?:^|\n)\s*([^：:\n]{2,12})\s*[：:]\s*([^\n]+)/g;
	let match: RegExpExecArray | null;
	while ((match = regex.exec(yrcLyric)) !== null) {
		const role = match[1].trim();
		const artists = match[2].split(/[、/，,]/).map((item) => item.trim()).filter(Boolean);
		if (role && artists.length > 0) credits.push({ role, artists });
	}
	return credits;
}

// --- Album APIs ---

export async function getAlbumDetail(albumId: number): Promise<EmosAlbum> {
	const data = await listAlbumsRaw(1, 0, { album_id: albumId });
	const album = data.items[0];
	if (!album) throw new Error('专辑不存在');
	const songs = await listSongs(100, 0, { album_id: albumId });
	const firstArtist = album.person_artists?.[0];
	return {
		id: album.album_id,
		name: album.name,
		picUrl: album.image_poster_url ?? '',
		artist: firstArtist ? { id: getPersonId(firstArtist), name: firstArtist.name, picUrl: getPersonImage(firstArtist) } : { id: 0, name: '' },
		publishTime: parseDateMs(album.release_date),
		size: album.count_song ?? songs.items.length,
		description: album.description ?? album.tagline ?? '',
		company: album.release_company ?? '',
		type: album.type ?? 'album',
		tags: [album.type ?? 'album'].filter(Boolean),
		songs: songs.items.map(mapSong),
		isSub: album.is_favorite ?? false
	};
}

// --- Artist APIs ---

export async function getArtistDetail(artistId: number): Promise<EmosArtist> {
	const data = await listArtists(1, 0, { person_id: artistId });
	const artist = data.items[0];
	if (!artist) throw new Error('歌手不存在');
	return mapArtist(artist);
}

export async function getArtistAlbums(artistId: number, limit = 10, offset = 0): Promise<{ albums: EmosArtistAlbum[]; more: boolean }> {
	const data = await listAlbumsRaw(limit, offset, { person_id_artist: artistId });
	return { albums: data.items.map(mapAlbumSummary), more: offset + data.items.length < data.total };
}

export async function getArtistTopSongs(artistId: number, limit = 10, offset = 0): Promise<{ songs: EmosSong[]; total: number }> {
	const data = await listSongs(limit, offset, { person_id_artist: artistId, has_media: 1 });
	return { songs: data.items.map(mapSong), total: data.total };
}

// --- List / Browse APIs ---

export async function getTopPlaylist(_cat = '全部', limit = 30, offset = 0): Promise<{ playlists: EmosPlaylist[]; total: number; more: boolean }> {
	const data = await listAlbumsRaw(limit, offset, { has_media: 1 });
	return {
		playlists: data.items.map(mapPlaylistFromAlbum),
		total: data.total,
		more: offset + data.items.length < data.total
	};
}

export async function getPlaylistDetail(id: number): Promise<{ playlist: EmosPlaylist & { tracks: EmosSong[] }; privileges: unknown[] }> {
	const albumData = await listAlbumsRaw(1, 0, { album_id: id });
	const album = albumData.items[0];
	const songs = await listSongs(100, 0, { album_id: id });
	const playlist = album ? mapPlaylistFromAlbum(album) : {
		id,
		name: 'EMOS 歌单',
		coverImgUrl: '',
		creator: { nickname: 'EMOS', userId: 0 },
		description: '',
		tags: [],
		playCount: 0,
		trackCount: songs.items.length
	};
	return { playlist: { ...playlist, tracks: songs.items.map(mapSong) }, privileges: [] };
}

export async function getTopSongs(limit = 21, offset = 0): Promise<{ songs: EmosSong[]; hasMore: boolean }> {
	const data = await listSongs(limit, offset, { has_media: 1 });
	return { songs: data.items.map(mapSong), hasMore: offset + data.items.length < data.total };
}

export async function getTopAlbums(limit = 21, offset = 0): Promise<{ albums: EmosArtistAlbum[]; hasMore: boolean }> {
	const data = await listAlbumsRaw(limit, offset, { has_media: 1 });
	return { albums: data.items.map(mapAlbumSummary), hasMore: offset + data.items.length < data.total };
}

export async function getNewAlbums(limit = 21, offset = 0): Promise<{ albums: EmosArtistAlbum[]; hasMore: boolean }> {
	const data = await listAlbumsRaw(limit, offset);
	return { albums: data.items.map(mapAlbumSummary), hasMore: offset + data.items.length < data.total };
}

export async function getHotSongs(limit = 21, offset = 0): Promise<{ songs: EmosSong[]; hasMore: boolean }> {
	return getTopSongs(limit, offset);
}

// --- Search APIs ---

export async function cloudsearch(keywords: string, limit = 30, type = 1, offset = 0): Promise<EmosCloudSearchResult> {
	if (!keywords.trim()) return {};
	if (type === 100) {
		const data = await listArtists(limit, offset, { name: keywords });
		return { artists: data.items.map(mapArtist), artistCount: data.total, hasMore: offset + data.items.length < data.total };
	}
	if (type === 10) {
		const data = await listAlbumsRaw(limit, offset, { name: keywords });
		return { albums: data.items.map(mapAlbumSummary), albumCount: data.total, hasMore: offset + data.items.length < data.total };
	}
	if (type === 1) {
		const data = await searchSongs(keywords, limit, offset);
		return { songs: data.items.map(mapSong), songCount: data.total, hasMore: offset + data.items.length < data.total };
	}
	return { playlists: [], playlistCount: 0, hasMore: false };
}

export async function getSimilarSongs(songId: number, limit = 30): Promise<EmosSong[]> {
	const song = await getSongDetail(songId);
	const artistName = song.ar[0]?.name;
	if (!artistName) return [];
	const data = await searchSongs(artistName, limit, 0, { has_media: 1 });
	return data.items.map(mapSong).filter((item) => item.id !== songId);
}

// --- Favorite APIs ---

export async function likeSong(id: number, like: boolean): Promise<boolean> {
	const result = await request<{ is_favorite: boolean }>('/music/favorite', { type: 'ms', value: id }, 'PUT');
	return result.is_favorite === like || typeof result.is_favorite === 'boolean';
}

export async function subscribeAlbum(id: number, sub: boolean): Promise<boolean> {
	const result = await request<{ is_favorite: boolean }>('/music/favorite', { type: 'ma', value: id }, 'PUT');
	return result.is_favorite === sub || typeof result.is_favorite === 'boolean';
}

export async function subscribeArtist(id: number, sub: boolean): Promise<boolean> {
	const result = await request<{ is_favorite: boolean }>('/music/favorite', { type: 'mp', value: id }, 'PUT');
	return result.is_favorite === sub || typeof result.is_favorite === 'boolean';
}

export async function subscribePlaylist(id: number, sub: boolean): Promise<boolean> {
	return subscribeAlbum(id, sub);
}

export async function getLikedIds(): Promise<number[]> {
	const data = await listSongs(100, 0, { is_favorite: 1 });
	return data.items.map((song) => song.song_id);
}

export async function getLikedSongs(limit = 21, offset = 0): Promise<{ songs: EmosSong[]; total: number }> {
	const data = await listSongs(limit, offset, { is_favorite: 1 });
	return { songs: data.items.map(mapSong), total: data.total };
}

// --- Library APIs ---

export async function getSubscribedArtists(limit = 21, offset = 0): Promise<{ artists: EmosArtist[]; more: boolean; count: number }> {
	const data = await listArtists(limit, offset);
	return { artists: data.items.map(mapArtist), more: offset + data.items.length < data.total, count: data.total };
}

export async function getSubscribedAlbums(limit = 21, offset = 0): Promise<{ albums: EmosArtistAlbum[]; more: boolean; count: number }> {
	const data = await listAlbumsRaw(limit, offset, { is_favorite: 1 });
	return { albums: data.items.map(mapAlbumSummary), more: offset + data.items.length < data.total, count: data.total };
}

export async function getUserPlaylists(limit = 21, offset = 0): Promise<{ playlists: EmosPlaylist[]; more: boolean; count: number }> {
	const data = await getTopPlaylist('全部', limit, offset);
	return { playlists: data.playlists, more: data.more, count: data.total };
}

// --- Auth APIs ---

export function getEmosLoginUrl(returnUrl?: string): string {
	const uuid = crypto.randomUUID();
	const callbackUrl = returnUrl ?? (typeof window !== 'undefined' ? window.location.origin : '');
	const url = new URL('/link', EMOS_ORIGIN || getOrigin());
	url.searchParams.set('uuid', uuid);
	url.searchParams.set('name', 'EMOS Music');
	url.searchParams.set('url', callbackUrl);
	return url.toString();
}

export async function getLoginStatus(): Promise<{
	code: number;
	account: { id: number; userName: string; nickname: string; vipType?: number } | null;
	profile: { nickname: string; avatarUrl: string; userId: number; vipType?: number } | null;
	hadToken: boolean;
}> {
	const hadToken = getEmosToken() !== '';
	const sign = await request<EmosSignStatus>('/sign/check');
	if (!sign.is_sign) return { code: 401, account: null, profile: null, hadToken };

	// 拉取用户信息：名称优先笔名，无则用户名；同时带上真实头像。
	// 失败时降级为 sign/check 的 user_id + 默认展示，不影响登录态。
	let username = '';
	let nickname = '';
	let avatarUrl = '';
	try {
		const info = await request<EmosUserInfo>('/user');
		username = info.username?.trim() || '';
		nickname = info.pseudonym?.trim() || username;
		avatarUrl = info.avatar ?? '';
	} catch {
		// user info 接口失败：保持默认值
	}

	const numericId = Number.parseInt((sign.user_id ?? '0').replace(/\D/g, '').slice(0, 9)) || 1;
	username = username || (sign.user_id ?? 'emos');
	nickname = nickname || 'EMOS 用户';
	return {
		code: 200,
		account: { id: numericId, userName: username, nickname, vipType: 0 },
		profile: { userId: numericId, nickname, avatarUrl, vipType: 0 },
		hadToken
	};
}

export async function bootstrapEmosSession(): Promise<{ init: unknown; status: ReturnType<typeof getLoginStatus> extends Promise<infer T> ? T : never }> {
	const status = await getLoginStatus();
	return { init: null, status };
}

// --- Homepage types (legacy compatibility) ---

export interface HomepageResource {
	id: number;
	type: string;
	name: string;
	subTitle: string;
	imageUrl: string;
}

export interface HomepageSection {
	blockCode: string;
	title: string;
	resources: HomepageResource[];
}

// --- Search Suggest (EMOS API does not support, return empty) ---

export async function getSearchSuggest(_keywords: string): Promise<{
	allMatch?: { keyword: string; type: number; alg: string }[];
	artists?: { id: number; name: string; picUrl: string; alias: string[]; albumSize: number; musicSize: number }[];
	songs?: { id: number; name: string; artists: { id: number; name: string; picUrl: string | null }[]; album: { id: number; name: string }; duration: number }[];
	albums?: { id: number; name: string; artist: { id: number; name: string; picUrl: string | null }; publishTime: number; size: number }[];
	order?: string[];
}> {
	return { allMatch: [] };
}
