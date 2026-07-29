import type { Handle } from '@sveltejs/kit';


const SENTRY_DSN = ''; // Set via SENTRY_DSN env var in Cloudflare Workers
const SENTRY_PROJECT_ID = '4511699215777792';


let resolvedSentryDsn = SENTRY_DSN;

async function reportToSentry(error: unknown, request: Request): Promise<void> {
	if (!resolvedSentryDsn) return;
	try {
		const event = {
			message: error instanceof Error ? error.message : String(error),
			timestamp: Date.now() / 1000,
			level: 'error',
			platform: 'node',
			request: {
				url: request.url,
				method: request.method,
				headers: Object.fromEntries(request.headers.entries())
			},
			extra: {
				stack: error instanceof Error ? error.stack : undefined
			}
		};

		const envelope = JSON.stringify({ dsn: resolvedSentryDsn }) + '\n' + JSON.stringify(event);

		await fetch(`https://o4511699213156352.ingest.us.sentry.io/api/${SENTRY_PROJECT_ID}/envelope/`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: envelope
		});
	} catch (e) {
		console.error('Failed to report to Sentry:', e);
	}
}

const ALLOWED_ORIGINS = new Set([
	'https://music.emos.club',
	'https://music.cx4096846.workers.dev',
	'http://localhost:5173',
	'http://127.0.0.1:5173'
]);


function getClientIP(request: Request, event: { getClientAddress: () => string }): string {
	return request.headers.get('cf-connecting-ip')
		|| request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
		|| event.getClientAddress();
}


function isOriginAllowed(request: Request): boolean {
	const origin = request.headers.get('origin');
	if (!origin) {
		const referer = request.headers.get('referer');
		if (!referer) return false;
		try {
			const url = new URL(referer);
			return ALLOWED_ORIGINS.has(url.origin);
		} catch {
			return false;
		}
	}
	return ALLOWED_ORIGINS.has(origin);
}

function sanitizeProxyResponseHeaders(headers: Headers): Headers {
	const next = new Headers(headers);
	next.delete('content-encoding');
	next.delete('content-length');
	next.delete('transfer-encoding');
	next.delete('connection');
	return next;
}

const myHandle: Handle = async ({ event, resolve }) => {
	try {
		const { pathname } = event.url;
		const env = (event.platform as Record<string, unknown> | undefined)?.env as Record<string, string> ?? {};
		if (!resolvedSentryDsn && env.SENTRY_DSN) resolvedSentryDsn = env.SENTRY_DSN;

	if (pathname === '/api/client-info') {
		if (!isOriginAllowed(event.request)) {
			return new Response('Forbidden', { status: 403 });
		}
		const ip = getClientIP(event.request, event);
		const country = event.request.headers.get('cf-ipcountry') || '';
		return new Response(JSON.stringify({ ip, country }), {
			headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' }
		});
	}

	if (pathname.startsWith('/api/')) {
		if (!isOriginAllowed(event.request)) {
			return new Response('Forbidden', { status: 403 });
		}

		let target = '';
		const extraHeaders: Record<string, string> = {};

		if (pathname.startsWith('/api/emos-root')) {
			target = (env?.EMOS_ORIGIN || env?.VITE_EMOS_ORIGIN || 'https://emos.best') + pathname.replace(/^\/api\/emos-root/, '') + event.url.search;
		} else if (pathname.startsWith('/api/emos')) {
			target = (env?.EMOS_API_URL || env?.VITE_EMOS_API_URL || 'https://emos.best/api') + pathname.replace(/^\/api\/emos/, '') + event.url.search;
		}


		if (target) {
			const headers = new Headers(event.request.headers);
			Object.entries(extraHeaders).forEach(([k, v]) => headers.set(k, v));

			const init: RequestInit & { duplex?: string } = { method: event.request.method, headers };
			if (event.request.method !== 'GET' && event.request.method !== 'HEAD') {
				init.body = event.request.body;
				init.duplex = 'half';
			}
			const res = await fetch(target, init);

			return new Response(res.body, {
				status: res.status,
				statusText: res.statusText,
				headers: sanitizeProxyResponseHeaders(res.headers)
			});
		}
	}

	const response = await resolve(event);

	const headers = new Headers(response.headers);
	if (pathname.startsWith('/_app/immutable/')) {
		headers.set('Cache-Control', 'public, immutable, max-age=31536000');
	} else {
		headers.set('Cache-Control', 'no-cache');
	}
	if (!pathname.startsWith('/api/')) {
		headers.set('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' https: data:; connect-src 'self' https://o4511699213156352.ingest.us.sentry.io; font-src 'self'; media-src 'self' https:; frame-ancestors 'none'");
	}

		return new Response(response.body, {
			status: response.status,
			statusText: response.statusText,
			headers
		});
	} catch (error) {
		reportToSentry(error, event.request);
		throw error;
	}
};

export const handle = myHandle;
