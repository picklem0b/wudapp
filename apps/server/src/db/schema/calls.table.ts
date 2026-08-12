import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { users } from './users.table.js';
import { conversations } from './conversations.table.js';

export const calls = sqliteTable('calls', {
	id: text('id').primaryKey(),
	conversationId: text('conversation_id')
		.notNull()
		.references(() => conversations.id),
	type: text('type', { enum: ['voice', 'video'] }).notNull(),
	initiatedBy: text('initiated_by')
		.notNull()
		.references(() => users.id),
	status: text('status', {
		enum: ['ringing', 'active', 'ended', 'missed', 'declined']
	})
		.notNull()
		.default('ringing'),
	startedAt: text('started_at'),
	endedAt: text('ended_at')
});

export const callParticipants = sqliteTable('call_participants', {
	callId: text('call_id')
		.notNull()
		.references(() => calls.id, { onDelete: 'cascade' }),
	userId: text('user_id')
		.notNull()
		.references(() => users.id),
	joinedAt: text('joined_at')
		.notNull()
		.default(sql`(datetime('now'))`),
	leftAt: text('left_at'),
	durationMs: integer('duration_ms')
});
