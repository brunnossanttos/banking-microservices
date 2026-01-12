import * as authService from '../authService';
import { userRepository, authRepository } from '../../repositories';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

jest.mock('../../repositories', () => ({
  userRepository: {
    findByEmailWithPassword: jest.fn(),
    findById: jest.fn(),
  },
  authRepository: {
    createRefreshToken: jest.fn(),
    findRefreshToken: jest.fn(),
    revokeRefreshToken: jest.fn(),
    revokeAllUserRefreshTokens: jest.fn(),
  },
}));

jest.mock('bcrypt', () => ({
  compare: jest.fn(),
}));

jest.mock('../../utils/logger', () => ({
  logger: {
    error: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
  },
}));

jest.mock('../../config', () => ({
  env: {
    jwt: {
      secret: 'test-secret-key-for-unit-tests-32-chars',
      expiresIn: '15m',
      refreshExpiresIn: '7d',
    },
  },
}));

const mockedUserRepository = userRepository as jest.Mocked<typeof userRepository>;
const mockedAuthRepository = authRepository as jest.Mocked<typeof authRepository>;
const mockedBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

describe('authService', () => {
  const mockUser = {
    id: 'user-uuid',
    email: 'test@example.com',
    passwordHash: 'hashed-password',
    name: 'Test User',
    status: 'active' as const,
  };

  const mockRefreshToken = {
    id: 'token-uuid',
    userId: 'user-uuid',
    token: 'refresh-token-string',
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    createdAt: new Date(),
    revokedAt: null,
  };

  const mockFullUser = {
    id: 'user-uuid',
    email: 'test@example.com',
    name: 'Test User',
    cpf: '12345678900',
    address: {},
    bankingDetails: {
      agency: '0001',
      account: '12345-6',
      accountType: 'checking' as const,
      balance: 1000,
    },
    status: 'active' as const,
    emailVerified: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('login', () => {
    it('should return tokens on successful login', async () => {
      mockedUserRepository.findByEmailWithPassword.mockResolvedValue(mockUser);
      mockedBcrypt.compare.mockResolvedValue(true as never);
      mockedAuthRepository.createRefreshToken.mockResolvedValue(mockRefreshToken);

      const result = await authService.login('test@example.com', 'password123');

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('expiresIn');
      expect(mockedUserRepository.findByEmailWithPassword).toHaveBeenCalledWith('test@example.com');
      expect(mockedBcrypt.compare).toHaveBeenCalledWith('password123', mockUser.passwordHash);
      expect(mockedAuthRepository.createRefreshToken).toHaveBeenCalled();
    });

    it('should throw error when user not found', async () => {
      mockedUserRepository.findByEmailWithPassword.mockResolvedValue(null);

      await expect(authService.login('nonexistent@example.com', 'password123')).rejects.toMatchObject(
        {
          statusCode: 401,
          message: 'Invalid credentials',
        },
      );
    });

    it('should throw error when password is invalid', async () => {
      mockedUserRepository.findByEmailWithPassword.mockResolvedValue(mockUser);
      mockedBcrypt.compare.mockResolvedValue(false as never);

      await expect(authService.login('test@example.com', 'wrongpassword')).rejects.toMatchObject({
        statusCode: 401,
        message: 'Invalid credentials',
      });
    });

    it('should throw error when account is blocked', async () => {
      const blockedUser = { ...mockUser, status: 'blocked' as const };
      mockedUserRepository.findByEmailWithPassword.mockResolvedValue(blockedUser);

      await expect(authService.login('test@example.com', 'password123')).rejects.toMatchObject({
        statusCode: 403,
        message: 'Account is blocked. Please contact support',
      });
    });

    it('should throw error when account is inactive', async () => {
      const inactiveUser = { ...mockUser, status: 'inactive' as const };
      mockedUserRepository.findByEmailWithPassword.mockResolvedValue(inactiveUser);

      await expect(authService.login('test@example.com', 'password123')).rejects.toMatchObject({
        statusCode: 403,
        message: 'Account is inactive',
      });
    });
  });

  describe('refreshTokens', () => {
    it('should return new tokens on valid refresh token', async () => {
      mockedAuthRepository.findRefreshToken.mockResolvedValue(mockRefreshToken);
      mockedUserRepository.findById.mockResolvedValue(mockFullUser);
      mockedAuthRepository.revokeRefreshToken.mockResolvedValue(true);
      mockedAuthRepository.createRefreshToken.mockResolvedValue(mockRefreshToken);

      const result = await authService.refreshTokens('valid-refresh-token');

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('expiresIn');
      expect(mockedAuthRepository.revokeRefreshToken).toHaveBeenCalledWith('valid-refresh-token');
      expect(mockedAuthRepository.createRefreshToken).toHaveBeenCalled();
    });

    it('should throw error when refresh token is invalid', async () => {
      mockedAuthRepository.findRefreshToken.mockResolvedValue(null);

      await expect(authService.refreshTokens('invalid-token')).rejects.toMatchObject({
        statusCode: 401,
        message: 'Invalid or expired refresh token',
      });
    });

    it('should throw error when user not found', async () => {
      mockedAuthRepository.findRefreshToken.mockResolvedValue(mockRefreshToken);
      mockedUserRepository.findById.mockResolvedValue(null);
      mockedAuthRepository.revokeRefreshToken.mockResolvedValue(true);

      await expect(authService.refreshTokens('valid-refresh-token')).rejects.toMatchObject({
        statusCode: 401,
        message: 'User not found',
      });
    });

    it('should revoke all tokens and throw error when account is not active', async () => {
      const blockedUser = { ...mockFullUser, status: 'blocked' as const };
      mockedAuthRepository.findRefreshToken.mockResolvedValue(mockRefreshToken);
      mockedUserRepository.findById.mockResolvedValue(blockedUser);
      mockedAuthRepository.revokeAllUserRefreshTokens.mockResolvedValue(1);

      await expect(authService.refreshTokens('valid-refresh-token')).rejects.toMatchObject({
        statusCode: 403,
        message: 'Account is not active',
      });

      expect(mockedAuthRepository.revokeAllUserRefreshTokens).toHaveBeenCalledWith(
        mockRefreshToken.userId,
      );
    });
  });

  describe('logout', () => {
    it('should revoke refresh token', async () => {
      mockedAuthRepository.revokeRefreshToken.mockResolvedValue(true);

      await expect(authService.logout('valid-refresh-token')).resolves.not.toThrow();
      expect(mockedAuthRepository.revokeRefreshToken).toHaveBeenCalledWith('valid-refresh-token');
    });

    it('should not throw error when token is already invalid', async () => {
      mockedAuthRepository.revokeRefreshToken.mockResolvedValue(false);

      await expect(authService.logout('invalid-token')).resolves.not.toThrow();
    });
  });

  describe('logoutAll', () => {
    it('should revoke all user refresh tokens', async () => {
      mockedAuthRepository.revokeAllUserRefreshTokens.mockResolvedValue(3);

      const result = await authService.logoutAll('user-uuid');

      expect(result).toBe(3);
      expect(mockedAuthRepository.revokeAllUserRefreshTokens).toHaveBeenCalledWith('user-uuid');
    });
  });

  describe('verifyAccessToken', () => {
    const testSecret = 'test-secret-key-for-unit-tests-32-chars';

    it('should return decoded payload for valid token', async () => {
      const validToken = jwt.sign({ userId: 'user-uuid', email: 'test@example.com' }, testSecret);

      const result = await authService.verifyAccessToken(validToken);

      expect(result).toHaveProperty('userId', 'user-uuid');
      expect(result).toHaveProperty('email', 'test@example.com');
    });

    it('should throw error for invalid token', async () => {
      await expect(authService.verifyAccessToken('invalid-token')).rejects.toMatchObject({
        statusCode: 401,
        message: 'Invalid token',
      });
    });

    it('should throw error for expired token', async () => {
      const expiredToken = jwt.sign(
        { userId: 'user-uuid', email: 'test@example.com' },
        testSecret,
        { expiresIn: '-1s' },
      );

      await expect(authService.verifyAccessToken(expiredToken)).rejects.toMatchObject({
        statusCode: 401,
        message: 'Token expired',
      });
    });
  });
});
