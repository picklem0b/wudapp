import type { Call } from '../domain/call.types';
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
//# sourceMappingURL=calls.types.d.ts.map