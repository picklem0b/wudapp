import { z } from 'zod';

const schema = z.object({
	NODE_ENV: z.string().default('development'),
	PORT: z.coerce.number().default(3001),
	HOST: z.string().default('0.0.0.0'),
	JWT_SECRET: z.string().min(8).default('dev-secret-change-in-production'),
	DATABASE_PATH: z.string().default('./wudapp.db'),
	UPLOADS_DIR: z.string().default('./uploads'),
	MAX_IMAGE_BYTES: z.coerce.number().default(10_485_760),
	MAX_VIDEO_BYTES: z.coerce.number().default(104_857_600),
	MAX_VOICE_BYTES: z.coerce.number().default(26_214_400)
});

export const config = schema.parse(process.env);
export type Config = typeof config;
