// VITE_API_URL is injected at build time by GitHub Actions
// Falls back to localhost for local dev
const API_URL = import.meta.env['VITE_API_URL'] ?? 'http://localhost:3001';

export const config = {
	apiBaseUrl: API_URL,
	socketUrl: API_URL
} as const;
