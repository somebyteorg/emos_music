<script lang="ts">
	import '$lib/styles/shelf-grid.css';
	import PulseSpinner from '$lib/components/PulseSpinner.svelte';

	let { hasMore, loading }: { hasMore: boolean; loading: boolean } = $props();
</script>

{#if hasMore && loading}
	<div class="load-more-indicator"><PulseSpinner /></div>
{/if}