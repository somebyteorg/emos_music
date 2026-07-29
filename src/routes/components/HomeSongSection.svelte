<script lang="ts">
	import { goto } from '$app/navigation';
	import '$lib/styles/section.css';
	import '$lib/styles/shelf-grid.css';
	import ShelfSection from '$lib/components/ShelfSection.svelte';
	import TrackLockup from '$lib/components/TrackLockup.svelte';
	import ContextualMenu from '$lib/components/ContextualMenu.svelte';
	import { ICONS, createShareCopyMenu } from '$lib/utils/constants';
	import { playSong } from '$lib/stores/player';
	import { createIndexMenuState } from '$lib/utils/menu-state.svelte';
	import type { EmosSong } from '$lib/types/emos';
	import { songSubtitle } from '../data';

	interface Props {
		title: string;
		songs: EmosSong[];
		linkHref?: string;
		hasMore?: boolean;
	}

	let { title, songs, linkHref, hasMore = false }: Props = $props();

	const menu = createIndexMenuState();

	function getSongUrl(): string {
		const s = menu.target !== null && menu.target >= 0 ? songs[menu.target] : null;
		if (!s) return '';
		return `${window.location.origin}/song/${s.id}`;
	}

	let menuItems = $derived(createShareCopyMenu(
		() => getSongUrl(),
		[{ label: '显示制作人员', icon: ICONS.CREDITS, action: () => { const s = menu.target !== null && menu.target >= 0 ? songs[menu.target] : null; if (s) goto(`/song/${s.id}`); } }]
	));
</script>

{#if songs.length > 0}
	<ShelfSection {title} variant="tracks-wide" {linkHref} {hasMore}>
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
{/if}