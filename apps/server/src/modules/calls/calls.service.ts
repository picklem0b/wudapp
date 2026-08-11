import { eq } from 'drizzle-orm';
import { db } from '../../db/client.js';
import { calls, callParticipants } from '../../db/schema/index.js';
import { generateId } from '../../shared/utils/id.js';
import type { Call } from '@wudapp/types';

export class CallsService {
	async initiateCall(
		conversationId: string,
		initiatedBy: string,
		type: 'voice' | 'video'
	): Promise<Call> {
		const id = generateId();
		await db
			.insert(calls)
			.values({ id, conversationId, type, initiatedBy });
		await db
			.insert(callParticipants)
			.values({ callId: id, userId: initiatedBy });
		return this.getCall(id) as Promise<Call>;
	}

	async getCall(id: string): Promise<Call | null> {
		return db.query.calls.findFirst({
			where: eq(calls.id, id),
			with: { callParticipants: true }
		}) as any;
	}

	async updateStatus(id: string, status: Call['status']): Promise<void> {
		const now = new Date().toISOString();
		const updates: Record<string, string> = { status };
		if (status === 'active') updates.startedAt = now;
		if (status === 'ended' || status === 'missed' || status === 'declined')
			updates.endedAt = now;
		await db
			.update(calls)
			.set(updates as any)
			.where(eq(calls.id, id));
	}

	async addParticipant(callId: string, userId: string): Promise<void> {
		await db
			.insert(callParticipants)
			.values({ callId, userId })
			.onConflictDoNothing();
	}

	async removeParticipant(callId: string, userId: string): Promise<void> {
		const now = new Date().toISOString();
		await db
			.update(callParticipants)
			.set({ leftAt: now })
			.where(eq(callParticipants.callId, callId));
	}

	async getHistory(userId: string): Promise<Call[]> {
		const participations = await db.query.callParticipants.findMany({
			where: eq(callParticipants.userId, userId),
			with: { call: { with: { callParticipants: true } } }
		});
		return participations.map((p: any) => p.call) as any[];
	}
}

export const callsService = new CallsService();
