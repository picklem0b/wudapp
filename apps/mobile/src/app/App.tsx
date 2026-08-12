import { QueryProvider } from './providers/QueryProvider';
import { ThemeProvider } from './providers/ThemeProvider';
import { SocketProvider } from './providers/SocketProvider';
import { AppRouter } from './Router';
import { useAuthStore } from '../modules/auth/store/auth.store';

function AppWithProviders() {
	const token = useAuthStore(s => s.token);
	return (
		<SocketProvider token={token}>
			<AppRouter />
		</SocketProvider>
	);
}

export function App() {
	return (
		<QueryProvider>
			<ThemeProvider>
				<AppWithProviders />
			</ThemeProvider>
		</QueryProvider>
	);
}
