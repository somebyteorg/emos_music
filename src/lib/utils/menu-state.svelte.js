import { createShareCopyMenu } from '$lib/utils/constants';

export function createMenuState() {
	let clientPos = $state(null);
	let target = $state(null);

	function open(e, value) {
		clientPos = { x: e.clientX, y: e.clientY };
		target = value;
	}

	function close() {
		clientPos = null;
		target = null;
	}

	return {
		get clientPos() { return clientPos; },
		get target() { return target; },
		get isOpen() { return clientPos !== null; },
		open,
		close
	};
}

export function createIndexMenuState() {
	return createMenuState();
}

export function createSongMenuState(getUrlFn, extraItemsFn) {
	const base = createMenuState();

	let items = $derived.by(() => {
		if (base.clientPos === null) return [];
		const extra = extraItemsFn ? extraItemsFn() : undefined;
		return createShareCopyMenu(getUrlFn, extra);
	});

	return {
		get clientPos() { return base.clientPos; },
		get songId() { return base.target; },
		get items() { return items; },
		open: base.open,
		close: base.close
	};
}
