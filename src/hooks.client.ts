import { PUBLIC_SENTRY_DSN } from '$env/static/public';

const dsn = PUBLIC_SENTRY_DSN || '';

// Sentry 动态加载：dsn 存在时才异步拉取 SDK（约 140KB），不阻塞首屏
let sentryMod: typeof import('@sentry/sveltekit') | null = null;

if (dsn) {
	import('@sentry/sveltekit')
		.then((m) => {
			m.init({
				dsn,
				tracesSampleRate: 0.1
			});
			sentryMod = m;
		})
		.catch((e) => {
			console.warn('Sentry 初始化失败:', e);
		});
}

export const handleError = ({ error }: { error: unknown }) => {
	if (sentryMod) {
		sentryMod.captureException(error);
	} else {
		console.error(error);
	}
};