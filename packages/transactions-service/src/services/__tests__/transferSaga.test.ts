import { WithdrawStep, DepositStep, clientsApi, createTransferSaga } from '../transferSaga';
import { TransferSagaContext } from '../../types/saga';
import axios from 'axios';

jest.mock('axios');
jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
  },
}));

const TEST_INTERNAL_API_KEY = 'test-internal-api-key-for-unit-tests';

jest.mock('../../config/env', () => ({
  env: {
    clientsService: {
      url: 'http://localhost:3001',
      internalApiKey: 'test-internal-api-key-for-unit-tests',
    },
  },
}));

const mockedAxios = axios as jest.Mocked<typeof axios>;

const expectedHeaders = {
  headers: { 'x-internal-api-key': TEST_INTERNAL_API_KEY },
};

describe('TransferSaga', () => {
  const baseContext: TransferSagaContext = {
    transactionId: 'tx-123',
    senderUserId: 'sender-456',
    receiverUserId: 'receiver-789',
    amount: 100,
    withdrawCompleted: false,
    depositCompleted: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('clientsApi', () => {
    it('should call internal withdraw endpoint with API key', async () => {
      mockedAxios.post.mockResolvedValue({ data: { success: true } });

      await clientsApi.withdraw('user-123', 50);

      expect(mockedAxios.post).toHaveBeenCalledWith(
        'http://localhost:3001/api/internal/users/user-123/withdraw',
        { amount: 50 },
        expectedHeaders,
      );
    });

    it('should call internal deposit endpoint with API key', async () => {
      mockedAxios.post.mockResolvedValue({ data: { success: true } });

      await clientsApi.deposit('user-123', 75);

      expect(mockedAxios.post).toHaveBeenCalledWith(
        'http://localhost:3001/api/internal/users/user-123/deposit',
        { amount: 75 },
        expectedHeaders,
      );
    });
  });

  describe('WithdrawStep', () => {
    const withdrawStep = new WithdrawStep();

    describe('execute', () => {
      it('should return success and update context on successful withdraw', async () => {
        mockedAxios.post.mockResolvedValue({ data: { success: true } });

        const result = await withdrawStep.execute(baseContext);

        expect(result.success).toBe(true);
        expect(result.data?.withdrawCompleted).toBe(true);
        expect(mockedAxios.post).toHaveBeenCalledWith(
          'http://localhost:3001/api/internal/users/sender-456/withdraw',
          { amount: 100 },
          expectedHeaders,
        );
      });

      it('should return failure on withdraw error', async () => {
        mockedAxios.post.mockRejectedValue(new Error('Insufficient funds'));

        const result = await withdrawStep.execute(baseContext);

        expect(result.success).toBe(false);
        expect(result.error?.message).toBe('Insufficient funds');
      });

      it('should wrap non-Error objects in Error', async () => {
        mockedAxios.post.mockRejectedValue('string error');

        const result = await withdrawStep.execute(baseContext);

        expect(result.success).toBe(false);
        expect(result.error?.message).toBe('Withdraw failed');
      });
    });

    describe('compensate', () => {
      it('should refund sender when withdraw was completed', async () => {
        mockedAxios.post.mockResolvedValue({ data: { success: true } });

        const contextWithWithdraw: TransferSagaContext = {
          ...baseContext,
          withdrawCompleted: true,
        };

        const result = await withdrawStep.compensate(contextWithWithdraw);

        expect(result.success).toBe(true);
        expect(mockedAxios.post).toHaveBeenCalledWith(
          'http://localhost:3001/api/internal/users/sender-456/deposit',
          { amount: 100 },
          expectedHeaders,
        );
      });

      it('should skip compensation when withdraw was not completed', async () => {
        const result = await withdrawStep.compensate(baseContext);

        expect(result.success).toBe(true);
        expect(mockedAxios.post).not.toHaveBeenCalled();
      });

      it('should return failure when refund fails', async () => {
        mockedAxios.post.mockRejectedValue(new Error('Refund failed'));

        const contextWithWithdraw: TransferSagaContext = {
          ...baseContext,
          withdrawCompleted: true,
        };

        const result = await withdrawStep.compensate(contextWithWithdraw);

        expect(result.success).toBe(false);
        expect(result.error?.message).toBe('Refund failed');
      });
    });
  });

  describe('DepositStep', () => {
    const depositStep = new DepositStep();

    describe('execute', () => {
      it('should return success and update context on successful deposit', async () => {
        mockedAxios.post.mockResolvedValue({ data: { success: true } });

        const result = await depositStep.execute(baseContext);

        expect(result.success).toBe(true);
        expect(result.data?.depositCompleted).toBe(true);
        expect(mockedAxios.post).toHaveBeenCalledWith(
          'http://localhost:3001/api/internal/users/receiver-789/deposit',
          { amount: 100 },
          expectedHeaders,
        );
      });

      it('should return failure on deposit error', async () => {
        mockedAxios.post.mockRejectedValue(new Error('User not found'));

        const result = await depositStep.execute(baseContext);

        expect(result.success).toBe(false);
        expect(result.error?.message).toBe('User not found');
      });
    });

    describe('compensate', () => {
      it('should reverse deposit when deposit was completed', async () => {
        mockedAxios.post.mockResolvedValue({ data: { success: true } });

        const contextWithDeposit: TransferSagaContext = {
          ...baseContext,
          depositCompleted: true,
        };

        const result = await depositStep.compensate(contextWithDeposit);

        expect(result.success).toBe(true);
        expect(mockedAxios.post).toHaveBeenCalledWith(
          'http://localhost:3001/api/internal/users/receiver-789/withdraw',
          { amount: 100 },
          expectedHeaders,
        );
      });

      it('should skip compensation when deposit was not completed', async () => {
        const result = await depositStep.compensate(baseContext);

        expect(result.success).toBe(true);
        expect(mockedAxios.post).not.toHaveBeenCalled();
      });

      it('should return failure when reverse deposit fails', async () => {
        mockedAxios.post.mockRejectedValue(new Error('Reverse failed'));

        const contextWithDeposit: TransferSagaContext = {
          ...baseContext,
          depositCompleted: true,
        };

        const result = await depositStep.compensate(contextWithDeposit);

        expect(result.success).toBe(false);
        expect(result.error?.message).toBe('Reverse failed');
      });
    });
  });

  describe('createTransferSaga', () => {
    it('should create a saga with withdraw and deposit steps', async () => {
      mockedAxios.post.mockResolvedValue({ data: { success: true } });

      const saga = createTransferSaga();
      const result = await saga.execute(baseContext);

      expect(result.success).toBe(true);
      expect(result.completedSteps).toEqual(['withdraw', 'deposit']);
      expect(mockedAxios.post).toHaveBeenCalledTimes(2);
    });

    it('should compensate withdraw when deposit fails', async () => {
      mockedAxios.post
        .mockResolvedValueOnce({ data: { success: true } })
        .mockRejectedValueOnce(new Error('Deposit failed'))
        .mockResolvedValueOnce({ data: { success: true } });

      const saga = createTransferSaga();
      const result = await saga.execute(baseContext);

      expect(result.success).toBe(false);
      expect(result.failedStep).toBe('deposit');
      expect(result.completedSteps).toEqual(['withdraw']);
      expect(result.compensationResults).toHaveLength(1);
      expect(result.compensationResults![0].stepName).toBe('withdraw');
      expect(result.compensationResults![0].success).toBe(true);
      expect(mockedAxios.post).toHaveBeenCalledTimes(3);
    });

    it('should not compensate when withdraw fails', async () => {
      mockedAxios.post.mockRejectedValueOnce(new Error('Withdraw failed'));

      const saga = createTransferSaga();
      const result = await saga.execute(baseContext);

      expect(result.success).toBe(false);
      expect(result.failedStep).toBe('withdraw');
      expect(result.completedSteps).toEqual([]);
      expect(result.compensationResults).toEqual([]);
      expect(mockedAxios.post).toHaveBeenCalledTimes(1);
    });

    it('should report compensation failure when refund fails', async () => {
      mockedAxios.post
        .mockResolvedValueOnce({ data: { success: true } })
        .mockRejectedValueOnce(new Error('Deposit failed'))
        .mockRejectedValueOnce(new Error('Refund failed'));

      const saga = createTransferSaga();
      const result = await saga.execute(baseContext);

      expect(result.success).toBe(false);
      expect(result.compensationResults![0].success).toBe(false);
      expect(result.compensationResults![0].error?.message).toBe('Refund failed');
    });
  });
});
