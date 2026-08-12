import type { Conversation, Message } from '../domain/message.types.js';

export interface SendMessageBody {
	conversationId: string;
	content?: string;
	type: 'text' | 'image' | 'video' | 'voice';
	replyToId?: string;
}

export interface EditMessageBody {
	content: string;
}

export interface CreateConversationBody {
	type: 'dm' | 'group';
	memberIds: string[];
	name?: string;
}

export interface GetConversationsResponse {
	conversations: Conversation[];
}

export interface GetMessagesResponse {
	messages: Message[];
	cursor: string | null;
}

export interface SendMessageResponse {
	message: Message;
}
