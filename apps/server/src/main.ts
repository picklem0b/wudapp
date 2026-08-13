import 'dotenv/config';
import http from 'http';
import { buildApp, buildSocketServer, registerRoutes } from './app.js';
import { config } from './infrastructure/config.js';
import { logger } from './infrastructure/logger.js';
import { seedIfEmpty } from './db/seed.js';

async function bootstrap() {
	logger.info('[boot] Starting Wudapp server');

	await seedIfEmpty();

	const fastify = await buildApp();
	const httpServer = http.createServer(fastify.server);
	const io = await buildSocketServer(httpServer);

	await registerRoutes(fastify, io);
	await fastify.ready();

	httpServer.listen(config.PORT, config.HOST, () => {
		logger.info(
			`[boot] Server live → http://${config.HOST}:${config.PORT}`
		);
		logger.info(
			`[boot] Health    → http://${config.HOST}:${config.PORT}/health`
		);
		logger.info(`[boot] DB        → ${config.DATABASE_PATH}`);
	});
}

bootstrap().catch(err => {
	logger.error(err, '[boot] Fatal startup error');
	process.exit(1);
});
