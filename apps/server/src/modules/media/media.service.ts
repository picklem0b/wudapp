import { eq } from 'drizzle-orm';
import { db } from '../../db/client.js';
import { attachments } from '../../db/schema/index.js';
import { generateId } from '../../shared/utils/id.js';
import { processImage, processVideo, processVoice } from './media.pipeline.js';

type MediaType = 'image' | 'video' | 'voice';

export class MediaService {
	async processAndStore(
		buffer: Buffer,
		mimeType: string,
		type: MediaType,
		messageId: string
	) {
		let result;
		if (type === 'image') result = await processImage(buffer, mimeType);
		else if (type === 'video')
			result = await processVideo(buffer, mimeType);
		else result = await processVoice(buffer, mimeType);

		const id = generateId();
		await db.insert(attachments).values({
			id,
			messageId,
			type,
			originalPath: result.originalPath,
			thumbnailPath: result.thumbnailPath,
			previewPath: result.previewPath,
			mimeType: result.mimeType,
			sizeBytes: result.sizeBytes,
			durationMs: result.durationMs,
			width: result.width,
			height: result.height,
			waveformData: result.waveformData
				? JSON.stringify(result.waveformData)
				: null,
			checksum: result.checksum
		});

		return db.query.attachments.findFirst({
			where: eq(attachments.id, id)
		});
	}
}

export const mediaService = new MediaService();
