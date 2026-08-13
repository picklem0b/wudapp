import type { TypedIO } from '../../infrastructure/socket.server.js';
import { logger } from '../../infrastructure/logger.js';
import { messagingService } from './messaging.service.js';

const TYPING_TIMEOUT_MS = 5_000;
const typingTimers = new Map<string, NodeJS.Timeout>();

export function registerMessagingGateway(io: TypedIO): void {
	io.on('connection', socket => {
		const { userId, username } = socket.data;
		logger.info(
			{ userId, username, socketId: socket.id },
			'[socket] Client connected'
		);

		socket.on('conversation:join', (conversationId: string) => {
			socket.join(conversationId);
			logger.debug(
				{ userId, conversationId },
				'[socket] Joined conversation room'
			);
		});

		socket.on('conversation:leave', (conversationId: string) => {
			socket.leave(conversationId);
			logger.debug(
				{ userId, conversationId },
				'[socket] Left conversation room'
			);
		});

		socket.on(
			'typing:start',
			({ conversationId }: { conversationId: string }) => {
				const key = `${conversationId}:${userId}`;
				clearTimeout(typingTimers.get(key));
				logger.debug(
					{ userId, conversationId },
					'[socket] Typing start'
				);
				socket.to(conversationId).emit('typing:start', {
					conversationId,
					user: { id: userId, displayName: username }
				});
				typingTimers.set(
					key,
					setTimeout(() => {
						socket
							.to(conversationId)
							.emit('typing:stop', { conversationId, userId });
						typingTimers.delete(key);
					}, TYPING_TIMEOUT_MS)
				);
			}
		);

		socket.on(
			'typing:stop',
			({ conversationId }: { conversationId: string }) => {
				const key = `${conversationId}:${userId}`;
				clearTimeout(typingTimers.get(key));
				typingTimers.delete(key);
				logger.debug(
					{ userId, conversationId },
					'[socket] Typing stop'
				);
				socket
					.to(conversationId)
					.emit('typing:stop', { conversationId, userId });
			}
		);

		socket.on(
			'message:delivered',
			async ({ messageId }: { messageId: string }) => {
				logger.debug(
					{ userId, messageId },
					'[socket] Message delivered'
				);
				await messagingService.markDelivered(messageId, userId);
				const msg = await messagingService.getMessage(messageId);
				if (msg) {
					socket.to(msg.conversationId).emit('message:delivered', {
						messageId,
						userId,
						deliveredAt: new Date().toISOString()
					});
				}
			}
		);

		socket.on(
			'message:read',
			async ({ messageId }: { messageId: string }) => {
				logger.debug({ userId, messageId }, '[socket] Message read');
				await messagingService.markRead(messageId, userId);
				const msg = await messagingService.getMessage(messageId);
				if (msg) {
					socket.to(msg.conversationId).emit('message:read', {
						messageId,
						userId,
						readAt: new Date().toISOString()
					});
				}
			}
		);

		socket.on('disconnect', reason => {
			logger.info(
				{ userId, username, reason },
				'[socket] Client disconnected'
			);
			io.emit('presence:update', {
				userId,
				status: 'offline',
				lastSeen: new Date().toISOString()
			});
		});
	});
}
