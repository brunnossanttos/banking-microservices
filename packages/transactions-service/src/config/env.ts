import { config } from 'dotenv';
import { z } from 'zod';

config();

const transactionsServiceEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z
    .string()
    .default('3002')
    .transform(val => parseInt(val, 10))
    .pipe(z.number().min(1).max(65535)),

  DB_HOST: z.string().min(1, 'DB_HOST is required').default('localhost'),
  DB_PORT: z
    .string()
    .default('5433')
    .transform(val => parseInt(val, 10))
    .pipe(z.number().min(1).max(65535)),
  DB_USER: z.string().min(1, 'DB_USER is required').default('admin'),
  DB_PASS: z.string().min(1, 'DB_PASS is required').default('admin123'),
  DB_NAME: z.string().min(1, 'DB_NAME is required').default('transactions_db'),

  RABBIT_HOST: z.string().default('localhost'),
  RABBIT_PORT: z
    .string()
    .default('5672')
    .transform(val => parseInt(val, 10))
    .pipe(z.number().min(1).max(65535)),
  RABBIT_USER: z.string().default('admin'),
  RABBIT_PASS: z.string().default('admin123'),
  RABBIT_VHOST: z.string().default('banking_vhost'),

  CLIENTS_SERVICE_URL: z.string().url().default('http://localhost:3001'),

  JWT_SECRET: z
    .string()
    .min(32, 'JWT_SECRET must be at least 32 characters for security')
    .default('your-super-secret-key-change-in-production'),
  JWT_EXPIRES_IN: z.string().default('1d'),
});

function validateEnv(): z.infer<typeof transactionsServiceEnvSchema> {
  const result = transactionsServiceEnvSchema.safeParse(process.env);

  if (!result.success) {
    const errorMessages = result.error.errors
      .map(err => `  - ${err.path.join('.')}: ${err.message}`)
      .join('\n');

    console.error('Environment validation failed:\n' + errorMessages);
    process.exit(1);
  }

  return result.data;
}

const validatedEnv = validateEnv();

export const env = {
  nodeEnv: validatedEnv.NODE_ENV,
  port: validatedEnv.PORT,

  db: {
    host: validatedEnv.DB_HOST,
    port: validatedEnv.DB_PORT,
    user: validatedEnv.DB_USER,
    password: validatedEnv.DB_PASS,
    database: validatedEnv.DB_NAME,
  },

  rabbitmq: {
    host: validatedEnv.RABBIT_HOST,
    port: validatedEnv.RABBIT_PORT,
    user: validatedEnv.RABBIT_USER,
    password: validatedEnv.RABBIT_PASS,
    vhost: validatedEnv.RABBIT_VHOST,
    url: `amqp://${validatedEnv.RABBIT_USER}:${validatedEnv.RABBIT_PASS}@${validatedEnv.RABBIT_HOST}:${validatedEnv.RABBIT_PORT}/${validatedEnv.RABBIT_VHOST}`,
  },

  clientsService: {
    url: validatedEnv.CLIENTS_SERVICE_URL,
  },

  jwt: {
    secret: validatedEnv.JWT_SECRET,
    expiresIn: validatedEnv.JWT_EXPIRES_IN,
  },

  isDevelopment: validatedEnv.NODE_ENV === 'development',
  isProduction: validatedEnv.NODE_ENV === 'production',
  isTest: validatedEnv.NODE_ENV === 'test',
} as const;

export type Env = typeof env;
