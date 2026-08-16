import { bootstrapEmosSession, resetSession } from '$lib/services/emos';

export interface EmosUser {
	id: number;
	nickname: string;
	avatarUrl: string;
	vipType?: number;
	token?: string;
}

const STORAGE_KEY = 'emos_user';
const TOKEN_STORAGE_KEY = 'emos_token';

type Listener = (user: EmosUser | null) => void;

const listeners = new Set<Listener>();
let currentUser: EmosUser | null = null;
let currentToken = '';

function notify(): void {
	for (const fn of listeners) fn(currentUser);
}

function loadFromStorage(): void {
	if (typeof localStorage === 'undefined') return;
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (raw) {
			currentUser = JSON.parse(raw) as EmosUser;
		}
		currentToken = localStorage.getItem(TOKEN_STORAGE_KEY) ?? currentUser?.token ?? '';
	} catch {
		console.warn('Failed to load emos user from localStorage');
	}
}

function handleStorageChange(event: StorageEvent): void {
	if (event.key !== STORAGE_KEY && event.key !== TOKEN_STORAGE_KEY) return;
	loadFromStorage();
	notify();
}

function saveToStorage(): void {
	if (typeof localStorage === 'undefined') return;
	try {
		if (currentUser) {
			localStorage.setItem(STORAGE_KEY, JSON.stringify(currentUser));
		} else {
			localStorage.removeItem(STORAGE_KEY);
		}
		if (currentToken) {
			localStorage.setItem(TOKEN_STORAGE_KEY, currentToken);
		} else {
			localStorage.removeItem(TOKEN_STORAGE_KEY);
		}
	} catch {
		console.warn('Failed to save emos user to localStorage');
	}
}

export function subscribeEmosAuth(fn: Listener): () => void {
	listeners.add(fn);
	fn(currentUser);
	return () => listeners.delete(fn);
}

export function getEmosUser(): EmosUser | null {
	return currentUser;
}

export function getEmosToken(): string {
	return currentToken;
}

export function isEmosLoggedIn(): boolean {
	return currentUser !== null;
}

export function setEmosToken(token: string): void {
	currentToken = token.replace(/^Bearer\s+/i, '').trim();
	if (currentUser) currentUser = { ...currentUser, token: currentToken };
	saveToStorage();
	notify();
}

export function clearEmosAuth(): void {
	currentUser = null;
	currentToken = '';
	if (typeof document !== 'undefined') document.cookie = 'emos_session=; path=/; max-age=0';
	saveToStorage();
	notify();
	resetSession();
}

function applyLoginStatus(result: {
	account?: { id: number; userName?: string; nickname?: string; vipType?: number } | null;
	profile?: { nickname: string; avatarUrl: string; userId: number; vipType?: number } | null;
	token?: string;
}): void {
	if (!result.profile) {
		clearEmosAuth();
		return;
	}

	currentToken = result.token ?? currentToken;
	currentUser = {
		id: result.profile.userId,
		nickname: result.profile.nickname,
		avatarUrl: result.profile.avatarUrl,
		vipType: result.account?.vipType ?? result.profile.vipType ?? 0,
		token: currentToken || undefined
	};
	saveToStorage();
	notify();
}

export async function bootstrapEmosAuth(): Promise<void> {
	try {
		const result = await bootstrapEmosSession();
		const status = result.status;
		// 请求未携带 token 时，后端必然返回 is_sign:false，不代表本地凭据失效，
		// 不可据此清空已恢复的本地会话（防止刷新/HMR 竞态导致登录态被反复清除）
		if (!status.profile && !status.hadToken) return;
		applyLoginStatus(status);
	} catch {
		// 验证请求失败（网络/超时）：保留本地登录态乐观恢复，不清空。
		console.warn('Emos auth bootstrap failed, keeping local session');
	}
}

loadFromStorage();

if (typeof window !== 'undefined') {
	window.addEventListener('storage', handleStorageChange);
}
