import { z } from 'zod';

export const baseEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z
    .string()
    .transform(val => parseInt(val, 10))
    .pipe(z.number().min(1).max(65535)),
});

export const databaseEnvSchema = z.object({
  DB_HOST: z.string().min(1, 'DB_HOST is required'),
  DB_PORT: z
    .string()
    .transform(val => parseInt(val, 10))
    .pipe(z.number().min(1).max(65535))
    .default('5432'),
  DB_USER: z.string().min(1, 'DB_USER is required'),
  DB_PASS: z.string().min(1, 'DB_PASS is required'),
  DB_NAME: z.string().min(1, 'DB_NAME is required'),
});

export const redisEnvSchema = z.object({
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z
    .string()
    .transform(val => parseInt(val, 10))
    .pipe(z.number().min(1).max(65535))
    .default('6379'),
});

export const rabbitmqEnvSchema = z.object({
  RABBIT_HOST: z.string().default('localhost'),
  RABBIT_PORT: z
    .string()
    .transform(val => parseInt(val, 10))
    .pipe(z.number().min(1).max(65535))
    .default('5672'),
  RABBIT_USER: z.string().default('guest'),
  RABBIT_PASS: z.string().default('guest'),
  RABBIT_VHOST: z.string().default('/'),
});

export const jwtEnvSchema = z.object({
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters for security'),
  JWT_EXPIRES_IN: z.string().default('1d'),
});

export function validateEnv<T extends z.ZodTypeAny>(
  schema: T,
  env: NodeJS.ProcessEnv = process.env,
): z.infer<T> {
  const result = schema.safeParse(env);

  if (!result.success) {
    const errorMessages = result.error.errors
      .map(err => `  - ${err.path.join('.')}: ${err.message}`)
      .join('\n');

    // eslint-disable-next-line no-console
    console.error('Environment validation failed:\n' + errorMessages);
    process.exit(1);
  }

  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  return result.data;
}
