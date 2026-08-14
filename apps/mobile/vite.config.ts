import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig(({ mode }) => ({
	plugins: [react()],
	resolve: {
		alias: {
			'@wudapp/types': path.resolve(
				__dirname,
				'../../packages/types/src/index.ts'
			)
		}
	},
	server: {
		// Dev proxy — only used when running locally
		proxy: {
			'/api': { target: 'http://localhost:3001', changeOrigin: true },
			'/uploads': { target: 'http://localhost:3001', changeOrigin: true }
		}
	},
	define: {
		// Make env vars available at build time
		__API_URL__: JSON.stringify(
			process.env.VITE_API_URL ?? 'http://localhost:3001'
		)
	}
}));
