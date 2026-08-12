import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocketContext } from '../../../app/providers/SocketProvider';
import { useCallsStore } from '../store/calls.store';
import type { Call } from '@wudapp/types';

export function useCallSignaling() {
	const { socket } = useSocketContext();
	const navigate = useNavigate();
	const { setIncoming, setActive } = useCallsStore();

	useEffect(() => {
		if (!socket) return;

		socket.on('call:incoming', (call: Call) => {
			setIncoming(call);
			// Auto-navigate to call screen — auth will gate this properly later
			navigate(`/call/${call.id}`);
		});

		socket.on('call:accepted', ({ callId }) => {
			const incoming = useCallsStore.getState().incomingCall;
			if (incoming && incoming.id === callId) {
				setActive(incoming);
				setIncoming(null);
				navigate(`/call/${callId}`);
			}
		});

		socket.on('call:ended', ({ callId: _callId }) => {
			setActive(null);
			setIncoming(null);
			navigate('/');
		});

		socket.on('call:declined', () => {
			setIncoming(null);
		});

		return () => {
			socket.off('call:incoming');
			socket.off('call:accepted');
			socket.off('call:ended');
			socket.off('call:declined');
		};
	}, [socket, navigate, setIncoming, setActive]);
}
