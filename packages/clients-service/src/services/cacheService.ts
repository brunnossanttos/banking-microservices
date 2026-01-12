import { getRedis } from '../config/redis';
import { logger } from '../utils/logger';

const DEFAULT_TTL = 300; // 5 minutes in seconds

export const CACHE_KEYS = {
  USER: (userId: string) => `user:${userId}`,
  USER_BY_EMAIL: (email: string) => `user:email:${email}`,
  USER_BY_CPF: (cpf: string) => `user:cpf:${cpf}`,
} as const;

export async function get<T>(key: string): Promise<T | null> {
  const redis = getRedis();
  if (!redis) {
    return null;
  }

  try {
    const data = await redis.get(key);
    if (!data) {
      return null;
    }
    logger.debug('Cache hit', { key });
    return JSON.parse(data) as T;
  } catch (error) {
    logger.error('Cache get error', { key, error });
    return null;
  }
}

export async function set<T>(key: string, value: T, ttl: number = DEFAULT_TTL): Promise<boolean> {
  const redis = getRedis();
  if (!redis) {
    return false;
  }

  try {
    const data = JSON.stringify(value);
    await redis.setex(key, ttl, data);
    logger.debug('Cache set', { key, ttl });
    return true;
  } catch (error) {
    logger.error('Cache set error', { key, error });
    return false;
  }
}

export async function del(key: string): Promise<boolean> {
  const redis = getRedis();
  if (!redis) {
    return false;
  }

  try {
    await redis.del(key);
    logger.debug('Cache deleted', { key });
    return true;
  } catch (error) {
    logger.error('Cache delete error', { key, error });
    return false;
  }
}

export async function delPattern(pattern: string): Promise<boolean> {
  const redis = getRedis();
  if (!redis) {
    return false;
  }

  try {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
      logger.debug('Cache pattern deleted', { pattern, count: keys.length });
    }
    return true;
  } catch (error) {
    logger.error('Cache delete pattern error', { pattern, error });
    return false;
  }
}

export async function invalidateUser(userId: string, email?: string, cpf?: string): Promise<void> {
  await del(CACHE_KEYS.USER(userId));
  if (email) {
    await del(CACHE_KEYS.USER_BY_EMAIL(email));
  }
  if (cpf) {
    await del(CACHE_KEYS.USER_BY_CPF(cpf));
  }
}

export async function getOrSet<T>(
  key: string,
  fetchFn: () => Promise<T>,
  ttl: number = DEFAULT_TTL,
): Promise<T> {
  const cached = await get<T>(key);
  if (cached !== null) {
    return cached;
  }

  const result = await fetchFn();
  await set(key, result, ttl);
  return result;
}
