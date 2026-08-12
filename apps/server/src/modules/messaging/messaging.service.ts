import { eq, desc, and } from 'drizzle-orm';
import { db } from '../../db/client.js';
import {
	messages,
	conversations,
	conversationMembers,
	messageReads
} from '../../db/schema/index.js';
import { generateId } from '../../shared/utils/id.js';
import type { Message, Conversation } from '@wudapp/types';

export class MessagingService {
	async createConversation(
		createdBy: string,
		type: 'dm' | 'group',
		memberIds: string[],
		name?: string
	): Promise<Conversation> {
		const id = generateId();
		await db
			.insert(conversations)
			.values({ id, type, name: name ?? null, createdBy });

		const allMembers = Array.from(new Set([createdBy, ...memberIds]));
		await db.insert(conversationMembers).values(
			allMembers.map(userId => ({
				conversationId: id,
				userId,
				role:
					userId === createdBy
						? ('owner' as const)
						: ('member' as const)
			}))
		);

		return this.getConversation(id) as Promise<Conversation>;
	}

	async getConversation(id: string): Promise<Conversation | null> {
		const conv = await db.query.conversations.findFirst({
			where: eq(conversations.id, id),
			with: { conversationMembers: { with: { user: true } } }
		});
		return (conv as any) ?? null;
	}

	async getUserConversations(userId: string): Promise<Conversation[]> {
		const memberships = await db.query.conversationMembers.findMany({
			where: eq(conversationMembers.userId, userId),
			with: { conversation: true }
		});
		return memberships.map((m: any) => m.conversation) as any[];
	}

	async sendMessage(
		senderId: string,
		conversationId: string,
		content: string | undefined,
		type: Message['type'],
		replyToId?: string
	): Promise<Message> {
		const id = generateId();
		await db.insert(messages).values({
			id,
			conversationId,
			senderId,
			content: content ?? null,
			type,
			replyToId: replyToId ?? null
		});
		return this.getMessage(id) as Promise<Message>;
	}

	async getMessage(id: string): Promise<Message | null> {
		return db.query.messages.findFirst({
			where: eq(messages.id, id),
			with: { sender: true, attachment: true }
		}) as any;
	}

	async getMessages(
		conversationId: string,
		cursor?: string,
		limit = 50
	): Promise<Message[]> {
		const result = await db.query.messages.findMany({
			where: eq(messages.conversationId, conversationId),
			orderBy: [desc(messages.createdAt)],
			limit,
			with: { sender: true, attachment: true }
		});
		return result as unknown as Message[];
	}

	async editMessage(
		messageId: string,
		senderId: string,
		content: string
	): Promise<void> {
		await db
			.update(messages)
			.set({ content, editedAt: new Date().toISOString() })
			.where(
				and(eq(messages.id, messageId), eq(messages.senderId, senderId))
			);
	}

	async deleteMessage(messageId: string, senderId: string): Promise<void> {
		await db
			.update(messages)
			.set({ deletedAt: new Date().toISOString() })
			.where(
				and(eq(messages.id, messageId), eq(messages.senderId, senderId))
			);
	}

	async markDelivered(messageId: string, userId: string): Promise<void> {
		await db
			.insert(messageReads)
			.values({
				messageId,
				userId,
				deliveredAt: new Date().toISOString()
			})
			.onConflictDoNothing();
	}

	async markRead(messageId: string, userId: string): Promise<void> {
		await db
			.update(messageReads)
			.set({ readAt: new Date().toISOString() })
			.where(
				and(
					eq(messageReads.messageId, messageId),
					eq(messageReads.userId, userId)
				)
			);
	}
}

export const messagingService = new MessagingService();
