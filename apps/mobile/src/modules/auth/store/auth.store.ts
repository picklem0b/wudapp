import { create } from 'zustand';
import type { User } from '@wudapp/types';

// ─── Dev guest — skip auth until auth module is built ─────────────────────────
const DEV_USER: User = {
	id: 'dev-user-1',
	username: 'devuser',
	displayName: 'Dev User',
	avatarPath: null,
	status: 'online',
	lastSeen: new Date().toISOString(),
	createdAt: new Date().toISOString()
};
const DEV_TOKEN = 'dev-token';

interface AuthState {
	user: User | null;
	token: string | null;
	setAuth: (user: User, token: string) => void;
	clearAuth: () => void;
}

export const useAuthStore = create<AuthState>(set => ({
	user: DEV_USER,
	token: DEV_TOKEN,
	setAuth: (user, token) => {
		localStorage.setItem('wudapp:token', token);
		set({ user, token });
	},
	clearAuth: () => {
		localStorage.removeItem('wudapp:token');
		set({ user: null, token: null });
	}
}));
