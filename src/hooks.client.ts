import * as Sentry from '@sentry/sveltekit';
import { PUBLIC_SENTRY_DSN } from '$env/static/public';

const dsn = PUBLIC_SENTRY_DSN || '';
if (dsn) {
	Sentry.init({
		dsn,
		tracesSampleRate: 0.1
	});
}

export const handleError = dsn ? Sentry.handleErrorWithSentry() : ({ error }: { error: unknown }) => {
	console.error(error);
};