<script lang="ts">
	import '$lib/styles/home-page.css';
	import { ICONS } from '$lib/utils/constants';
	import { subscribeEmosAuth } from '$lib/stores/emos-auth';
	import { getEmosLoginUrl } from '$lib/services/emos';
	import { loadAllData } from './data';
	import type { HomePageData } from './data';

	import HeaderNav from '$lib/components/HeaderNav.svelte';
	import ErrorState from '$lib/components/ErrorState.svelte';
	import HomeSongSection from './components/HomeSongSection.svelte';
	import HomepageSectionSection from './components/HomepageSectionSection.svelte';
	import { albumSections } from './data';

	let emosLoggedIn = $state(false);
	let error = $state('');
	let loading = $state(false);

	let pageData = $state<HomePageData>({
		topSongs: [],
		topAlbums: [],
		newAlbums: []
	});

	$effect(() => {
		const unsub = subscribeEmosAuth((u) => {
			emosLoggedIn = !!u;
			initPageData().catch((e) => console.warn('Failed to refresh home page data:', e));
		});
		return unsub;
	});

	async function initPageData(): Promise<void> {
		loading = true;
		error = '';
		try {
			pageData = await loadAllData();
		} catch (e) {
			error = '加载首页内容失败，请稍后重试';
			console.warn('Failed to load home page data:', e);
		} finally {
			loading = false;
		}
	}
</script>

<svelte:head>
	<title>EMOS Music</title>
</svelte:head>

{#if loading}
	<div class="home-page home-page--loading">
		<div class="skeleton-grid">
			{#each Array(10) as _, i}
				<div class="skeleton-card" style="animation-delay: {i * 60}ms">
					<div class="skeleton-image"></div>
					<div class="skeleton-text"></div>
					<div class="skeleton-text short"></div>
				</div>
			{/each}
		</div>
	</div>
{:else if error}
	<div class="home-page">
		<ErrorState message={error} onRetry={initPageData} />
	</div>
{:else}
	<div class="home-page">
		<section class="home-page__hero">
			<h1 class="home-page__title">EMOS Music</h1>
			<p class="home-page__subtitle">echo + media + oasis。愿你不觉孤单，音乐在此总有回响。</p>
			<div class="home-page__actions">
				<button tabindex="0" class="signin signin--expanded" type="button" onclick={() => { window.location.href = getEmosLoginUrl(window.location.origin); }}>
					<svg height="11" viewBox="0 0 10 11" width="10" class="auth-icon"><path d={ICONS.PERSON}></path></svg>
					<span class="button-text">登录</span>
				</button>
			</div>
		</section>

		<section class="home-page__features">
			<div class="feature-card">
				<div class="feature-icon">
					<svg viewBox="0 0 24 24" width="32" height="32"><path d={ICONS.PLAY_SMALL} fill="currentColor"/></svg>
				</div>
				<h3>永久公益</h3>
				<p>自研架构，兼容开放。不设门槛，不玩套路，音乐本该自由流淌。</p>
			</div>
			<div class="feature-card">
				<div class="feature-icon">
					<svg viewBox="0 0 24 24" width="32" height="32"><path d={ICONS.STAR} fill="currentColor"/></svg>
				</div>
				<h3>携手共建</h3>
				<p>社区驱动的内容生态，每一份热爱都会在这里得到回响。</p>
			</div>
			<div class="feature-card">
				<div class="feature-icon">
					<svg viewBox="0 0 24 24" width="32" height="32"><path d={ICONS.UP_NEXT_QUEUE} fill="currentColor"/></svg>
				</div>
				<h3>自由聆听</h3>
				<p>登录后获取可播放曲库、歌词、播放资源与收藏状态。</p>
			</div>
		</section>

		{#if emosLoggedIn}
			<HeaderNav heading="可播放歌曲" />
			<HomeSongSection title="可播放歌曲" songs={pageData.topSongs} linkHref="/list/songs/recent/0" hasMore={true} />

			<HomepageSectionSection sections={albumSections(pageData)} />
		{:else}
			<HeaderNav heading="可播放歌曲" />
			<HomeSongSection title="可播放歌曲" songs={pageData.topSongs} linkHref="/list/songs/recent/0" hasMore={true} />
		{/if}
	</div>
{/if}
