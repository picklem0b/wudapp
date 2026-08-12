import type { Message } from '../domain/message.types';
import type { User } from '../domain/user.types';
import type { Call } from '../domain/call.types';
export interface ServerToClientEvents {
    'message:new': (message: Message) => void;
    'message:edited': (payload: {
        messageId: string;
        content: string;
        editedAt: string;
    }) => void;
    'message:deleted': (payload: {
        messageId: string;
        conversationId: string;
    }) => void;
    'message:delivered': (payload: {
        messageId: string;
        userId: string;
        deliveredAt: string;
    }) => void;
    'message:read': (payload: {
        messageId: string;
        userId: string;
        readAt: string;
    }) => void;
    'typing:start': (payload: {
        conversationId: string;
        user: Pick<User, 'id' | 'displayName'>;
    }) => void;
    'typing:stop': (payload: {
        conversationId: string;
        userId: string;
    }) => void;
    'presence:update': (payload: {
        userId: string;
        status: User['status'];
        lastSeen: string;
    }) => void;
    'call:incoming': (call: Call) => void;
    'call:accepted': (payload: {
        callId: string;
        userId: string;
    }) => void;
    'call:declined': (payload: {
        callId: string;
        userId: string;
    }) => void;
    'call:ended': (payload: {
        callId: string;
    }) => void;
    'webrtc:offer': (payload: {
        callId: string;
        fromUserId: string;
        sdp: RTCSessionDescriptionInit;
    }) => void;
    'webrtc:answer': (payload: {
        callId: string;
        fromUserId: string;
        sdp: RTCSessionDescriptionInit;
    }) => void;
    'webrtc:ice-candidate': (payload: {
        callId: string;
        fromUserId: string;
        candidate: RTCIceCandidateInit;
    }) => void;
}
export interface ClientToServerEvents {
    'conversation:join': (conversationId: string) => void;
    'conversation:leave': (conversationId: string) => void;
    'typing:start': (payload: {
        conversationId: string;
    }) => void;
    'typing:stop': (payload: {
        conversationId: string;
    }) => void;
    'message:delivered': (payload: {
        messageId: string;
    }) => void;
    'message:read': (payload: {
        messageId: string;
    }) => void;
    'call:initiate': (payload: {
        conversationId: string;
        type: 'voice' | 'video';
    }) => void;
    'call:accept': (payload: {
        callId: string;
    }) => void;
    'call:decline': (payload: {
        callId: string;
    }) => void;
    'call:end': (payload: {
        callId: string;
    }) => void;
    'webrtc:offer': (payload: {
        callId: string;
        toUserId: string;
        sdp: RTCSessionDescriptionInit;
    }) => void;
    'webrtc:answer': (payload: {
        callId: string;
        toUserId: string;
        sdp: RTCSessionDescriptionInit;
    }) => void;
    'webrtc:ice-candidate': (payload: {
        callId: string;
        toUserId: string;
        candidate: RTCIceCandidateInit;
    }) => void;
}
export interface InterServerEvents {
}
export interface SocketData {
    userId: string;
    username: string;
}
//# sourceMappingURL=events.types.d.ts.map