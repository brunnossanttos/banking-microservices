import { Request, Response, NextFunction } from 'express';
import { StatusCodes } from 'http-status-codes';
import * as userController from '../userController';
import { userService } from '../../services';

jest.mock('../../services', () => ({
  userService: {
    createUser: jest.fn(),
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
});
