import { Pool, PoolConfig } from 'pg';
import { env } from './env';
import { logger } from '../utils/logger';

let pool: Pool | null = null;
let isReconnecting = false;

const poolConfig: PoolConfig = {
  host: env.db.host,
  port: env.db.port,
  user: env.db.user,
  password: env.db.password,
  database: env.db.database,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
};

function createPool(): Pool {
  const newPool = new Pool(poolConfig);

  newPool.on('error', err => {
    logger.error('Unexpected error on idle database client', err);

    if (!isReconnecting) {
      isReconnecting = true;
      logger.info('Attempting to reconnect to database...');

      setTimeout(() => {
        reconnect()
          .then(() => {
            isReconnecting = false;
            logger.info('Database reconnection successful');
          })
          .catch(reconnectError => {
            isReconnecting = false;
            logger.error('Database reconnection failed', reconnectError);
          });
      }, 5000);
    }
  });

  newPool.on('connect', () => {
    logger.debug('New database client connected');
  });

  return newPool;
}

async function reconnect(): Promise<void> {
  if (pool) {
    try {
      await pool.end();
    } catch (error) {
      logger.debug('Error closing old pool during reconnect', error);
    }
  }

  pool = createPool();
  const client = await pool.connect();
  await client.query('SELECT 1');
  client.release();
}

export async function connectDatabase(): Promise<void> {
  if (pool) {
    return;
  }

  pool = createPool();

  try {
    const client = await pool.connect();
    await client.query('SELECT NOW()');
    client.release();
    logger.info('Database connected successfully');
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

export async function disconnectDatabase(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    logger.info('Database connection closed');
  }
}

export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    if (!pool) {
      return false;
    }
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    return true;
  } catch {
    return false;
  }
}
