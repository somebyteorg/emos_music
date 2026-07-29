<script lang="ts">
	import { getArtworkUrl } from '$lib/services/emos';
	import '$lib/styles/section.css';

	interface CreditArtist {
		name: string;
		roles: string;
		picUrl: string;
	}

	interface Props {
		title: string;
		artists: CreditArtist[];
		monogramPrefix: string;
	}

	let { title, artists, monogramPrefix }: Props = $props();
</script>

<div class="section section--full-width">
	<div class="section-content">
		<section class="cell-container">
			<h2 class="cell-title">{title}</h2>
			<div class="cell-details">
				<ul class="grid grid--credit-lockups">
					{#each artists as artist, i}
						<li class="grid-item">
							<div class="credit-lockup__container">
								<div class="artist-artwork">
									{#if artist.picUrl}
										<img src={getArtworkUrl(artist.picUrl, 96)} alt={artist.name} loading="lazy" />
									{:else}
										<svg class="monogram" viewBox="0 0 640 640" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="monogram-{monogramPrefix}-{i}" x1="50%" y1="0%" x2="50%" y2="100%"><stop offset="0%" stop-color="#A5ABB8"></stop><stop offset="100%" stop-color="#848993"></stop></linearGradient></defs><rect width="100%" height="100%" fill="url(#monogram-{monogramPrefix}-{i})"></rect><text x="320" y="50%" dy="0.35em" font-size="310" letter-spacing="3" fill="#fff" text-anchor="middle">{artist.name[0]}</text></svg>
									{/if}
								</div>
								<div class="artist-metadata">
									<div class="artist-name">{artist.name}</div>
									<div class="artist-roles">{artist.roles}</div>
								</div>
							</div>
						</li>
					{/each}
				</ul>
			</div>
		</section>
	</div>
</div>