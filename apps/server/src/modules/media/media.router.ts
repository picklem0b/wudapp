import type { FastifyInstance } from 'fastify';
import { mediaService } from './media.service.js';
import { uploadMetaSchema } from './media.schema.js';
import { authMiddleware } from '../../shared/middleware/auth.middleware.js';
import { messagingService } from '../messaging/messaging.service.js';
import { config } from '../../infrastructure/config.js';
import type { TypedIO } from '../../infrastructure/socket.server.js';

const MIME_TYPE_MAP: Record<string, 'image' | 'video' | 'voice'> = {
	'image/jpeg': 'image',
	'image/png': 'image',
	'image/webp': 'image',
	'image/gif': 'image',
	'video/mp4': 'video',
	'video/webm': 'video',
	'video/quicktime': 'video',
	'audio/ogg': 'voice',
	'audio/mpeg': 'voice',
	'audio/webm': 'voice',
	'audio/mp4': 'voice'
};

const SIZE_LIMITS: Record<'image' | 'video' | 'voice', number> = {
	image: config.MAX_IMAGE_BYTES,
	video: config.MAX_VIDEO_BYTES,
	voice: config.MAX_VOICE_BYTES
};

export async function mediaRouter(
	fastify: FastifyInstance,
	{ io }: { io: TypedIO }
): Promise<void> {
	fastify.addHook('preHandler', authMiddleware);

	fastify.post('/upload', async (request, reply) => {
		const { userId } = request.user as { userId: string };
		const data = await request.file();
		if (!data) return reply.code(400).send({ error: 'No file' });

		const mimeType = data.mimetype;
		const mediaType = MIME_TYPE_MAP[mimeType];
		if (!mediaType)
			return reply.code(415).send({ error: 'Unsupported media type' });

		const buffer = await data.toBuffer();
		if (buffer.byteLength > SIZE_LIMITS[mediaType]) {
			return reply.code(413).send({ error: 'File too large' });
		}

		const meta = uploadMetaSchema.parse(
			Object.fromEntries(
				Object.entries(data.fields).map(([k, v]) => [
					k,
					(v as any).value
				])
			)
		);

		const message = await messagingService.sendMessage(
			userId,
			meta.conversationId,
			undefined,
			mediaType,
			meta.replyToId
		);

		const attachment = await mediaService.processAndStore(
			buffer,
			mimeType,
			mediaType,
			message.id
		);
		const full = await messagingService.getMessage(message.id);

		io.to(meta.conversationId).emit('message:new', full as any);
		return reply.code(201).send({ message: full, attachment });
	});
}
