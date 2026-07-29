import { ICONS } from '$lib/utils/constants';

export interface NavItem {
	id: string;
	label: string;
	href: string;
	iconPath: string;
}

export const navItems: NavItem[] = [
	{
		id: 'search',
		label: '搜索',
		href: '/search',
		iconPath: ICONS.NAV_SEARCH
	},
	{
		id: 'home',
		label: '主页',
		href: '/',
		iconPath: ICONS.NAV_HOME
	}
];

export const libraryItems: NavItem[] = [
	{
		id: 'artists',
		label: '艺人',
		href: '/library/artists',
		iconPath: ICONS.NAV_ARTISTS
	},
	{
		id: 'albums',
		label: '专辑',
		href: '/library/albums',
		iconPath: ICONS.NAV_ALBUMS
	},
	{
		id: 'songs',
		label: '歌曲',
		href: '/library/songs',
		iconPath: ICONS.NAV_SONGS
	},
	{
		id: 'music-video',
		label: '音乐视频',
		href: '/library/music-videos',
		iconPath: ICONS.NAV_MUSIC_VIDEOS
	}
];
