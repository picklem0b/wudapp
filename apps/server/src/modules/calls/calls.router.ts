import type { FastifyInstance } from 'fastify';
import { like } from 'drizzle-orm';
import { logger } from '../../infrastructure/logger.js';
import { callsService } from './calls.service.js';
import { db } from '../../db/client.js';
import { users } from '../../db/schema/index.js';

export async function callsRouter(fastify: FastifyInstance): Promise<void> {
	// ── User search — no auth during dev ──────────────────────────────────────
	fastify.get<{ Querystring: { q: string } }>(
		'/users/search',
		async request => {
			const q = (request.query.q ?? '').trim();
			logger.debug({ q }, '[api] GET /users/search');
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
			logger.debug(
				{ q, count: results.length },
				'[api] User search results'
			);
			return results;
		}
	);

	// ── All users — for the home screen presence list ─────────────────────────
	fastify.get('/users', async request => {
		logger.debug({ ip: request.ip }, '[api] GET /users');
		return db.query.users.findMany({
			columns: {
				id: true,
				username: true,
				displayName: true,
				avatarPath: true,
				status: true,
				lastSeen: true,
				createdAt: true
			}
		});
	});

	// ── Call history ──────────────────────────────────────────────────────────
	fastify.get<{ Params: { userId: string } }>(
		'/calls/history/:userId',
		async request => {
			logger.debug(
				{ userId: request.params.userId },
				'[api] GET /calls/history'
			);
			return callsService.getHistory(request.params.userId);
		}
	);
}
