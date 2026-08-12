import type { FastifyInstance } from 'fastify';
import { like } from 'drizzle-orm';
import { callsService } from './calls.service.js';
import { db } from '../../db/client.js';
import { users } from '../../db/schema/index.js';

export async function callsRouter(fastify: FastifyInstance): Promise<void> {
	// ── User search — no auth during dev ──────────────────────────────────────
	fastify.get<{ Querystring: { q: string } }>(
		'/users/search',
		async request => {
			const q = (request.query.q ?? '').trim();
			if (!q) return [];
			const results = await db.query.users.findMany({
				where: like(users.username, `%${q}%`),
				columns: {
					id: true,
					username: true,
					displayName: true,
					avatarPath: true,
					status: true,
					lastSeen: true
				}
			});
			return results;
		}
	);

	// ── Call history ──────────────────────────────────────────────────────────
	fastify.get<{ Params: { userId: string } }>(
		'/calls/history/:userId',
		async request => {
			return callsService.getHistory(request.params.userId);
		}
	);
}
