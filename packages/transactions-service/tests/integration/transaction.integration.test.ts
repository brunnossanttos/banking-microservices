import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createApp } from '../../src/app';
import { getPool } from '../../src/config/database';
import { cleanDatabase, generateTestUUID } from '../setup';
import axios from 'axios';

jest.mock('axios', () => ({
  get: jest.fn(),
  post: jest.fn(),
  isAxiosError: (error: unknown): boolean => {
    return typeof error === 'object' && error !== null && 'isAxiosError' in error;
  },
}));

const mockedAxios = axios as jest.Mocked<typeof axios>;
const app = createApp();

const jwtSecret = 'your-super-secret-key-change-in-production';

const generateAuthToken = (userId: string): string => {
  return jwt.sign({ userId, email: `${userId}@test.com` }, jwtSecret, { expiresIn: '1h' });
};

const mockUserBankingInfo = (userId: string, balance: number = 1000) => ({
  id: userId,
  name: 'Test User',
  email: `${userId}@test.com`,
  bankingDetails: {
    agency: '0001',
    account: '12345-6',
    accountType: 'checking',
    balance,
  },
});

describe('POST /api/transactions', () => {
  beforeEach(async () => {
    await cleanDatabase();
    mockedAxios.get.mockReset();
    mockedAxios.post.mockReset();
    mockedAxios.post.mockResolvedValue({ data: { success: true } });
  });

  const createValidInput = () => {
    const senderUserId = generateTestUUID();
    return {
      senderUserId,
      receiverUserId: generateTestUUID(),
      amount: 100,
      description: 'Integration test transfer',
      token: generateAuthToken(senderUserId),
    };
  };

  it('should create a transaction and persist in database', async () => {
    const { token, ...input } = createValidInput();

    mockedAxios.get
      .mockResolvedValueOnce({
        data: { success: true, data: mockUserBankingInfo(input.senderUserId, 1000) },
      })
      .mockResolvedValueOnce({
        data: { success: true, data: mockUserBankingInfo(input.receiverUserId, 500) },
      });

    const response = await request(app)
      .post('/api/transactions')
      .set('Authorization', `Bearer ${token}`)
      .send(input)
      .expect(201);

    expect(response.body).toMatchObject({
      success: true,
      message: 'Transaction created successfully',
      data: {
        senderUserId: input.senderUserId,
        receiverUserId: input.receiverUserId,
        amount: input.amount,
        description: input.description,
        type: 'transfer',
        status: 'completed',
      },
    });
    expect(response.body.data.id).toBeDefined();
    expect(response.body.timestamp).toBeDefined();

    const pool = getPool();
    const result = await pool.query('SELECT * FROM transactions WHERE id = $1', [
      response.body.data.id,
    ]);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].sender_user_id).toBe(input.senderUserId);
    expect(result.rows[0].receiver_user_id).toBe(input.receiverUserId);
    expect(parseFloat(result.rows[0].amount)).toBe(input.amount);
    expect(result.rows[0].status).toBe('completed');
  });

  it('should return 401 without authentication', async () => {
    const { token: _token, ...input } = createValidInput();

    const response = await request(app)
      .post('/api/transactions')
      .send(input)
      .expect(401);

    expect(response.body).toMatchObject({
      success: false,
      error: 'Authorization header missing',
    });
  });

  it('should return 403 when sender is not the authenticated user', async () => {
    const differentUserId = generateTestUUID();
    const { token: _token, ...input } = createValidInput();
    const wrongToken = generateAuthToken(differentUserId);

    const response = await request(app)
      .post('/api/transactions')
      .set('Authorization', `Bearer ${wrongToken}`)
      .send(input)
      .expect(403);

    expect(response.body).toMatchObject({
      success: false,
      error: 'You can only create transactions from your own account',
    });
  });

  it('should return 400 when transferring to yourself', async () => {
    const userId = generateTestUUID();
    const token = generateAuthToken(userId);
    const input = {
      senderUserId: userId,
      receiverUserId: userId,
      amount: 100,
      description: 'Self transfer',
    };

    const response = await request(app)
      .post('/api/transactions')
      .set('Authorization', `Bearer ${token}`)
      .send(input)
      .expect(400);

    expect(response.body).toMatchObject({
      success: false,
      error: 'Cannot transfer to yourself',
    });
  });

  it('should return 400 when sender has insufficient balance', async () => {
    const { token, ...input } = createValidInput();

    mockedAxios.get
      .mockResolvedValueOnce({
        data: { success: true, data: mockUserBankingInfo(input.senderUserId, 50) },
      })
      .mockResolvedValueOnce({
        data: { success: true, data: mockUserBankingInfo(input.receiverUserId, 500) },
      });

    const response = await request(app)
      .post('/api/transactions')
      .set('Authorization', `Bearer ${token}`)
      .send(input)
      .expect(400);

    expect(response.body).toMatchObject({
      success: false,
      error: 'Insufficient balance',
    });
  });

  it('should return 404 when sender not found', async () => {
    const { token, ...input } = createValidInput();
    const axiosError = {
      isAxiosError: true,
      response: { status: 404 },
    };

    mockedAxios.get.mockRejectedValue(axiosError);

    const response = await request(app)
      .post('/api/transactions')
      .set('Authorization', `Bearer ${token}`)
      .send(input)
      .expect(404);

    expect(response.body).toMatchObject({
      success: false,
      error: 'Sender user not found',
    });
  });

  it('should return 404 when receiver not found', async () => {
    const { token, ...input } = createValidInput();
    const axiosError = {
      isAxiosError: true,
      response: { status: 404 },
    };

    mockedAxios.get
      .mockResolvedValueOnce({
        data: { success: true, data: mockUserBankingInfo(input.senderUserId, 1000) },
      })
      .mockRejectedValueOnce(axiosError);

    const response = await request(app)
      .post('/api/transactions')
      .set('Authorization', `Bearer ${token}`)
      .send(input)
      .expect(404);

    expect(response.body).toMatchObject({
      success: false,
      error: 'Receiver user not found',
    });
  });

  it('should return 400 for invalid UUID format', async () => {
    const token = generateAuthToken('invalid-uuid');

    const response = await request(app)
      .post('/api/transactions')
      .set('Authorization', `Bearer ${token}`)
      .send({
        senderUserId: 'invalid-uuid',
        receiverUserId: 'invalid-uuid',
        amount: 100,
      })
      .expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.details).toContainEqual(
      expect.objectContaining({ field: 'body.senderUserId' }),
    );
  });

  it('should return 400 for negative amount', async () => {
    const senderUserId = generateTestUUID();
    const token = generateAuthToken(senderUserId);

    const response = await request(app)
      .post('/api/transactions')
      .set('Authorization', `Bearer ${token}`)
      .send({
        senderUserId,
        receiverUserId: generateTestUUID(),
        amount: -100,
      })
      .expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.details).toContainEqual(
      expect.objectContaining({ field: 'body.amount' }),
    );
  });

  it('should return 400 for zero amount', async () => {
    const senderUserId = generateTestUUID();
    const token = generateAuthToken(senderUserId);

    const response = await request(app)
      .post('/api/transactions')
      .set('Authorization', `Bearer ${token}`)
      .send({
        senderUserId,
        receiverUserId: generateTestUUID(),
        amount: 0,
      })
      .expect(400);

    expect(response.body.success).toBe(false);
  });

  it('should return 400 when required fields are missing', async () => {
    const token = generateAuthToken(generateTestUUID());

    const response = await request(app)
      .post('/api/transactions')
      .set('Authorization', `Bearer ${token}`)
      .send({})
      .expect(400);

    expect(response.body.success).toBe(false);
  });
});

