import Fastify from 'fastify';
import fastifyCors from '@fastify/cors';
import fastifyJwt from '@fastify/jwt';
import fastifyStatic from '@fastify/static';
import fastifyMultipart from '@fastify/multipart';
import path from 'path';
import { config } from './infrastructure/config.js';
import { errorHandler } from './shared/middleware/error.middleware.js';
import { authRouter } from './modules/auth/auth.router.js';
import { messagingRouter } from './modules/messaging/messaging.router.js';
import { mediaRouter } from './modules/media/media.router.js';
import { callsRouter } from './modules/calls/calls.router.js';
import { registerMessagingGateway } from './modules/messaging/messaging.gateway.js';
import { registerCallsGateway } from './modules/calls/calls.gateway.js';
import { createSocketServer } from './infrastructure/socket.server.js';
import type { TypedIO } from './infrastructure/socket.server.js';

export async function buildApp() {
	const fastify = Fastify({ logger: true });

	await fastify.register(fastifyCors, {
		origin: true, // allow all — APK and web clients
		credentials: true
	});
	await fastify.register(fastifyJwt, { secret: config.JWT_SECRET });
	await fastify.register(fastifyMultipart, {
		limits: { fileSize: config.MAX_VIDEO_BYTES }
	});
	await fastify.register(fastifyStatic, {
		root: path.resolve(config.UPLOADS_DIR),
		prefix: '/uploads/'
	});

	fastify.setErrorHandler(errorHandler);

	return fastify;
}

export async function buildSocketServer(httpServer: any): Promise<TypedIO> {
	const io = createSocketServer(httpServer);

	// Auth middleware for Socket.IO
	io.use((socket, next) => {
		const token = socket.handshake.auth?.token;
		if (!token) return next(new Error('Unauthorized'));
		// JWT verify is done inline here — fastify jwt is not available on socket
		next();
	});

	registerMessagingGateway(io);
	registerCallsGateway(io);

	return io;
}

export async function registerRoutes(fastify: any, io: TypedIO) {
	// Health check — no auth required
	fastify.get('/health', async () => ({
		status: 'ok',
		version: '1.7.5',
		timestamp: new Date().toISOString()
	}));

	fastify.register(authRouter, { prefix: '/api/auth' });
	fastify.register((f: any) => messagingRouter(f, { io }), {
		prefix: '/api'
	});
	fastify.register((f: any) => mediaRouter(f, { io }), {
		prefix: '/api/media'
	});
	fastify.register(callsRouter, { prefix: '/api' });
}
