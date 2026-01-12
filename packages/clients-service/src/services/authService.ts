import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { AppError, JwtPayload } from '@banking/shared';
import { env } from '../config';
import { userRepository, authRepository } from '../repositories';
import { AuthTokens } from '../types';
import { logger } from '../utils';

function parseDuration(duration: string): number {
  const match = duration.match(/^(\d+)([smhd])$/);
  if (!match) {
    throw new Error(`Invalid duration format: ${duration}`);
  }

  const value = parseInt(match[1], 10);
  const unit = match[2];

  const multipliers: Record<string, number> = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };

  return value * multipliers[unit];
}

function generateAccessToken(userId: string, email: string): string {
  const payload: JwtPayload = { userId, email };

  return jwt.sign(payload, env.jwt.secret, {
    expiresIn: env.jwt.expiresIn,
  } as jwt.SignOptions);
}

function generateRefreshTokenString(): string {
  return crypto.randomBytes(64).toString('hex');
}

export async function login(email: string, password: string): Promise<AuthTokens> {
  const user = await userRepository.findByEmailWithPassword(email);

  if (!user) {
    logger.warn('Login attempt with non-existent email', { email });
    throw AppError.unauthorized('Invalid credentials');
  }

  if (user.status === 'blocked') {
    logger.warn('Login attempt by blocked user', { userId: user.id });
    throw AppError.forbidden('Account is blocked. Please contact support');
  }

  if (user.status === 'inactive') {
    logger.warn('Login attempt by inactive user', { userId: user.id });
    throw AppError.forbidden('Account is inactive');
  }

  const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

  if (!isPasswordValid) {
    logger.warn('Login attempt with invalid password', { userId: user.id });
    throw AppError.unauthorized('Invalid credentials');
  }

  const accessToken = generateAccessToken(user.id, user.email);
  const refreshTokenString = generateRefreshTokenString();

  const refreshExpiresMs = parseDuration(env.jwt.refreshExpiresIn);
  const refreshExpiresAt = new Date(Date.now() + refreshExpiresMs);

  await authRepository.createRefreshToken(user.id, refreshTokenString, refreshExpiresAt);

  logger.info('User logged in successfully', { userId: user.id });

  return {
    accessToken,
    refreshToken: refreshTokenString,
    expiresIn: parseDuration(env.jwt.expiresIn) / 1000,
  };
}

export async function refreshTokens(refreshToken: string): Promise<AuthTokens> {
  const storedToken = await authRepository.findRefreshToken(refreshToken);

  if (!storedToken) {
    throw AppError.unauthorized('Invalid or expired refresh token');
  }

  const user = await userRepository.findById(storedToken.userId);

  if (!user) {
    await authRepository.revokeRefreshToken(refreshToken);
    throw AppError.unauthorized('User not found');
  }

  if (user.status === 'blocked' || user.status === 'inactive') {
    await authRepository.revokeAllUserRefreshTokens(storedToken.userId);
    throw AppError.forbidden('Account is not active');
  }

  await authRepository.revokeRefreshToken(refreshToken);

  const accessToken = generateAccessToken(user.id, user.email);
  const newRefreshTokenString = generateRefreshTokenString();

  const refreshExpiresMs = parseDuration(env.jwt.refreshExpiresIn);
  const refreshExpiresAt = new Date(Date.now() + refreshExpiresMs);

  await authRepository.createRefreshToken(user.id, newRefreshTokenString, refreshExpiresAt);

  logger.info('Tokens refreshed successfully', { userId: user.id });

  return {
    accessToken,
    refreshToken: newRefreshTokenString,
    expiresIn: parseDuration(env.jwt.expiresIn) / 1000,
  };
}

export async function logout(refreshToken: string): Promise<void> {
  const revoked = await authRepository.revokeRefreshToken(refreshToken);

  if (!revoked) {
    logger.warn('Logout attempt with invalid refresh token');
  } else {
    logger.info('User logged out successfully');
  }
}

export async function logoutAll(userId: string): Promise<number> {
  const revokedCount = await authRepository.revokeAllUserRefreshTokens(userId);

  logger.info('User logged out from all devices', { userId, revokedCount });

  return revokedCount;
}

export function verifyAccessToken(token: string): JwtPayload {
  try {
    const decoded = jwt.verify(token, env.jwt.secret) as JwtPayload;
    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw AppError.unauthorized('Token expired');
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw AppError.unauthorized('Invalid token');
    }
    throw AppError.unauthorized('Token verification failed');
  }
}
