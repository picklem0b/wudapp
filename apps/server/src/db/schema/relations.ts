import { relations } from 'drizzle-orm';
import { users, sessions } from './users.table.js';
import { conversations, conversationMembers } from './conversations.table.js';
import { messages, messageReads } from './messages.table.js';
import { attachments } from './attachments.table.js';
import { calls, callParticipants } from './calls.table.js';

// ── Users ─────────────────────────────────────────────────────────────────────
export const usersRelations = relations(users, ({ many }) => ({
	sessions: many(sessions),
	conversationMembers: many(conversationMembers),
	sentMessages: many(messages),
	messageReads: many(messageReads),
	callParticipants: many(callParticipants),
	initiatedCalls: many(calls)
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
	user: one(users, { fields: [sessions.userId], references: [users.id] })
}));

// ── Conversations ─────────────────────────────────────────────────────────────
export const conversationsRelations = relations(
	conversations,
	({ one, many }) => ({
		creator: one(users, {
			fields: [conversations.createdBy],
			references: [users.id]
		}),
		conversationMembers: many(conversationMembers),
		messages: many(messages),
		calls: many(calls)
	})
);

export const conversationMembersRelations = relations(
	conversationMembers,
	({ one }) => ({
		conversation: one(conversations, {
			fields: [conversationMembers.conversationId],
			references: [conversations.id]
		}),
		user: one(users, {
			fields: [conversationMembers.userId],
			references: [users.id]
		})
	})
);

// ── Messages ──────────────────────────────────────────────────────────────────
export const messagesRelations = relations(messages, ({ one, many }) => ({
	conversation: one(conversations, {
		fields: [messages.conversationId],
		references: [conversations.id]
	}),
	sender: one(users, {
		fields: [messages.senderId],
		references: [users.id]
	}),
	attachment: one(attachments, {
		fields: [messages.id],
		references: [attachments.messageId]
	}),
	reads: many(messageReads)
}));

export const messageReadsRelations = relations(messageReads, ({ one }) => ({
	message: one(messages, {
		fields: [messageReads.messageId],
		references: [messages.id]
	}),
	user: one(users, {
		fields: [messageReads.userId],
		references: [users.id]
	})
}));

// ── Attachments ───────────────────────────────────────────────────────────────
export const attachmentsRelations = relations(attachments, ({ one }) => ({
	message: one(messages, {
		fields: [attachments.messageId],
		references: [messages.id]
	})
}));

// ── Calls ─────────────────────────────────────────────────────────────────────
export const callsRelations = relations(calls, ({ one, many }) => ({
	conversation: one(conversations, {
		fields: [calls.conversationId],
		references: [conversations.id]
	}),
	initiator: one(users, {
		fields: [calls.initiatedBy],
		references: [users.id]
	}),
	callParticipants: many(callParticipants)
}));

export const callParticipantsRelations = relations(
	callParticipants,
	({ one }) => ({
		call: one(calls, {
			fields: [callParticipants.callId],
			references: [calls.id]
		}),
		user: one(users, {
			fields: [callParticipants.userId],
			references: [users.id]
		})
	})
);
