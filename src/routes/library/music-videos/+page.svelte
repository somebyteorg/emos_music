<script lang="ts">
	import LibraryHeader from '$lib/components/LibraryHeader.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import { ICONS } from '$lib/utils/constants';
	import '$lib/styles/section.css';
	import '$lib/styles/library-page.css';
</script>

<svelte:head><title>音乐视频 - EMOS Music</title></svelte:head>

<LibraryHeader title="音乐视频" />

<div class="section section--full-width with-bottom-spacing">
	<div class="section-content">
		<EmptyState icon={ICONS.NAV_MUSIC_VIDEOS} description="暂无音乐视频" />
	</div>
</div>
