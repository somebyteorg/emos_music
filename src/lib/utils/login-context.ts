import { getOrCreateDeviceId } from './device-id';
import { getStickyCnIp } from './cn-ip-pool';


export interface LoginContext {
	realIP: string;
	ua: string;
	deviceId: string;
}

interface ClientInfo {
	ip: string;
	country: string;
}

const REAL_IP_KEY = 'emos_real_ip';

let cachedClientInfo: ClientInfo | null = null;
let clientInfoPromise: Promise<ClientInfo> | null = null;

async function getClientInfo(): Promise<ClientInfo> {
	if (cachedClientInfo) return cachedClientInfo;
	if (clientInfoPromise) return clientInfoPromise;
	clientInfoPromise = fetch('/api/client-info')
		.then(res => res.json() as Promise<ClientInfo>)
		.then(info => {
			cachedClientInfo = info;
			clientInfoPromise = null;
			return info;
		})
		.catch(() => {
			clientInfoPromise = null;
			return { ip: '', country: '' };
		});
	return clientInfoPromise;
}

function getStoredRealIP(): string | null {
	if (typeof localStorage === 'undefined') return null;
	try {
		return localStorage.getItem(REAL_IP_KEY);
	} catch {
		return null;
	}
}

function storeRealIP(ip: string): void {
	if (typeof localStorage === 'undefined') return;
	try {
		localStorage.setItem(REAL_IP_KEY, ip);
	} catch {
		console.warn('Failed to store realIP');
	}
}

export function clearClientInfoCache(): void {
	cachedClientInfo = null;
}

export function clearRealIP(): void {
	if (typeof localStorage === 'undefined') return;
	try {
		localStorage.removeItem(REAL_IP_KEY);
	} catch {
		console.warn('Failed to clear realIP');
	}
	cachedClientInfo = null;
}

export async function buildLoginContext(): Promise<LoginContext> {
	const deviceId = getOrCreateDeviceId();
	const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';

	const stored = getStoredRealIP();
	if (stored) {
		return { realIP: stored, ua, deviceId };
	}

	const info = await getClientInfo();
	const realIP = info.ip && info.country === 'CN' ? info.ip : getStickyCnIp(deviceId);

	storeRealIP(realIP);
	return { realIP, ua, deviceId };
}

export function getRealIP(): string {
	return getStoredRealIP() || '';
}
