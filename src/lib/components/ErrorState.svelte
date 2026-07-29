<script lang="ts">
	import '$lib/styles/error-state.css';
	let { message = '加载失败', onRetry }: { message?: string; onRetry?: () => void } = $props();
</script>

<div class="error-state">
	<p class="error-state__message">{message}</p>
	{#if onRetry}
		<button class="error-state__retry" onclick={onRetry}>重试</button>
	{/if}
</div>