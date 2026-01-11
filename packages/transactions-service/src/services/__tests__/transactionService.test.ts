import * as transactionService from '../transactionService';
import * as transactionRepository from '../../repositories/transactionRepository';
import axios from 'axios';

jest.mock('../../repositories/transactionRepository');
jest.mock('axios', () => ({
  get: jest.fn(),
  isAxiosError: jest.fn(),
}));
jest.mock('../../utils/logger', () => ({
  logger: {
    error: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}));

const mockedRepository = transactionRepository as jest.Mocked<typeof transactionRepository>;
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('transactionService', () => {
  const mockUserBankingInfo = {
    id: 'user-uuid',
    name: 'John Doe',
    email: 'john@example.com',
    bankingDetails: {
      agency: '0001',
      account: '12345-6',
      accountType: 'checking',
      balance: 1000,
    },
  };

  const mockTransaction = {
    id: 'transaction-uuid',
    senderUserId: 'sender-uuid',
    receiverUserId: 'receiver-uuid',
    amount: 100,
    fee: 0,
    description: 'Test transfer',
    type: 'transfer' as const,
    status: 'pending' as const,
    retryCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createTransaction', () => {
    const validInput = {
      senderUserId: 'sender-uuid',
      receiverUserId: 'receiver-uuid',
      amount: 100,
      description: 'Test transfer',
    };

    beforeEach(() => {
      mockedAxios.get.mockResolvedValue({
        data: { success: true, data: mockUserBankingInfo },
      });
      mockedRepository.createTransaction.mockResolvedValue(mockTransaction);
      mockedRepository.updateStatus.mockResolvedValue(true);
    });

    it('should create transaction successfully', async () => {
      const result = await transactionService.createTransaction(validInput);

      expect(result.status).toBe('completed');
      expect(mockedRepository.createTransaction).toHaveBeenCalledWith({
        senderUserId: validInput.senderUserId,
        receiverUserId: validInput.receiverUserId,
        amount: validInput.amount,
        description: validInput.description,
        type: 'transfer',
      });
    });

    it('should throw error when transferring to yourself', async () => {
      const selfTransfer = { ...validInput, receiverUserId: validInput.senderUserId };

      await expect(transactionService.createTransaction(selfTransfer)).rejects.toMatchObject({
        statusCode: 400,
        message: 'Cannot transfer to yourself',
      });
    });

    it('should throw error when sender not found', async () => {
      const axiosError = {
        isAxiosError: true,
        response: { status: 404 },
      };
      mockedAxios.get.mockRejectedValueOnce(axiosError);
      mockedAxios.isAxiosError.mockReturnValue(true);

      await expect(transactionService.createTransaction(validInput)).rejects.toMatchObject({
        statusCode: 404,
        message: 'Sender user not found',
      });
    });

    it('should throw error when receiver not found', async () => {
      const axiosError = {
        isAxiosError: true,
        response: { status: 404 },
      };
      mockedAxios.get
        .mockResolvedValueOnce({ data: { success: true, data: mockUserBankingInfo } })
        .mockRejectedValueOnce(axiosError);
      mockedAxios.isAxiosError.mockReturnValue(true);

      await expect(transactionService.createTransaction(validInput)).rejects.toMatchObject({
        statusCode: 404,
        message: 'Receiver user not found',
      });
    });

    it('should throw error when insufficient balance', async () => {
      const lowBalanceUser = {
        ...mockUserBankingInfo,
        bankingDetails: { ...mockUserBankingInfo.bankingDetails, balance: 50 },
      };
      mockedAxios.get.mockResolvedValue({ data: { success: true, data: lowBalanceUser } });

      await expect(transactionService.createTransaction(validInput)).rejects.toMatchObject({
        statusCode: 400,
        message: 'Insufficient balance',
      });
    });

    it('should validate both users exist before creating transaction', async () => {
      await transactionService.createTransaction(validInput);

      expect(mockedAxios.get).toHaveBeenCalledTimes(2);
    });
  });

  describe('getTransactionById', () => {
    it('should return transaction when found', async () => {
      mockedRepository.findById.mockResolvedValue(mockTransaction);

      const result = await transactionService.getTransactionById('transaction-uuid');

      expect(result).toEqual(mockTransaction);
      expect(mockedRepository.findById).toHaveBeenCalledWith('transaction-uuid');
    });

    it('should throw not found error when transaction does not exist', async () => {
      mockedRepository.findById.mockResolvedValue(null);

      await expect(transactionService.getTransactionById('non-existent-id')).rejects.toMatchObject({
        statusCode: 404,
        message: 'Transaction not found',
      });
    });
  });

  describe('getUserTransactions', () => {
    beforeEach(() => {
      mockedAxios.get.mockResolvedValue({
        data: { success: true, data: mockUserBankingInfo },
      });
    });

    it('should return paginated transactions', async () => {
      mockedRepository.findByUserId.mockResolvedValue({
        transactions: [mockTransaction],
        total: 1,
      });

      const result = await transactionService.getUserTransactions('user-uuid', {
        page: 1,
        limit: 10,
      });

      expect(result.data).toHaveLength(1);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 10,
        total: 1,
        totalPages: 1,
      });
    });

    it('should throw not found error when user does not exist', async () => {
      const axiosError = {
        isAxiosError: true,
        response: { status: 404 },
      };
      mockedAxios.get.mockRejectedValueOnce(axiosError);
      mockedAxios.isAxiosError.mockReturnValue(true);

      await expect(
        transactionService.getUserTransactions('non-existent-id', {}),
      ).rejects.toMatchObject({
        statusCode: 404,
        message: 'User not found',
      });
    });

    it('should pass filters to repository', async () => {
      mockedRepository.findByUserId.mockResolvedValue({
        transactions: [],
        total: 0,
      });

      await transactionService.getUserTransactions('user-uuid', {
        status: 'completed',
        type: 'transfer',
        page: 2,
        limit: 20,
      });

      expect(mockedRepository.findByUserId).toHaveBeenCalledWith('user-uuid', {
        status: 'completed',
        type: 'transfer',
        page: 2,
        limit: 20,
        startDate: undefined,
        endDate: undefined,
      });
    });

    it('should calculate totalPages correctly', async () => {
      mockedRepository.findByUserId.mockResolvedValue({
        transactions: [mockTransaction],
        total: 25,
      });

      const result = await transactionService.getUserTransactions('user-uuid', {
        page: 1,
        limit: 10,
      });

      expect(result.pagination.totalPages).toBe(3);
    });
  });
});
