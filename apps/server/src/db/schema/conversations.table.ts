import { sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { users } from './users.table.js';

export const conversations = sqliteTable('conversations', {
	id:   text('id').primaryKey(),
	type: text('type', { enum: ['dm', 'group'] }).notNull(),
	name: text('name'),
	createdBy: text('created_by')
		.notNull()
		.references(() => users.id),
	createdAt: text('created_at')
		.notNull()
		.default(sql`(datetime('now'))`)
});

export const conversationMembers = sqliteTable('conversation_members', {
	conversationId: text('conversation_id')
		.notNull()
		.references(() => conversations.id, { onDelete: 'cascade' }),
	userId:         text('user_id')
		.notNull()
		.references(() => users.id, { onDelete: 'cascade' }),
	role:           text('role', { enum: ['owner', 'admin', 'member'] })
		.notNull()
		.default('member'),
	joinedAt:       text('joined_at')
		.notNull()
		.default(sql`(datetime('now'))`)
});
