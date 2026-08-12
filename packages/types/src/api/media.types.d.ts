import type { Attachment } from '../domain/message.types';
export interface UploadMediaResponse {
    attachment: Attachment;
    messageId: string;
}
export interface MediaUploadMeta {
    conversationId: string;
    replyToId?: string;
    durationMs?: number;
}
//# sourceMappingURL=media.types.d.ts.map