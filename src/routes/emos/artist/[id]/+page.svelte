<script lang="ts">
	import { goto } from '$app/navigation';

	let { params } = $props();
	let artistId = $derived(Number(params.id) || 0);

	$effect(() => {
		goto(`/artist/EMOS/${artistId}`, { replaceState: true });
	});
</script>

<div class="section with-top-spacing section--full-width">
	<div class="section-content">正在打开艺人...</div>
</div>
