import type { Attachment } from '../domain/message.types.js';

export interface UploadMediaResponse {
	attachment: Attachment;
	messageId: string;
}

export interface MediaUploadMeta {
	conversationId: string;
	replyToId?: string;
	durationMs?: number;
}
