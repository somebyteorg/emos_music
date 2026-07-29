const DEVICE_ID_KEY = 'emos_device_id';

function generateDeviceId(): string {
	const arr = new Uint8Array(16);
	crypto.getRandomValues(arr);
	return Array.from(arr, b => b.toString(16).padStart(2, '0')).join('');
}

export function getOrCreateDeviceId(): string {
	if (typeof localStorage === 'undefined') return generateDeviceId();
	try {
		let id = localStorage.getItem(DEVICE_ID_KEY);
		if (!id) {
			id = generateDeviceId();
			localStorage.setItem(DEVICE_ID_KEY, id);
		}
		return id;
	} catch {
		return generateDeviceId();
	}
}

export function clearDeviceId(): void {
	if (typeof localStorage === 'undefined') return;
	try {
		localStorage.removeItem(DEVICE_ID_KEY);
	} catch {
		console.warn('Failed to clear deviceId');
	}
}