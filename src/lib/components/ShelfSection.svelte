<script lang="ts">
	import '$lib/styles/section.css';
	import '$lib/styles/shelf-grid.css';
	import SectionHeader from '$lib/components/SectionHeader.svelte';
	import { GRID_PRESETS, type GridVariant } from '$lib/utils/constants';

	interface Props {
		title: string;
		variant?: GridVariant;
		linkHref?: string;
		itemCount?: number;
		gridColumns?: number;
		gridStyle?: string;
		sectionClass?: string;
		ariaLabel?: string;
		listClass?: string;
		hasMore?: boolean;
		shelfGridClass?: string;
		children?: import('svelte').Snippet;
	}

	let {
		title,
		variant,
		linkHref,
		itemCount = 0,
		gridColumns: gridColumnsProp,
		gridStyle: gridStyleProp,
		sectionClass = 'section section--full-width',
		ariaLabel,
		listClass: listClassProp,
		hasMore: hasMoreProp,
		shelfGridClass: shelfGridClassProp,
		children
	}: Props = $props();

	let preset = $derived(variant ? GRID_PRESETS[variant] : null);

	let gridColumns = $derived(gridColumnsProp ?? preset?.gridColumns ?? 0);
	let gridStyle = $derived(gridStyleProp ?? preset?.gridStyle ?? '');
	let listClass = $derived(listClassProp ?? preset?.listClass ?? '');
	let shelfGridClass = $derived(shelfGridClassProp ?? preset?.shelfGridClass ?? 'shelf-grid--full-width');
	let hasMore = $derived(hasMoreProp ?? (itemCount > gridColumns && gridColumns > 0));
</script>

<div class={sectionClass} aria-label={ariaLabel ?? title}>
	<div class="section-content">
		{#if title}
			<SectionHeader {title} {linkHref} {hasMore} />
		{/if}
		{#if children}
			<div class="shelf">
				<section class="shelf-grid {shelfGridClass}" style={gridStyle}>
					<div class="shelf-grid__body">
						<ul class="shelf-grid__list {listClass}" role="list" tabindex="-1">
							{@render children()}
						</ul>
					</div>
				</section>
			</div>
		{/if}
	</div>
</div>
