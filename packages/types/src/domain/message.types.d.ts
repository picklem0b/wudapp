export type MessageType = 'text' | 'image' | 'video' | 'voice' | 'system';
export type ConversationType = 'dm' | 'group';
export type MemberRole = 'owner' | 'admin' | 'member';
export interface Attachment {
    id: string;
    messageId: string;
    type: 'image' | 'video' | 'voice';
    originalPath: string;
    thumbnailPath: string | null;
    previewPath: string | null;
    mimeType: string;
    sizeBytes: number;
    durationMs: number | null;
    width: number | null;
    height: number | null;
    waveformData: number[] | null;
    checksum: string;
    createdAt: string;
}
export interface Message {
    id: string;
    conversationId: string;
    senderId: string;
    content: string | null;
    type: MessageType;
    replyToId: string | null;
    attachment: Attachment | null;
    editedAt: string | null;
    deletedAt: string | null;
    createdAt: string;
    sender?: import('./user.types').User;
    readBy?: MessageRead[];
}
export interface MessageRead {
    messageId: string;
    userId: string;
    deliveredAt: string | null;
    readAt: string | null;
}
export interface Conversation {
    id: string;
    type: ConversationType;
    name: string | null;
    createdBy: string;
    createdAt: string;
    members?: ConversationMember[];
    lastMessage?: Message | null;
    unreadCount?: number;
}
export interface ConversationMember {
    conversationId: string;
    userId: string;
    role: MemberRole;
    joinedAt: string;
    user?: import('./user.types').User;
}
//# sourceMappingURL=message.types.d.ts.map