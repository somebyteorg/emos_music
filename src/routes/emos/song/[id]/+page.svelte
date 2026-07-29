<script lang="ts">
	import { goto } from '$app/navigation';

	let { params } = $props();
	let songId = $derived(Number(params.id) || 0);

	$effect(() => {
		goto(`/song/${songId}`, { replaceState: true });
	});
</script>

<div class="section with-top-spacing section--full-width">
	<div class="section-content">正在打开歌曲...</div>
</div>
