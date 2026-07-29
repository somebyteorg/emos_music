<script lang="ts">
	import { UI, ICONS } from '$lib/utils/constants';
	import '$lib/styles/content-modal.css';

	interface Props {
		title: string;
		subtitle?: string;
		open: boolean;
		onclose: () => void;
		containerClass?: string;
		children?: import('svelte').Snippet;
	}

	let { title, subtitle, open, onclose, containerClass, children }: Props = $props();

	let isScrolling = $state(false);
	let hideGradient = $state(false);
	let overlayEl: HTMLDivElement | null = $state(null);

	function handleScroll(e: Event) {
		const el = e.currentTarget as HTMLElement;
		isScrolling = el.scrollTop > 0;
		const scrollBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
		hideGradient = scrollBottom <= UI.SCROLL_BOTTOM_THRESHOLD;
	}

	function handleBackdropClick() {
		onclose();
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			onclose();
		}
	}

	$effect(() => {
		if (!open) return;
		window.addEventListener('keydown', handleKeydown);
		return () => window.removeEventListener('keydown', handleKeydown);
	});

	$effect(() => {
		if (!open || !overlayEl) return;
		const el = overlayEl;
		if (el.parentNode !== document.body) {
			document.body.appendChild(el);
		}
		return () => {
			if (el.parentNode === document.body) {
				document.body.removeChild(el);
			}
		};
	});
</script>

{#if open}
	<div bind:this={overlayEl} class="description-dialog-overlay" onclick={handleBackdropClick}>
		<div class="description-dialog content-modal-container {containerClass ?? ''} {isScrolling ? 'content-is-scrolling' : ''} {hideGradient ? 'hide-gradient' : ''}" onclick={(e) => e.stopPropagation()}>
			<div class="button-container">
				<button class="close-button" type="button" aria-label="关闭" onclick={onclose}>
					<svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
						<path d={ICONS.CLOSE}/>
					</svg>
				</button>
			</div>
			<div class="header-container">
				<h1 class="title">{title}</h1>
				{#if subtitle}
					<h2 class="subtitle">{subtitle}</h2>
				{/if}
			</div>
			<div class="content-container" onscroll={handleScroll}>
				{#if children}
					{@render children()}
				{/if}
			</div>
		</div>
	</div>
{/if}