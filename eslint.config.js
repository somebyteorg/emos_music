import js from '@eslint/js';
import svelte from 'eslint-plugin-svelte';
import globals from 'globals';
import ts from 'typescript-eslint';

export default ts.config(
	js.configs.recommended,
	...ts.configs.recommended,
	...svelte.configs['flat/recommended'],
	{
		languageOptions: {
			globals: {
				...globals.browser,
				...globals.node
			}
		}
	},
	{
		files: ['**/*.svelte'],
		languageOptions: {
			parserOptions: {
				parser: ts.parser,
				svelteConfig: {
					compilerOptions: {
						runes: true
					}
				}
			}
		}
	},
	{
		rules: {
			'@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
			'@typescript-eslint/no-explicit-any': 'warn',
			'svelte/no-at-html': 'off',
			'svelte/no-navigation-without-resolve': 'off',
			'svelte/require-each-key': 'warn'
		}
	},
	{
		ignores: ['build/', '.svelte-kit/', 'dist/', 'node_modules/']
	}
);
