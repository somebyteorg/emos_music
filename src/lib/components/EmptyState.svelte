<script lang="ts">
	import '$lib/styles/empty-state.css';
	import { ICONS } from '$lib/utils/constants';

	interface Props {
		icon?: string;
		description: string;
	}

	let { icon, description }: Props = $props();
</script>

<div role="status" class="empty-state">
	{#if icon}
		<div class="empty-state__icon">
			<svg height="24" viewBox="0 0 24 24" width="24"><path d={icon} fill-opacity=".95"></path></svg>
		</div>
	{/if}
	<p class="empty-state__description">{description}</p>
</div>