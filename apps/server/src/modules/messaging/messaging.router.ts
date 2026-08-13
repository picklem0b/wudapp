import type { FastifyInstance } from 'fastify';
import { logger } from '../../infrastructure/logger.js';
import { messagingService } from './messaging.service.js';
import {
	sendMessageSchema,
	editMessageSchema,
	createConversationSchema
} from './messaging.schema.js';
import { authMiddleware } from '../../shared/middleware/auth.middleware.js';
import type { TypedIO } from '../../infrastructure/socket.server.js';

export async function messagingRouter(
	fastify: FastifyInstance,
	{ io }: { io: TypedIO }
): Promise<void> {
	fastify.addHook('preHandler', authMiddleware);

	fastify.get('/conversations', async request => {
		const { userId } = request.user as { userId: string };
		logger.debug({ userId }, '[api] GET /conversations');
		return messagingService.getUserConversations(userId);
	});

	fastify.post('/conversations', async (request, reply) => {
		const { userId } = request.user as { userId: string };
		const body = createConversationSchema.parse(request.body);
		logger.info(
			{ userId, type: body.type, memberIds: body.memberIds },
			'[api] POST /conversations'
		);
		const conv = await messagingService.createConversation(
			userId,
			body.type,
			body.memberIds,
			body.name
		);
		return reply.code(201).send(conv);
	});

	fastify.get<{
		Params: { conversationId: string };
		Querystring: { cursor?: string };
	}>('/conversations/:conversationId/messages', async request => {
		const { conversationId } = request.params;
		logger.debug({ conversationId }, '[api] GET messages');
		return messagingService.getMessages(
			conversationId,
			request.query.cursor
		);
	});

	fastify.post('/messages', async (request, reply) => {
		const { userId } = request.user as { userId: string };
		const body = sendMessageSchema.parse(request.body);
		logger.info(
			{ userId, conversationId: body.conversationId, type: body.type },
			'[api] POST /messages'
		);
		const message = await messagingService.sendMessage(
			userId,
			body.conversationId,
			body.content,
			body.type as any,
			body.replyToId
		);
		io.to(body.conversationId).emit('message:new', message as any);
		logger.debug({ messageId: message.id }, '[api] message:new emitted');
		return reply.code(201).send({ message });
	});

	fastify.patch<{ Params: { messageId: string } }>(
		'/messages/:messageId',
		async request => {
			const { userId } = request.user as { userId: string };
			const { messageId } = request.params;
			const body = editMessageSchema.parse(request.body);
			logger.info(
				{ userId, messageId },
				'[api] PATCH /messages/:messageId'
			);
			await messagingService.editMessage(messageId, userId, body.content);
			const message = await messagingService.getMessage(messageId);
			io.to(message!.conversationId).emit('message:edited', {
				messageId,
				content: body.content,
				editedAt: message!.editedAt!
			});
			return { message };
		}
	);

	fastify.delete<{ Params: { messageId: string } }>(
		'/messages/:messageId',
		async request => {
			const { userId } = request.user as { userId: string };
			const { messageId } = request.params;
			const message = await messagingService.getMessage(messageId);
			logger.info(
				{ userId, messageId },
				'[api] DELETE /messages/:messageId'
			);
			await messagingService.deleteMessage(messageId, userId);
			if (message) {
				io.to(message.conversationId).emit('message:deleted', {
					messageId,
					conversationId: message.conversationId
				});
			}
			return { ok: true };
		}
	);
}
