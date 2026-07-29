<script lang="ts">
	import '../styles/search-page.css';
	import '$lib/styles/section.css';

	import SectionHeader from '$lib/components/SectionHeader.svelte';
	import ProductLockupCard from '$lib/components/ProductLockupCard.svelte';
	import { CATEGORY_GROUPS, CATEGORY_COVERS } from '$lib/utils/constants';
</script>

<div class="section with-top-spacing section--full-width section--category-bricks" aria-label="类别浏览">
	<div class="section-content">
		<SectionHeader title="类别浏览" />
		{#each CATEGORY_GROUPS as group}
			<h3 class="category-group__label">{group.label}</h3>
			<ul class="grid grid--category-bricks">
				{#each group.items as name}
					<li class="grid-item">
						<ProductLockupCard
							imageUrl={CATEGORY_COVERS[name]}
							{name}
							linkHref={`/search?q=${encodeURIComponent(name)}`}
							showControls={false}
							placeholderText={name}
						/>
					</li>
				{/each}
			</ul>
		{/each}
	</div>
</div>
