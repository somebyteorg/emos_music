<script lang="ts">
	import '$lib/styles/library-header.css';
	import { ICONS } from '$lib/utils/constants';
	import type { MenuGroupDef, SortField, SortOrder } from '$lib/utils/constants';
	import { createMenuState } from '$lib/utils/menu-state.svelte';
	import ContextualMenu from '$lib/components/ContextualMenu.svelte';

	interface Props {
		title: string;
		showSort?: boolean;
		sortField?: SortField;
		sortOrder?: SortOrder;
		onSortChange?: (field: SortField, order: SortOrder) => void;
	}

	let {
		title,
		showSort = false,
		sortField = 'title',
		sortOrder = 'ascending',
		onSortChange
	}: Props = $props();

	const sortMenu = createMenuState<void>();

	let sortMenuItems: MenuGroupDef[] = $derived([
		{
			items: [
				{
					label: '标题',
					icon: sortField === 'title' ? ICONS.CHECKMARK : undefined,
					action: () => { onSortChange?.('title', sortOrder); sortMenu.close(); }
				},
				{
					label: '最近收藏',
					icon: sortField === 'recently-added' ? ICONS.CHECKMARK : undefined,
					action: () => { onSortChange?.('recently-added', sortOrder); sortMenu.close(); }
				}
			]
		},
		{
			items: [
				{
					label: '升序',
					icon: sortOrder === 'ascending' ? ICONS.CHECKMARK : undefined,
					action: () => { onSortChange?.(sortField, 'ascending'); sortMenu.close(); }
				},
				{
					label: '降序',
					icon: sortOrder === 'descending' ? ICONS.CHECKMARK : undefined,
					action: () => { onSortChange?.(sortField, 'descending'); sortMenu.close(); }
				}
			]
		}
	]);
</script>

<div class="header-nav header-nav--library-header">
	<h1 class="header-nav__heading header-nav__heading--centered">{title}</h1>
	{#if showSort}
		<div class="header-nav__action">
			<div class="accessory-button">
				<button class="contextual-menu__trigger" type="button" aria-label="排序" onclick={(e) => sortMenu.open(e, undefined)}>
					<span class="sort-button">
						<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
							<path d={ICONS.SORT}></path>
						</svg>
						<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 9 5" class="chevron" aria-hidden="true">
							<path d={ICONS.CHEVRON_DOWN_SMALL}></path>
						</svg>
					</span>
				</button>
			</div>
		</div>
	{/if}
</div>

<ContextualMenu items={sortMenuItems} clientPos={sortMenu.clientPos} onclose={sortMenu.close} />
