<script lang="ts">
	import '../app.css';

	import type { Snippet } from 'svelte';
	import { beforeNavigate } from '$app/navigation';
	import { navigating, page, updated } from '$app/stores';
	import { onMount } from 'svelte';
	import { SvelteURL } from 'svelte/reactivity';
	import Navigation from '$lib/components/Navigation.svelte';
	import PlayerBar from '$lib/components/PlayerBar.svelte';

	import { setScrollPosition, getScrollPosition } from '$lib/stores/page-cache';
	import { bootstrapEmosAuth, setEmosToken } from '$lib/stores/emos-auth';
	import { getState as getPlayerState } from '$lib/stores/player';
	let { children }: { children: Snippet } = $props();
	let isLoading = $derived($navigating !== null);

	let scrollEl: HTMLElement | null = $state(null);
	let lastPath = '';

	function isMobile(): boolean {
		return window.innerWidth < 484;
	}

	function getScrollTop(): number {
		if (isMobile()) return window.scrollY;
		return scrollEl?.scrollTop ?? 0;
	}

	function setScrollTop(y: number): void {
		if (isMobile()) {
			window.scrollTo(0, y);
		} else {
			scrollEl?.scrollTo(0, y);
		}
	}

	function getTokenFromParams(params: URLSearchParams): string {
		return params.get('token') ?? params.get('access_token') ?? params.get('authorization') ?? '';
	}

	function consumeEmosTokenFromUrl(): boolean {
		const url = new SvelteURL(window.location.href);
		const tokenFromSearch = getTokenFromParams(url.searchParams);
		const hashValue = url.hash.replace(/^#/, '');
		const hashParamsSource = hashValue.includes('?') ? hashValue.slice(hashValue.indexOf('?') + 1) : hashValue;
		const hashParams = new URLSearchParams(hashParamsSource);
		const token = tokenFromSearch || getTokenFromParams(hashParams);
		if (!token) return false;

		setEmosToken(token);
		url.searchParams.delete('token');
		url.searchParams.delete('access_token');
		url.searchParams.delete('authorization');
		url.hash = '';
		window.history.replaceState(window.history.state, '', url.pathname + url.search);
		return true;
	}

	onMount(() => {
		consumeEmosTokenFromUrl();
		bootstrapEmosAuth();

		const handler = (e: BeforeUnloadEvent) => {
			if (getPlayerState().isPlaying) {
				e.preventDefault();
			}
		};
		window.addEventListener('beforeunload', handler);
		return () => { window.removeEventListener('beforeunload', handler); };
	});

	$effect(() => {
		if ($updated) {
			location.reload();
		}
	});

	beforeNavigate(() => {
		if (lastPath) {
			setScrollPosition(lastPath, getScrollTop());
		}
	});

	$effect(() => {
		const currentPath = $page.url.pathname + $page.url.search;
		if (currentPath !== lastPath) {
			const saved = getScrollPosition(currentPath);
			requestAnimationFrame(() => {
				setScrollTop(saved);
			});
			lastPath = currentPath;
		}
	});
</script>

<svelte:head>
	<link rel="icon" href="/favicon.svg" type="image/svg+xml" />
</svelte:head>

<div class="app-container">
	<div class="header">
		<Navigation />
	</div>
	<PlayerBar />
	<div class="scrollable-page" class:page--loading={isLoading} bind:this={scrollEl}>
		<main>
			<div class="content-container">
				{@render children()}
			</div>
		</main>
	</div>
</div>

