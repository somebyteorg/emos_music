<script lang="ts">
	import { goto } from '$app/navigation';
	import '$lib/styles/section.css';
	import '$lib/styles/shelf-grid.css';
	import ShelfSection from '$lib/components/ShelfSection.svelte';
	import TrackLockup from '$lib/components/TrackLockup.svelte';
	import ContextualMenu from '$lib/components/ContextualMenu.svelte';
	import SectionHeader from '$lib/components/SectionHeader.svelte';
	import { GRID_PRESETS, ICONS } from '$lib/utils/constants';
	import { playSong } from '$lib/stores/player';
	import { createSongMenuState } from '$lib/utils/menu-state.svelte';
	import type { EmosSong } from '$lib/types/emos';
	import { songSubtitle } from '../data';

	interface Props {
		songs: EmosSong[];
		artistSlug: string;
		artistId: number;
	}

	let { songs, artistSlug, artistId }: Props = $props();

	const menu = createSongMenuState(
		() => menu.songId ? `${window.location.origin}/song/${menu.songId}` : '',
		() => [{ label: '查看制作人员', icon: ICONS.CREDITS, action: () => { if (menu.songId) goto(`/song/${menu.songId}`); } }]
	);
</script>

{#if songs.length > 0}
	<div class="section-content">
		<SectionHeader title="歌曲排行" linkHref="/list/songs/{artistSlug}/{artistId}" hasMore={true} />
		<div class="shelf">
			<section class="shelf-grid shelf-grid--onhover" style={GRID_PRESETS.tracks.gridStyle}>
				<div class="shelf-grid__body">
					<ul class="shelf-grid__list {GRID_PRESETS.tracks.listClass}" role="list" tabindex="-1">
						{#each songs as song, i (song.id)}
							<li class="shelf-grid__list-item" data-index={i}>
								<TrackLockup
									imageUrl={song.al?.picUrl ?? ''}
									title={song.name}
									subtitle={songSubtitle(song)}
									linkHref="/song/{song.id}"
									onMoreClick={(e) => menu.open(e, song.id)}
									onPlay={() => playSong(song, songs)}
								/>
							</li>
						{/each}
					</ul>
				</div>
			</section>
		</div>
	</div>

	<ContextualMenu items={menu.items} clientPos={menu.clientPos} onclose={menu.close} />
{/if}