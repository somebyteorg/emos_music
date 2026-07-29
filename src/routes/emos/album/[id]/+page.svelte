<script lang="ts">
	import { goto } from '$app/navigation';

	let { params } = $props();
	let albumId = $derived(Number(params.id) || 0);

	$effect(() => {
		goto(`/album/${albumId}`, { replaceState: true });
	});
</script>

<div class="section with-top-spacing section--full-width">
	<div class="section-content">正在打开专辑...</div>
</div>
