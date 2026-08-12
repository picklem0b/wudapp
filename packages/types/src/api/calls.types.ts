import type { Call } from '../domain/call.types.js';

export interface InitiateCallBody {
	conversationId: string;
	type: 'voice' | 'video';
}

export interface InitiateCallResponse {
	call: Call;
}

export interface GetCallHistoryResponse {
	calls: Call[];
}
