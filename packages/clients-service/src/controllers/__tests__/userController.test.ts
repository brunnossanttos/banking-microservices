import { Request, Response, NextFunction } from 'express';
import { StatusCodes } from 'http-status-codes';
import * as userController from '../userController';
import { userService } from '../../services';

jest.mock('../../services', () => ({
  userService: {
    createUser: jest.fn(),
    getUserById: jest.fn(),
    updateUser: jest.fn(),
    updateProfilePicture: jest.fn(),
  },
}));

const mockedUserService = userService as jest.Mocked<typeof userService>;

describe('userController', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    jest.clearAllMocks();

    mockReq = {
      body: {},
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    mockNext = jest.fn();
  });

  describe('create', () => {
    const validInput = {
      email: 'test@example.com',
      password: 'password123',
      name: 'John Doe',
      cpf: '12345678900',
      bankingDetails: {
        agency: '0001',
        account: '12345-6',
        accountType: 'checking' as const,
      },
    };

    const createdUser = {
      id: 'uuid-123',
      email: 'test@example.com',
      name: 'John Doe',
      cpf: '12345678900',
      address: {},
      bankingDetails: {
        agency: '0001',
        account: '12345-6',
        accountType: 'checking' as const,
        balance: 0,
      },
      status: 'pending_verification' as const,
      emailVerified: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should create user and return 201 with user data', async () => {
      mockReq.body = validInput;
      mockedUserService.createUser.mockResolvedValue(createdUser);

      await userController.create(
        mockReq as Request,
        mockRes as Response,
        mockNext,
      );

      expect(mockedUserService.createUser).toHaveBeenCalledWith(validInput);
      expect(mockRes.status).toHaveBeenCalledWith(StatusCodes.CREATED);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: createdUser,
        message: 'User created successfully',
        timestamp: expect.any(String),
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return timestamp in ISO format', async () => {
      mockReq.body = validInput;
      mockedUserService.createUser.mockResolvedValue(createdUser);

      await userController.create(
        mockReq as Request,
        mockRes as Response,
        mockNext,
      );

      const jsonCall = (mockRes.json as jest.Mock).mock.calls[0][0];
      expect(() => new Date(jsonCall.timestamp).toISOString()).not.toThrow();
    });

    it('should call next with error when service throws', async () => {
      mockReq.body = validInput;
      const error = new Error('Service error');
      mockedUserService.createUser.mockRejectedValue(error);

      await userController.create(
        mockReq as Request,
        mockRes as Response,
        mockNext,
      );

      expect(mockNext).toHaveBeenCalledWith(error);
      expect(mockRes.status).not.toHaveBeenCalled();
      expect(mockRes.json).not.toHaveBeenCalled();
    });
  });

  describe('getById', () => {
    const existingUser = {
      id: 'uuid-123',
      email: 'test@example.com',
      name: 'John Doe',
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

    it('should return user and 200 status', async () => {
      mockReq.params = { userId: 'uuid-123' };
      mockedUserService.getUserById.mockResolvedValue(existingUser);

      await userController.getById(
        mockReq as Request,
        mockRes as Response,
        mockNext,
      );

      expect(mockedUserService.getUserById).toHaveBeenCalledWith('uuid-123');
      expect(mockRes.status).toHaveBeenCalledWith(StatusCodes.OK);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: existingUser,
        timestamp: expect.any(String),
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should call next with error when service throws', async () => {
      mockReq.params = { userId: 'non-existent-id' };
      const error = new Error('User not found');
      mockedUserService.getUserById.mockRejectedValue(error);

      await userController.getById(
        mockReq as Request,
        mockRes as Response,
        mockNext,
      );

      expect(mockNext).toHaveBeenCalledWith(error);
      expect(mockRes.status).not.toHaveBeenCalled();
      expect(mockRes.json).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should update user and return 200 with success message', async () => {
      mockReq.params = { userId: 'uuid-123' };
      mockReq.body = { name: 'New Name' };
      mockedUserService.updateUser.mockResolvedValue(undefined);

      await userController.update(
        mockReq as Request,
        mockRes as Response,
        mockNext,
      );

      expect(mockedUserService.updateUser).toHaveBeenCalledWith('uuid-123', { name: 'New Name' });
      expect(mockRes.status).toHaveBeenCalledWith(StatusCodes.OK);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'User updated successfully',
        timestamp: expect.any(String),
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should call next with error when service throws', async () => {
      mockReq.params = { userId: 'uuid-123' };
      mockReq.body = { name: 'New Name' };
      const error = new Error('Update failed');
      mockedUserService.updateUser.mockRejectedValue(error);

      await userController.update(
        mockReq as Request,
        mockRes as Response,
        mockNext,
      );

      expect(mockNext).toHaveBeenCalledWith(error);
      expect(mockRes.status).not.toHaveBeenCalled();
      expect(mockRes.json).not.toHaveBeenCalled();
    });
  });

  describe('updateProfilePicture', () => {
    it('should update profile picture and return 200 with success message', async () => {
      mockReq.params = { userId: 'uuid-123' };
      mockReq.body = { profilePictureUrl: 'https://example.com/photo.jpg' };
      mockedUserService.updateProfilePicture.mockResolvedValue(undefined);

      await userController.updateProfilePicture(
        mockReq as Request,
        mockRes as Response,
        mockNext,
      );

      expect(mockedUserService.updateProfilePicture).toHaveBeenCalledWith(
        'uuid-123',
        'https://example.com/photo.jpg',
      );
      expect(mockRes.status).toHaveBeenCalledWith(StatusCodes.OK);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Profile picture updated successfully',
        timestamp: expect.any(String),
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should call next with error when service throws', async () => {
      mockReq.params = { userId: 'uuid-123' };
      mockReq.body = { profilePictureUrl: 'https://example.com/photo.jpg' };
      const error = new Error('Update failed');
      mockedUserService.updateProfilePicture.mockRejectedValue(error);

      await userController.updateProfilePicture(
        mockReq as Request,
        mockRes as Response,
        mockNext,
      );

      expect(mockNext).toHaveBeenCalledWith(error);
      expect(mockRes.status).not.toHaveBeenCalled();
      expect(mockRes.json).not.toHaveBeenCalled();
    });
  });
});
