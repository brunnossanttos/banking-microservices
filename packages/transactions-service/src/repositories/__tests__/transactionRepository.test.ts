import * as transactionRepository from '../transactionRepository';
import { getPool } from '../../config/database';

jest.mock('../../config/database');

const mockedGetPool = getPool as jest.MockedFunction<typeof getPool>;

describe('transactionRepository', () => {
  const mockQuery = jest.fn();

  const mockTransactionRow = {
    id: 'uuid-123',
    sender_user_id: 'sender-uuid',
    receiver_user_id: 'receiver-uuid',
    amount: '100.00',
    fee: '0.00',
    description: 'Test transfer',
    type: 'transfer' as const,
    status: 'pending' as const,
    idempotency_key: null,
    reference_id: null,
    metadata: null,
    error_message: null,
    error_code: null,
    retry_count: 0,
    created_at: new Date('2024-01-01'),
    updated_at: new Date('2024-01-01'),
    completed_at: null,
    reversed_at: null,
  };

  const expectedTransaction = {
    id: 'uuid-123',
    senderUserId: 'sender-uuid',
    receiverUserId: 'receiver-uuid',
    amount: 100,
    fee: 0,
    description: 'Test transfer',
    type: 'transfer',
    status: 'pending',
    idempotencyKey: undefined,
    referenceId: undefined,
    metadata: undefined,
    errorMessage: undefined,
    errorCode: undefined,
    retryCount: 0,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    completedAt: undefined,
    reversedAt: undefined,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetPool.mockReturnValue({ query: mockQuery } as unknown as ReturnType<typeof getPool>);
  });

  describe('createTransaction', () => {
    const createData = {
      senderUserId: 'sender-uuid',
      receiverUserId: 'receiver-uuid',
      amount: 100,
      description: 'Test transfer',
    };

    it('should create transaction and return mapped transaction', async () => {
      mockQuery.mockResolvedValue({ rows: [mockTransactionRow] });

      const result = await transactionRepository.createTransaction(createData);

      expect(result).toEqual(expectedTransaction);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO transactions'),
        expect.arrayContaining([
          createData.senderUserId,
          createData.receiverUserId,
          createData.amount,
          createData.description,
        ]),
      );
    });

    it('should use default type transfer when not specified', async () => {
      mockQuery.mockResolvedValue({ rows: [mockTransactionRow] });

      await transactionRepository.createTransaction(createData);

      const callArgs = mockQuery.mock.calls[0][1];
      expect(callArgs[4]).toBe('transfer');
    });
  });

  describe('findById', () => {
    it('should return transaction when found', async () => {
      mockQuery.mockResolvedValue({ rows: [mockTransactionRow] });

      const result = await transactionRepository.findById('uuid-123');

      expect(result).toEqual(expectedTransaction);
      expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('WHERE id = $1'), [
        'uuid-123',
      ]);
    });

    it('should return null when transaction not found', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      const result = await transactionRepository.findById('non-existent-id');

      expect(result).toBeNull();
    });
  });

  describe('findByIdempotencyKey', () => {
    it('should return transaction when found', async () => {
      const rowWithKey = { ...mockTransactionRow, idempotency_key: 'idem-key-123' };
      mockQuery.mockResolvedValue({ rows: [rowWithKey] });

      const result = await transactionRepository.findByIdempotencyKey('idem-key-123');

      expect(result).toEqual({
        ...expectedTransaction,
        idempotencyKey: 'idem-key-123',
      });
    });

    it('should return null when not found', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      const result = await transactionRepository.findByIdempotencyKey('non-existent-key');

      expect(result).toBeNull();
    });
  });

  describe('findByUserId', () => {
    it('should return transactions and total count', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ count: '5' }] })
        .mockResolvedValueOnce({ rows: [mockTransactionRow] });

      const result = await transactionRepository.findByUserId('sender-uuid', {
        page: 1,
        limit: 10,
      });

      expect(result.transactions).toHaveLength(1);
      expect(result.total).toBe(5);
    });

    it('should apply status filter', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ count: '2' }] })
        .mockResolvedValueOnce({ rows: [mockTransactionRow] });

      await transactionRepository.findByUserId('sender-uuid', {
        status: 'completed',
      });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('status = $2'),
        expect.arrayContaining(['sender-uuid', 'completed']),
      );
    });

    it('should apply type filter', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ count: '2' }] })
        .mockResolvedValueOnce({ rows: [mockTransactionRow] });

      await transactionRepository.findByUserId('sender-uuid', {
        type: 'transfer',
      });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('type = $2'),
        expect.arrayContaining(['sender-uuid', 'transfer']),
      );
    });

    it('should apply date filters', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      mockQuery
        .mockResolvedValueOnce({ rows: [{ count: '2' }] })
        .mockResolvedValueOnce({ rows: [mockTransactionRow] });

      await transactionRepository.findByUserId('sender-uuid', {
        startDate,
        endDate,
      });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('created_at >= $2'),
        expect.arrayContaining(['sender-uuid', startDate, endDate]),
      );
    });

    it('should use default pagination values', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ count: '0' }] })
        .mockResolvedValueOnce({ rows: [] });

      await transactionRepository.findByUserId('sender-uuid', {});

      const queryCall = mockQuery.mock.calls[1][0];
      expect(queryCall).toContain('LIMIT $2 OFFSET $3');
    });
  });

  describe('updateStatus', () => {
    it('should update status to completed with completed_at timestamp', async () => {
      mockQuery.mockResolvedValue({ rowCount: 1 });

      const result = await transactionRepository.updateStatus('uuid-123', 'completed');

      expect(result).toBe(true);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('completed_at = CURRENT_TIMESTAMP'),
        ['completed', 'uuid-123'],
      );
    });

    it('should update status to failed with error message', async () => {
      mockQuery.mockResolvedValue({ rowCount: 1 });

      const result = await transactionRepository.updateStatus(
        'uuid-123',
        'failed',
        'Insufficient balance',
        'INSUFFICIENT_BALANCE',
      );

      expect(result).toBe(true);
      expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('error_message = $2'), [
        'failed',
        'Insufficient balance',
        'INSUFFICIENT_BALANCE',
        'uuid-123',
      ]);
    });

    it('should update status to reversed with reversed_at timestamp', async () => {
      mockQuery.mockResolvedValue({ rowCount: 1 });

      const result = await transactionRepository.updateStatus('uuid-123', 'reversed');

      expect(result).toBe(true);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('reversed_at = CURRENT_TIMESTAMP'),
        ['reversed', 'uuid-123'],
      );
    });

    it('should return false when transaction not found', async () => {
      mockQuery.mockResolvedValue({ rowCount: 0 });

      const result = await transactionRepository.updateStatus('non-existent-id', 'completed');

      expect(result).toBe(false);
    });
  });

  describe('incrementRetryCount', () => {
    it('should increment retry count', async () => {
      mockQuery.mockResolvedValue({ rowCount: 1 });

      const result = await transactionRepository.incrementRetryCount('uuid-123');

      expect(result).toBe(true);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('retry_count = retry_count + 1'),
        ['uuid-123'],
      );
    });

    it('should return false when transaction not found', async () => {
      mockQuery.mockResolvedValue({ rowCount: 0 });

      const result = await transactionRepository.incrementRetryCount('non-existent-id');

      expect(result).toBe(false);
    });
  });
});
