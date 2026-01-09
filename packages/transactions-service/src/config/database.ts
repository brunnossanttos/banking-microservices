import { Pool } from 'pg';
import { env } from './env';
import { logger } from '../utils/logger';

let pool: Pool | null = null;

export async function connectDatabase(): Promise<Pool> {
  if (pool) {
    return pool;
  }

  pool = new Pool({
    connectionString: env.db.url,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });

  pool.on('error', (err) => {
    logger.error('Unexpected error on idle database client', err);
  });

  try {
    const client = await pool.connect();
    await client.query('SELECT NOW()');
    client.release();
    logger.info('Database connected successfully');
    return pool;
  } catch (error) {
    logger.error('Failed to connect to database', error);
    throw error;
  }
}

export function getPool(): Pool {
  if (!pool) {
    throw new Error('Database pool not initialized. Call connectDatabase() first.');
  }
  return pool;
}

export async function closeDatabase(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    logger.info('Database connection closed');
  }
}
