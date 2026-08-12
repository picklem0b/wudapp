import { create } from 'zustand';
import type { Call } from '@wudapp/types';

export type CallPhase = 'idle' | 'outgoing' | 'incoming' | 'active';

interface CallsState {
	activeCall: Call | null;
	incomingCall: Call | null;
	outgoingCall: Call | null;
	phase: CallPhase;
	setActive: (call: Call | null) => void;
	setIncoming: (call: Call | null) => void;
	setOutgoing: (call: Call | null) => void;
	setPhase: (phase: CallPhase) => void;
	clearAll: () => void;
}

export const useCallsStore = create<CallsState>(set => ({
	activeCall: null,
	incomingCall: null,
	outgoingCall: null,
	phase: 'idle',
	setActive: call => set({ activeCall: call }),
	setIncoming: call => set({ incomingCall: call }),
	setOutgoing: call => set({ outgoingCall: call }),
	setPhase: phase => set({ phase }),
	clearAll: () =>
		set({
			activeCall: null,
			incomingCall: null,
			outgoingCall: null,
			phase: 'idle'
		})
}));
