import { Request, Response, NextFunction } from 'express';
import { StatusCodes } from 'http-status-codes';
import * as transactionController from '../transactionController';
import { transactionService } from '../../services';

jest.mock('../../services', () => ({
  transactionService: {
    createTransaction: jest.fn(),
    getTransactionById: jest.fn(),
    getUserTransactions: jest.fn(),
  },
}));

const mockedTransactionService = transactionService as jest.Mocked<typeof transactionService>;

describe('transactionController', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    jest.clearAllMocks();

    mockReq = {
      body: {},
      params: {},
      query: {},
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    mockNext = jest.fn();
  });

  describe('create', () => {
    const validInput = {
      senderUserId: 'sender-uuid',
      receiverUserId: 'receiver-uuid',
      amount: 100,
      description: 'Test transfer',
    };

    const createdTransaction = {
      id: 'transaction-uuid',
      senderUserId: 'sender-uuid',
      receiverUserId: 'receiver-uuid',
      amount: 100,
      fee: 0,
      description: 'Test transfer',
      type: 'transfer' as const,
      status: 'completed' as const,
      retryCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should create transaction and return 201 with transaction data', async () => {
      mockReq.body = validInput;
      mockedTransactionService.createTransaction.mockResolvedValue(createdTransaction);

      await transactionController.create(mockReq as Request, mockRes as Response, mockNext);

      expect(mockedTransactionService.createTransaction).toHaveBeenCalledWith(validInput);
      expect(mockRes.status).toHaveBeenCalledWith(StatusCodes.CREATED);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: createdTransaction,
        message: 'Transaction created successfully',
        timestamp: expect.any(String),
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should call next with error when service throws', async () => {
      mockReq.body = validInput;
      const error = new Error('Service error');
      mockedTransactionService.createTransaction.mockRejectedValue(error);

      await transactionController.create(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
      expect(mockRes.status).not.toHaveBeenCalled();
      expect(mockRes.json).not.toHaveBeenCalled();
    });
  });

  describe('getById', () => {
    const existingTransaction = {
      id: 'transaction-uuid',
      senderUserId: 'sender-uuid',
      receiverUserId: 'receiver-uuid',
      amount: 100,
      fee: 0,
      description: 'Test transfer',
      type: 'transfer' as const,
      status: 'completed' as const,
      retryCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should return transaction and 200 status', async () => {
      mockReq.params = { transactionId: 'transaction-uuid' };
      mockedTransactionService.getTransactionById.mockResolvedValue(existingTransaction);

      await transactionController.getById(mockReq as Request, mockRes as Response, mockNext);

      expect(mockedTransactionService.getTransactionById).toHaveBeenCalledWith('transaction-uuid');
      expect(mockRes.status).toHaveBeenCalledWith(StatusCodes.OK);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: existingTransaction,
        timestamp: expect.any(String),
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should call next with error when service throws', async () => {
      mockReq.params = { transactionId: 'non-existent-id' };
      const error = new Error('Transaction not found');
      mockedTransactionService.getTransactionById.mockRejectedValue(error);

      await transactionController.getById(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
      expect(mockRes.status).not.toHaveBeenCalled();
      expect(mockRes.json).not.toHaveBeenCalled();
    });
  });

  describe('getByUserId', () => {
    const paginatedResult = {
      data: [
        {
          id: 'transaction-uuid',
          senderUserId: 'user-uuid',
          receiverUserId: 'receiver-uuid',
          amount: 100,
          fee: 0,
          type: 'transfer' as const,
          status: 'completed' as const,
          retryCount: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      pagination: {
        page: 1,
        limit: 10,
        total: 1,
        totalPages: 1,
      },
    };

    it('should return paginated transactions and 200 status', async () => {
      mockReq.params = { userId: 'user-uuid' };
      mockReq.query = { page: '1', limit: '10' };
      mockedTransactionService.getUserTransactions.mockResolvedValue(paginatedResult);

      await transactionController.getByUserId(mockReq as Request, mockRes as Response, mockNext);

      expect(mockedTransactionService.getUserTransactions).toHaveBeenCalledWith('user-uuid', {
        status: undefined,
        type: undefined,
        startDate: undefined,
        endDate: undefined,
        page: 1,
        limit: 10,
      });
      expect(mockRes.status).toHaveBeenCalledWith(StatusCodes.OK);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: paginatedResult.data,
        pagination: paginatedResult.pagination,
        timestamp: expect.any(String),
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should pass filters to service', async () => {
      mockReq.params = { userId: 'user-uuid' };
      mockReq.query = {
        status: 'completed',
        type: 'transfer',
        page: '2',
        limit: '20',
      };
      mockedTransactionService.getUserTransactions.mockResolvedValue(paginatedResult);

      await transactionController.getByUserId(mockReq as Request, mockRes as Response, mockNext);

      expect(mockedTransactionService.getUserTransactions).toHaveBeenCalledWith('user-uuid', {
        status: 'completed',
        type: 'transfer',
        page: 2,
        limit: 20,
        startDate: undefined,
        endDate: undefined,
      });
    });

    it('should call next with error when service throws', async () => {
      mockReq.params = { userId: 'non-existent-id' };
      mockReq.query = {};
      const error = new Error('User not found');
      mockedTransactionService.getUserTransactions.mockRejectedValue(error);

      await transactionController.getByUserId(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
      expect(mockRes.status).not.toHaveBeenCalled();
      expect(mockRes.json).not.toHaveBeenCalled();
    });
  });
});
