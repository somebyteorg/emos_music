import CIDR_DATA from '$lib/data/china-ip-ranges.txt?raw';

interface CidrRange {
	start: number;
	end: number;
}

function ipToNum(a: number, b: number, c: number, d: number): number {
	return ((a << 24) | (b << 16) | (c << 8) | d) >>> 0;
}

function numToIp(n: number): string {
	return `${(n >>> 24) & 0xff}.${(n >>> 16) & 0xff}.${(n >>> 8) & 0xff}.${n & 0xff}`;
}

function parseCidr(cidr: string): CidrRange | null {
	const parts = cidr.trim().split('/');
	if (parts.length !== 2) return null;
	const octets = parts[0].split('.').map(Number);
	const prefix = Number(parts[1]);
	if (octets.length !== 4 || octets.some(o => isNaN(o) || o < 0 || o > 255)) return null;
	if (isNaN(prefix) || prefix < 0 || prefix > 32) return null;
	const ip = ipToNum(octets[0], octets[1], octets[2], octets[3]);
	const mask = prefix === 0 ? 0 : (~0 << (32 - prefix)) >>> 0;
	const start = (ip & mask) >>> 0;
	const end = (start | (~mask >>> 0)) >>> 0;
	return { start, end };
}

const CIDR_RANGES: CidrRange[] = CIDR_DATA
	.split('\n')
	.map(line => parseCidr(line))
	.filter((r): r is CidrRange => r !== null);

const TOTAL_CIDR_IPS = CIDR_RANGES.reduce((sum, r) => sum + (r.end - r.start + 1), 0);

const CN_IP_POOL: string[] = (() => {
	const poolSize = 512;
	const pool: string[] = [];
	for (let i = 0; i < poolSize; i++) {
		const target = (i / poolSize) * TOTAL_CIDR_IPS;
		let acc = 0;
		for (const range of CIDR_RANGES) {
			const rangeSize = range.end - range.start + 1;
			if (acc + rangeSize > target) {
				const offset = Math.min(target - acc, rangeSize - 1);
				pool.push(numToIp(range.start + offset));
				break;
			}
			acc += rangeSize;
		}
	}
	return pool;
})();

export { CN_IP_POOL };

export function getStickyCnIp(userKey: string): string {
	let hash = 0;
	for (let i = 0; i < userKey.length; i++) {
		hash = ((hash << 5) - hash + userKey.charCodeAt(i)) | 0;
	}
	const index = ((hash % CN_IP_POOL.length) + CN_IP_POOL.length) % CN_IP_POOL.length;
	return CN_IP_POOL[index];
}

export function isCnIp(ip: string): boolean {
	const octets = ip.split('.').map(Number);
	if (octets.length !== 4 || octets.some(o => isNaN(o))) return false;
	const num = ipToNum(octets[0], octets[1], octets[2], octets[3]);
	for (const range of CIDR_RANGES) {
		if (num >= range.start && num <= range.end) return true;
	}
	return false;
}
