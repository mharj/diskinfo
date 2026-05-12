/// <reference types="vitest" />

import {defineConfig} from 'vitest/config';

export default defineConfig({
	test: {
		reporters: ['verbose', 'github-actions'],
		coverage: {
			provider: 'v8',
			include: ['src/**/*.ts'],
			exclude: ['test/**/*.ts'],
			reporter: ['text'],
		},
		include: ['test/**/*.test.ts'],
		typecheck: {
			tsconfig: './tsconfig.test.json',
			include: ['test/**/*.test-d.ts'],
		},
	},
});
