<script lang="ts">
	import { goto } from '$app/navigation';
	import '$lib/styles/section.css';
	import '$lib/styles/shelf-grid.css';

	import SectionHeader from '$lib/components/SectionHeader.svelte';
	import ShelfSection from '$lib/components/ShelfSection.svelte';
	import TrackLockup from '$lib/components/TrackLockup.svelte';
	import ContextualMenu from '$lib/components/ContextualMenu.svelte';
	import { createShareCopyMenu, ICONS } from '$lib/utils/constants';
	import { getArtworkUrl } from '$lib/services/emos';
	import { createIndexMenuState } from '$lib/utils/menu-state.svelte';
	import type { EmosSong } from '$lib/types/emos';
	import { playSong } from '$lib/stores/player';

	interface Props {
		songs: EmosSong[];
		searchQuery: string;
		hasMore: boolean;
	}

	let { songs, searchQuery, hasMore }: Props = $props();

	const menu = createIndexMenuState();

	function songSubtitle(song: EmosSong): string {
		const albumName = song.al?.name ?? '';
		const year = song.publishTime ? ` · ${new Date(song.publishTime).getFullYear()}年` : '';
		return albumName + year;
	}

	function getSongUrl(): string {
		const song = menu.target !== null && menu.target >= 0 ? songs[menu.target] : null;
		if (!song) return '';
		return `${window.location.origin}/song/${song.id}`;
	}

	let menuItems = $derived(createShareCopyMenu(
		() => getSongUrl(),
		[{ label: '查看制作人员', icon: ICONS.CREDITS, action: () => { const song = menu.target !== null && menu.target >= 0 ? songs[menu.target] : null; if (song) goto(`/song/${song.id}`); } }]
	));
</script>

<ShelfSection title="歌曲" variant="tracks-search" linkHref={`/list/songs/${encodeURIComponent(searchQuery)}/0`} itemCount={songs.length} hasMore={hasMore}>
		{#each songs as song, i (song.id)}
			<li class="shelf-grid__list-item" data-index={i}>
				<TrackLockup
					imageUrl={song.al?.picUrl ?? ''}
					title={song.name}
					subtitle={songSubtitle(song)}
					linkHref="/song/{song.id}"
					onMoreClick={(e) => { e.stopPropagation(); menu.open(e, i); }}
					onPlay={() => playSong(song, songs)}
				/>
			</li>
		{/each}
</ShelfSection>

<ContextualMenu items={menuItems} clientPos={menu.clientPos} onclose={menu.close} />
