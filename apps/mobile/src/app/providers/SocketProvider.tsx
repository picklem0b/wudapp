import {
	createContext,
	useContext,
	useEffect,
	useState,
	type ReactNode
} from 'react';
import {
	getSocket,
	disconnectSocket,
	type TypedSocket
} from '../../infrastructure/socket.client';

interface SocketContextValue {
	socket: TypedSocket | null;
	connected: boolean;
}

const SocketContext = createContext<SocketContextValue>({
	socket: null,
	connected: false
});

export function SocketProvider({
	token,
	children
}: {
	token: string | null;
	children: ReactNode;
}) {
	const [socket, setSocket] = useState<TypedSocket | null>(null);
	const [connected, setConnected] = useState(false);

	useEffect(() => {
		if (!token) return;
		const s = getSocket(token);
		setSocket(s);

		s.on('connect', () => setConnected(true));
		s.on('disconnect', () => setConnected(false));

		if (s.connected) setConnected(true);

		return () => {
			disconnectSocket();
			setSocket(null);
			setConnected(false);
		};
	}, [token]);

	return (
		<SocketContext.Provider value={{ socket, connected }}>
			{children}
		</SocketContext.Provider>
	);
}

export const useSocketContext = () => useContext(SocketContext);
