<script lang="ts">
	import '$lib/styles/header-nav.css';

	interface Props {
		heading: string;
		headerType?: 'a' | 'b';
		withSeparator?: boolean;
		children?: import('svelte').Snippet;
	}

	let { heading, headerType = 'a', withSeparator = false, children }: Props = $props();
</script>

<div
	class="header-nav header-nav--header-type-{headerType}"
	class:header-nav--with-separator={withSeparator}
	data-testid="header-component-model"
	aria-hidden="false"
>
	<h1 class="header-nav__heading">{heading}</h1>
	<div class="header-nav__action">
		{#if children}
			{@render children()}
		{/if}
	</div>
</div>
