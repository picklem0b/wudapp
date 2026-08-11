import { sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { users } from './users.table.js';
import { conversations } from './conversations.table.js';

export const messages = sqliteTable('messages', {
	id: text('id').primaryKey(),
	conversationId: text('conversation_id')
		.notNull()
		.references(() => conversations.id, { onDelete: 'cascade' }),
	senderId: text('sender_id')
		.notNull()
		.references(() => users.id),
	content: text('content'),
	type: text('type', {
		enum: ['text', 'image', 'video', 'voice', 'system']
	}).notNull(),
	replyToId: text('reply_to_id'), // self-reference — no FK constraint (SQLite limitation)
	editedAt: text('edited_at'),
	deletedAt: text('deleted_at'),
	createdAt: text('created_at')
		.notNull()
		.default(sql`(datetime('now'))`)
});

export const messageReads = sqliteTable('message_reads', {
	messageId: text('message_id')
		.notNull()
		.references(() => messages.id, { onDelete: 'cascade' }),
	userId: text('user_id')
		.notNull()
		.references(() => users.id, { onDelete: 'cascade' }),
	deliveredAt: text('delivered_at'),
	readAt: text('read_at')
});
