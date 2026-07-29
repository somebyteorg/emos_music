<script lang="ts">
	import ContentModal from '$lib/components/ContentModal.svelte';
	import type { EmosLyricLine, EmosSong } from '$lib/types/emos';

	interface Props {
		song: EmosSong;
		lyricLines: EmosLyricLine[];
		open: boolean;
		onclose: () => void;
	}

	let { song, lyricLines, open, onclose }: Props = $props();

	let subtitle = $derived.by(() => {
		const parts = [song.al.name, song.ar.map(a => a.name).join('、')];
		const dateStr = song.publishTime ? new Date(song.publishTime).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' }) : '';
		return [...parts, dateStr].filter(Boolean).join(' · ');
	});
</script>

<ContentModal title={song.name} {subtitle} {open} {onclose}>
		{#each lyricLines as line}
			<p>{line.text}</p>
		{/each}
</ContentModal>