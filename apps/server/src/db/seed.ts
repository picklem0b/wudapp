import { eq } from 'drizzle-orm';
import { db } from './client.js';
import { users } from './schema/index.js';
import { generateId } from '../shared/utils/id.js';
import { logger } from '../infrastructure/logger.js';

const SEED_USERS = [
	{ username: 'lethabo', displayName: 'Lethabo', status: 'online' as const },
	{
		username: 'testuser',
		displayName: 'Test User',
		status: 'offline' as const
	},
	{ username: 'alice', displayName: 'Alice', status: 'online' as const },
	{ username: 'bob', displayName: 'Bob', status: 'offline' as const }
];

export async function seedIfEmpty(): Promise<void> {
	const existing = await db.query.users.findFirst();
	if (existing) {
		logger.info(
			{ count: SEED_USERS.length },
			'[seed] DB already has users — skipping seed'
		);
		return;
	}

	logger.info('[seed] Empty DB — seeding users');
	for (const u of SEED_USERS) {
		await db.insert(users).values({
			id: generateId(),
			username: u.username,
			displayName: u.displayName,
			pinHash: 'no-auth', // placeholder — auth not implemented yet
			status: u.status
		});
		logger.info({ username: u.username }, '[seed] Created user');
	}
	logger.info('[seed] Done');
}
