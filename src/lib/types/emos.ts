export interface EmosSong {
	id: number;
	name: string;
	ar: { id: number; name: string }[];
	al: { id: number; name: string; picUrl: string };
	dt: number;
	fee: number;
	pop?: number;
	publishTime?: number;
}

export interface EmosSongSaleProduct {
	albumId: number;
	albumName: string;
	artistName: string;
	coverUrl: string;
	saleNum: number;
	rank: number;
	rankIncr: number;
	albumType: number;
	price: number;
}

export interface EmosSongSaleBoard {
	products: EmosSongSaleProduct[];
}

export interface EmosPlaylistCategory {
	name: string;
	category: number;
	hot: boolean;
}

export interface EmosPlaylistCategories {
	categories: Record<string, string>;
	sub: EmosPlaylistCategory[];
}

export interface EmosPlaylist {
	id: number;
	name: string;
	coverImgUrl: string;
	creator: { nickname: string; userId: number };
	description: string | null;
	tags: string[];
	playCount: number;
	trackCount: number;
	subscribed?: boolean;
}

export interface EmosPersonalizedPlaylist {
	id: number;
	name: string;
	picUrl: string;
	playCount: number;
	trackCount: number;
	copywriter: string;
}

export interface EmosToplist {
	id: number;
	name: string;
	coverImgUrl: string;
	description: string;
	updateFrequency: string;
	trackCount: number;
	playCount: number;
}

export interface EmosSongDetail {
	songs: EmosSong[];
	code: number;
}

export interface EmosLyric {
	lrc?: { lyric: string };
	tlyric?: { lyric: string };
	yrc?: { lyric: string };
	ytlrc?: { lyric: string };
	code: number;
}

export interface EmosLyricLine {
	time: number;
	text: string;
	translation?: string;
}

export interface EmosYrcWord {
	startTime: number;
	duration: number;
	text: string;
}

export interface EmosYrcLine {
	time: number;
	duration: number;
	words: EmosYrcWord[];
	text: string;
	translation?: string;
}

export interface EmosAlbum {
	id: number;
	name: string;
	picUrl: string;
	artist: { id: number; name: string; picUrl?: string };
	publishTime: number;
	size: number;
	description: string;
	company: string;
	type: string;
	tags: string[];
	songs: EmosSong[];
	isSub?: boolean;
}

export interface EmosArtistAlbum {
	id: number;
	name: string;
	picUrl: string;
	type: string;
	size: number;
	publishTime?: number;
	artist?: { id: number; name: string; picUrl?: string };
}

export interface EmosArtist {
	id: number;
	name: string;
	picUrl?: string;
	img1v1Url?: string;
	cover?: string;
	avatar?: string;
	albumSize: number;
	briefDesc?: string;
	isSub?: boolean;
}


export interface SongCredit {
	role: string;
	artists: string[];
}

export interface EmosPrivilege {
	id: number;
	fee: number;
	payed: number;
	st: number;
	pl: number;
	dl: number;
	maxbr: number;
	flap: number;
	flag: number;
	preSell: boolean;
	playable: boolean;
	purchase: boolean;
}

export interface EmosSearchSuggestMatch {
	keyword: string;
	type: number;
	alg: string;
}

export interface EmosSearchSuggestArtist {
	id: number;
	name: string;
	picUrl: string;
	alias: string[];
	albumSize: number;
	musicSize: number;
}

export interface EmosSearchSuggestSong {
	id: number;
	name: string;
	artists: { id: number; name: string; picUrl: string | null }[];
	album: { id: number; name: string };
	duration: number;
}

export interface EmosSearchSuggestAlbum {
	id: number;
	name: string;
	artist: { id: number; name: string; picUrl: string | null };
	publishTime: number;
	size: number;
}

export interface EmosSearchSuggest {
	allMatch?: EmosSearchSuggestMatch[];
	artists?: EmosSearchSuggestArtist[];
	songs?: EmosSearchSuggestSong[];
	albums?: EmosSearchSuggestAlbum[];
	order?: string[];
}



export interface EmosCloudSearchResult {
	songs?: EmosSong[];
	songCount?: number;
	artists?: EmosArtist[];
	artistCount?: number;
	albums?: EmosArtistAlbum[];
	albumCount?: number;
	playlists?: EmosPlaylist[];
	playlistCount?: number;
	hasMore?: boolean;
}
