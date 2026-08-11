import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { messages } from './messages.table.js';

export const attachments = sqliteTable('attachments', {
	id: text('id').primaryKey(),
	messageId: text('message_id')
		.notNull()
		.references(() => messages.id, { onDelete: 'cascade' }),
	type: text('type', { enum: ['image', 'video', 'voice'] }).notNull(),
	originalPath: text('original_path').notNull(),
	thumbnailPath: text('thumbnail_path'),
	previewPath: text('preview_path'),
	mimeType: text('mime_type').notNull(),
	sizeBytes: integer('size_bytes').notNull(),
	durationMs: integer('duration_ms'),
	width: integer('width'),
	height: integer('height'),
	waveformData: text('waveform_data'), // JSON: number[]
	checksum: text('checksum').notNull(),
	createdAt: text('created_at')
		.notNull()
		.default(sql`(datetime('now'))`)
});
