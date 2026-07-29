import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
	const env = loadEnv(mode, process.cwd(), '');
	const emosOrigin = env.VITE_EMOS_ORIGIN || env.VITE_EMOS_API_URL?.replace(/\/api\/?$/, '') || '';
	return {
		plugins: [
			sveltekit()
		],
		resolve: {
			extensions: ['.svelte.ts', '.ts', '.js', '.svelte', '.json']
		},
		server: {
			host: '0.0.0.0',
			port: 5173,
			proxy: {

				'/api/emos': {
					target: env.VITE_EMOS_API_URL,
					changeOrigin: true,
					rewrite: (path) => path.replace(/^\/api\/emos/, ''),
					secure: false
				},
				'/api/emos-root': {
					target: emosOrigin,
					changeOrigin: true,
					rewrite: (path) => path.replace(/^\/api\/emos-root/, ''),
					secure: false
				}
			}
		}
	};
});
