import { getSongDetail, getLyric, parseSongCredits, parseLyricLines, getArtistDetail, getArtistAlbums } from '$lib/services/emos';
import type { EmosSong, SongCredit, EmosLyricLine, EmosArtistAlbum, EmosLyric } from '$lib/types/emos';
import { createPageCache } from '$lib/utils/page-cache-helper';

interface CreditEntry {
	name: string;
	roles: string;
	picUrl: string;
}

interface PerformingArtist {
	id: number;
	name: string;
	picUrl: string;
}

const defaults = {
	song: null as EmosSong | null,
	credits: [] as SongCredit[],
	lyricLines: [] as EmosLyricLine[],
	artistAlbums: [] as EmosArtistAlbum[],
	performingArtists: [] as PerformingArtist[],
	songwritingCredits: [] as CreditEntry[],
	productionCredits: [] as CreditEntry[]
};

export function createSongCache(id: number) {
	return createPageCache(`song-${id}`, defaults);
}

export async function loadSongData(id: number, pc: ReturnType<typeof createSongCache>): Promise<void> {
	if (pc.loaded()) {
		pc.syncFromCache();
		return;
	}
	pc.markLoaded();

	let songData: EmosSong;
	let lyricData: EmosLyric;
	try {
		[songData, lyricData] = await Promise.all([
			getSongDetail(id),
			getLyric(id)
		]);
	} catch (e) {
		pc.invalidate();
		throw e;
	}

	pc.set('song', songData);

	let lyricLines: EmosLyricLine[] = [];
	if (lyricData.lrc?.lyric) {
		lyricLines = parseLyricLines(lyricData.lrc.lyric, lyricData.tlyric?.lyric);
	}
	pc.set('lyricLines', lyricLines);

	let credits: SongCredit[] = [];
	if (lyricData.yrc?.lyric) {
		credits = parseSongCredits(lyricData.yrc.lyric);
	} else if (lyricData.lrc?.lyric) {
		credits = parseSongCredits(lyricData.lrc.lyric);
	}
	pc.set('credits', credits);

	let songwritingCredits: CreditEntry[] = [];
	let productionCredits: CreditEntry[] = [];
	let performingArtists: PerformingArtist[] = [];

	if (credits.length > 0) {
		const songwritingRoles = ['作词', '作曲'];
		const excludedRoles = ['©', '℗', '®', '版权', 'Copyright', 'Licensed', 'Produced', '发行', '出品', '企划', '营销', '宣传', '经纪', '统筹', '视觉', '设计', '摄影', '封面', '录音室', '混音室', '母带室'];
		const songwritingMap = new Map<string, string[]>();
		const productionMap = new Map<string, string[]>();
		for (const credit of credits) {
			if (excludedRoles.some(r => credit.role.includes(r))) continue;
			const isSongwriting = songwritingRoles.some(r => credit.role.includes(r));
			const targetMap = isSongwriting ? songwritingMap : productionMap;
			for (const artist of credit.artists) {
				const roles = targetMap.get(artist) || [];
				if (!roles.includes(credit.role)) roles.push(credit.role);
				targetMap.set(artist, roles);
			}
		}
		songwritingCredits = Array.from(songwritingMap.entries()).map(([name, roles]) => ({ name, roles: roles.join('、'), picUrl: '' }));
		productionCredits = Array.from(productionMap.entries()).map(([name, roles]) => ({ name, roles: roles.join('、'), picUrl: '' }));
	}

	if (songData.ar.length > 0) {
		try {
			const [artistData, albumData] = await Promise.all([
				getArtistDetail(songData.ar[0].id),
				getArtistAlbums(songData.ar[0].id, 21)
			]);
			const mainPicUrl = artistData.cover || artistData.picUrl || artistData.img1v1Url || '';
			performingArtists = [{ id: artistData.id, name: artistData.name, picUrl: mainPicUrl }];
			const artistAlbums = (albumData?.albums ?? []).filter(a => a.id !== songData.al.id);
			pc.set('artistAlbums', artistAlbums);
			const matchPic = (list: CreditEntry[]) =>
				list.map(c => ({ ...c, picUrl: c.name === artistData.name ? mainPicUrl : c.picUrl }));
			songwritingCredits = matchPic(songwritingCredits);
			productionCredits = matchPic(productionCredits);
		} catch (e: unknown) {
			console.warn('Failed to load artist detail for credits:', e);
			performingArtists = songData.ar.map(a => ({ id: a.id, name: a.name, picUrl: '' }));
		}
	}

	pc.set('performingArtists', performingArtists);
	pc.set('songwritingCredits', songwritingCredits);
	pc.set('productionCredits', productionCredits);
}