export function formatDuration(ms: number): string {
	const totalSec = Math.floor(ms / 1000);
	const min = Math.floor(totalSec / 60);
	const sec = totalSec % 60;
	return `${min}:${sec.toString().padStart(2, '0')}`;
}

export function albumSubtitle(album: { type?: string; publishTime?: number }, showYear = true): string {
	const type = album.type === 'Single' ? '单曲' : album.type === 'EP' ? 'EP' : '专辑';
	const year = showYear && album.publishTime ? ` · ${new Date(album.publishTime).getFullYear()}年` : '';
	return type + year;
}

export function formatTotalDuration(ms: number): string {
	const totalMin = Math.floor(ms / 60000);
	const hours = Math.floor(totalMin / 60);
	const mins = totalMin % 60;
	if (hours > 0) return `${hours} 小时 ${mins} 分钟`;
	return `${mins} 分钟`;
}