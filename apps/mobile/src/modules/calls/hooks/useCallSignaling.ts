import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocketContext } from '../../../app/providers/SocketProvider';
import { useCallsStore } from '../store/calls.store';
import type { Call } from '@wudapp/types';

export function useCallSignaling() {
	const { socket } = useSocketContext();
	const navigate = useNavigate();
	const { setIncoming, setActive, setOutgoing, setPhase, clearAll } =
		useCallsStore();

	useEffect(() => {
		if (!socket) return;

		// ── Incoming call ─────────────────────────────────────────────────────
		socket.on('call:incoming', (call: Call) => {
			setIncoming(call);
			setPhase('incoming');
			navigate(`/call/${call.id}`);
		});

		// ── Callee accepted — both sides go active ────────────────────────────
		socket.on('call:accepted', ({ callId }) => {
			const store = useCallsStore.getState();
			const call = store.outgoingCall ?? store.incomingCall;
			if (call && call.id === callId) {
				setActive({ ...call, status: 'active' });
				setOutgoing(null);
				setIncoming(null);
				setPhase('active');
				navigate(`/call/${callId}`);
			}
		});

		// ── Caller cancelled or other side hung up ────────────────────────────
		socket.on('call:ended', () => {
			clearAll();
			navigate('/');
		});

		// ── Callee declined ───────────────────────────────────────────────────
		socket.on('call:declined', () => {
			clearAll();
			navigate('/');
		});

		return () => {
			socket.off('call:incoming');
			socket.off('call:accepted');
			socket.off('call:ended');
			socket.off('call:declined');
		};
	}, [
		socket,
		navigate,
		setIncoming,
		setActive,
		setOutgoing,
		setPhase,
		clearAll
	]);
}