describe('GET /api/transactions/:transactionId', () => {
  beforeEach(async () => {
    await cleanDatabase();
    mockedAxios.get.mockReset();
    mockedAxios.post.mockReset();
    mockedAxios.post.mockResolvedValue({ data: { success: true } });
  });

  it('should return transaction when exists', async () => {
    const senderUserId = generateTestUUID();
    const receiverUserId = generateTestUUID();
    const token = generateAuthToken(senderUserId);
    const input = {
      senderUserId,
      receiverUserId,
      amount: 100,
      description: 'Test transfer',
    };

    mockedAxios.get
      .mockResolvedValueOnce({
        data: { success: true, data: mockUserBankingInfo(input.senderUserId, 1000) },
      })
      .mockResolvedValueOnce({
        data: { success: true, data: mockUserBankingInfo(input.receiverUserId, 500) },
      });

    const createResponse = await request(app)
      .post('/api/transactions')
      .set('Authorization', `Bearer ${token}`)
      .send(input)
      .expect(201);

    const transactionId = createResponse.body.data.id;

    const response = await request(app)
      .get(`/api/transactions/${transactionId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(response.body).toMatchObject({
      success: true,
      data: {
        id: transactionId,
        senderUserId: input.senderUserId,
        receiverUserId: input.receiverUserId,
        amount: input.amount,
        description: input.description,
        type: 'transfer',
        status: 'completed',
      },
    });
    expect(response.body.timestamp).toBeDefined();
  });

  it('should return 401 without authentication', async () => {
    const nonExistentId = '00000000-0000-0000-0000-000000000000';

    const response = await request(app)
      .get(`/api/transactions/${nonExistentId}`)
      .expect(401);

    expect(response.body).toMatchObject({
      success: false,
      error: 'Authorization header missing',
    });
  });

  it('should return 404 when transaction does not exist', async () => {
    const token = generateAuthToken(generateTestUUID());
    const nonExistentId = '00000000-0000-0000-0000-000000000000';

    const response = await request(app)
      .get(`/api/transactions/${nonExistentId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(404);

    expect(response.body).toMatchObject({
      success: false,
      error: 'Transaction not found',
    });
  });

  it('should return 400 for invalid UUID format', async () => {
    const token = generateAuthToken(generateTestUUID());

    const response = await request(app)
      .get('/api/transactions/invalid-uuid')
      .set('Authorization', `Bearer ${token}`)
      .expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.details).toContainEqual(
      expect.objectContaining({ field: 'params.transactionId' }),
    );
  });
});

describe('GET /api/transactions/user/:userId', () => {
  beforeEach(async () => {
    await cleanDatabase();
    mockedAxios.get.mockReset();
    mockedAxios.post.mockReset();
    mockedAxios.post.mockResolvedValue({ data: { success: true } });
  });

  const createTransaction = async (
    senderUserId: string,
    receiverUserId: string,
    amount: number,
    token: string,
  ) => {
    mockedAxios.get
      .mockResolvedValueOnce({
        data: { success: true, data: mockUserBankingInfo(senderUserId, 10000) },
      })
      .mockResolvedValueOnce({
        data: { success: true, data: mockUserBankingInfo(receiverUserId, 500) },
      });

    return request(app)
      .post('/api/transactions')
      .set('Authorization', `Bearer ${token}`)
      .send({
        senderUserId,
        receiverUserId,
        amount,
        description: 'Test transfer',
      })
      .expect(201);
  };

  it('should return paginated transactions for user', async () => {
    const userId = generateTestUUID();
    const otherUserId = generateTestUUID();
    const token = generateAuthToken(userId);
    const otherToken = generateAuthToken(otherUserId);

    await createTransaction(userId, otherUserId, 100, token);
    await createTransaction(userId, otherUserId, 200, token);
    await createTransaction(otherUserId, userId, 50, otherToken);

    mockedAxios.get.mockResolvedValueOnce({
      data: { success: true, data: mockUserBankingInfo(userId) },
    });

    const response = await request(app)
      .get(`/api/transactions/user/${userId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(response.body).toMatchObject({
      success: true,
      pagination: {
        page: 1,
        limit: 10,
        total: 3,
        totalPages: 1,
      },
    });
    expect(response.body.data).toHaveLength(3);
    expect(response.body.timestamp).toBeDefined();
  });

  it('should return 401 without authentication', async () => {
    const userId = generateTestUUID();

    const response = await request(app)
      .get(`/api/transactions/user/${userId}`)
      .expect(401);

    expect(response.body).toMatchObject({
      success: false,
      error: 'Authorization header missing',
    });
  });

  it('should return 403 when accessing other user transactions', async () => {
    const userId = generateTestUUID();
    const otherUserId = generateTestUUID();
    const token = generateAuthToken(otherUserId);

    const response = await request(app)
      .get(`/api/transactions/user/${userId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(403);

    expect(response.body).toMatchObject({
      success: false,
      error: 'Access denied. You can only access your own resources',
    });
  });

  it('should apply pagination parameters', async () => {
    const userId = generateTestUUID();
    const otherUserId = generateTestUUID();
    const token = generateAuthToken(userId);

    await createTransaction(userId, otherUserId, 100, token);
    await createTransaction(userId, otherUserId, 200, token);
    await createTransaction(userId, otherUserId, 300, token);
    await createTransaction(userId, otherUserId, 400, token);
    await createTransaction(userId, otherUserId, 500, token);

    mockedAxios.get.mockResolvedValueOnce({
      data: { success: true, data: mockUserBankingInfo(userId) },
    });

    const response = await request(app)
      .get(`/api/transactions/user/${userId}?page=2&limit=2`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(response.body.pagination).toMatchObject({
      page: 2,
      limit: 2,
      total: 5,
      totalPages: 3,
    });
    expect(response.body.data).toHaveLength(2);
  });

  it('should filter by status', async () => {
    const userId = generateTestUUID();
    const otherUserId = generateTestUUID();
    const token = generateAuthToken(userId);

    await createTransaction(userId, otherUserId, 100, token);

    mockedAxios.get.mockResolvedValueOnce({
      data: { success: true, data: mockUserBankingInfo(userId) },
    });

    const response = await request(app)
      .get(`/api/transactions/user/${userId}?status=completed`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(
      response.body.data.every((t: { status: string }) => t.status === 'completed'),
    ).toBe(true);
  });

  it('should filter by type', async () => {
    const userId = generateTestUUID();
    const otherUserId = generateTestUUID();
    const token = generateAuthToken(userId);

    await createTransaction(userId, otherUserId, 100, token);

    mockedAxios.get.mockResolvedValueOnce({
      data: { success: true, data: mockUserBankingInfo(userId) },
    });

    const response = await request(app)
      .get(`/api/transactions/user/${userId}?type=transfer`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.every((t: { type: string }) => t.type === 'transfer')).toBe(
      true,
    );
  });

  it('should return 400 for invalid UUID format', async () => {
    const token = generateAuthToken('invalid-uuid');

    const response = await request(app)
      .get('/api/transactions/user/invalid-uuid')
      .set('Authorization', `Bearer ${token}`)
      .expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.details).toContainEqual(
      expect.objectContaining({ field: 'params.userId' }),
    );
  });

  it('should return empty array when user has no transactions', async () => {
    const userId = generateTestUUID();
    const token = generateAuthToken(userId);

    mockedAxios.get.mockResolvedValueOnce({
      data: { success: true, data: mockUserBankingInfo(userId) },
    });

    const response = await request(app)
      .get(`/api/transactions/user/${userId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(response.body).toMatchObject({
      success: true,
      data: [],
      pagination: {
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0,
      },
    });
  });
});
