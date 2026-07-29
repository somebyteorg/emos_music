const MAX_CONCURRENT = 6;

export async function concurrentLimit<T>(
	tasks: (() => Promise<T>)[],
	limit: number = MAX_CONCURRENT
): Promise<T[]> {
	const results: T[] = [];
	let index = 0;

	async function worker() {
		while (index < tasks.length) {
			const i = index++;
			results[i] = await tasks[i]();
		}
	}

	await Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, () => worker()));
	return results;
}