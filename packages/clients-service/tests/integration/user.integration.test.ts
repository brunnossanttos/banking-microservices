import request from 'supertest';
import { createApp } from '../../src/app';
import { getPool } from '../../src/config/database';
import { cleanDatabase, generateTestEmail, generateTestCpf, generateTestAccount } from '../setup';

const app = createApp();

describe('POST /api/users', () => {
  beforeEach(async () => {
    await cleanDatabase();
  });

  const createValidInput = () => ({
    email: generateTestEmail(),
    password: 'password123',
    name: 'Integration Test User',
    cpf: generateTestCpf(),
    bankingDetails: {
      agency: '0001',
      account: generateTestAccount(),
      accountType: 'checking',
    },
  });

  it('should create a user and persist in database', async () => {
    const input = createValidInput();

    const response = await request(app)
      .post('/api/users')
      .send(input)
      .expect(201);

    expect(response.body).toMatchObject({
      success: true,
      message: 'User created successfully',
      data: {
        email: input.email,
        name: input.name,
        cpf: input.cpf.replace(/\D/g, ''),
        status: 'pending_verification',
        emailVerified: false,
        bankingDetails: {
          agency: input.bankingDetails.agency,
          account: input.bankingDetails.account,
          accountType: input.bankingDetails.accountType,
          balance: 0,
        },
      },
    });
    expect(response.body.data.id).toBeDefined();
    expect(response.body.timestamp).toBeDefined();

    const pool = getPool();
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [input.email]);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].name).toBe(input.name);
  });

  it('should hash the password before storing', async () => {
    const input = createValidInput();

    await request(app)
      .post('/api/users')
      .send(input)
      .expect(201);

    const pool = getPool();
    const result = await pool.query('SELECT password_hash FROM users WHERE email = $1', [input.email]);

    expect(result.rows[0].password_hash).not.toBe(input.password);
    expect(result.rows[0].password_hash).toMatch(/^\$2[aby]\$/); // bcrypt hash format
  });

  it('should return 409 when email already exists', async () => {
    const input = createValidInput();

    await request(app)
      .post('/api/users')
      .send(input)
      .expect(201);

    const response = await request(app)
      .post('/api/users')
      .send({ ...input, cpf: generateTestCpf(), bankingDetails: { ...input.bankingDetails, account: generateTestAccount() } })
      .expect(409);

    expect(response.body).toMatchObject({
      success: false,
      error: 'Email already registered',
    });
  });

  it('should return 409 when CPF already exists', async () => {
    const input = createValidInput();

    await request(app)
      .post('/api/users')
      .send(input)
      .expect(201);

    const response = await request(app)
      .post('/api/users')
      .send({ ...input, email: generateTestEmail(), bankingDetails: { ...input.bankingDetails, account: generateTestAccount() } })
      .expect(409);

    expect(response.body).toMatchObject({
      success: false,
      error: 'CPF already registered',
    });
  });

  it('should return 409 when banking details already exist', async () => {
    const input = createValidInput();

    await request(app)
      .post('/api/users')
      .send(input)
      .expect(201);

    const response = await request(app)
      .post('/api/users')
      .send({ ...input, email: generateTestEmail(), cpf: generateTestCpf() })
      .expect(409);

    expect(response.body).toMatchObject({
      success: false,
      error: 'Banking details already in use',
    });
  });

  it('should return 400 for invalid email format', async () => {
    const input = { ...createValidInput(), email: 'invalid-email' };

    const response = await request(app)
      .post('/api/users')
      .send(input)
      .expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.details).toContainEqual(
      expect.objectContaining({ field: 'body.email' }),
    );
  });

  it('should return 400 for password too short', async () => {
    const input = { ...createValidInput(), password: '123' };

    const response = await request(app)
      .post('/api/users')
      .send(input)
      .expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.details).toContainEqual(
      expect.objectContaining({ field: 'body.password' }),
    );
  });

  it('should return 400 for invalid CPF format', async () => {
    const input = { ...createValidInput(), cpf: '123' };

    const response = await request(app)
      .post('/api/users')
      .send(input)
      .expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.details).toContainEqual(
      expect.objectContaining({ field: 'body.cpf' }),
    );
  });

  it('should sanitize CPF before storing', async () => {
    const rawCpf = generateTestCpf();
    const formattedCpf = `${rawCpf.slice(0, 3)}.${rawCpf.slice(3, 6)}.${rawCpf.slice(6, 9)}-${rawCpf.slice(9, 11)}`;
    const input = { ...createValidInput(), cpf: formattedCpf };

    await request(app)
      .post('/api/users')
      .send(input)
      .expect(201);

    const pool = getPool();
    const result = await pool.query('SELECT cpf FROM users WHERE email = $1', [input.email]);
    expect(result.rows[0].cpf).toBe(rawCpf);
  });
});

describe('GET /api/users/:userId', () => {
  beforeEach(async () => {
    await cleanDatabase();
  });

  const createValidInput = () => ({
    email: generateTestEmail(),
    password: 'password123',
    name: 'Integration Test User',
    cpf: generateTestCpf(),
    bankingDetails: {
      agency: '0001',
      account: generateTestAccount(),
      accountType: 'checking',
    },
  });

  it('should return user data when user exists', async () => {
    const input = createValidInput();

    const createResponse = await request(app)
      .post('/api/users')
      .send(input)
      .expect(201);

    const userId = createResponse.body.data.id;

    const response = await request(app)
      .get(`/api/users/${userId}`)
      .expect(200);

    expect(response.body).toMatchObject({
      success: true,
      data: {
        id: userId,
        email: input.email,
        name: input.name,
        cpf: input.cpf.replace(/\D/g, ''),
        bankingDetails: {
          agency: input.bankingDetails.agency,
          account: input.bankingDetails.account,
          accountType: input.bankingDetails.accountType,
          balance: 0,
        },
      },
    });
    expect(response.body.timestamp).toBeDefined();
  });

  it('should return 404 when user does not exist', async () => {
    const nonExistentId = '00000000-0000-0000-0000-000000000000';

    const response = await request(app)
      .get(`/api/users/${nonExistentId}`)
      .expect(404);

    expect(response.body).toMatchObject({
      success: false,
      error: 'User not found',
    });
  });

  it('should return 400 for invalid UUID format', async () => {
    const response = await request(app)
      .get('/api/users/invalid-uuid')
      .expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.details).toContainEqual(
      expect.objectContaining({ field: 'params.userId' }),
    );
  });

  it('should not return password in response', async () => {
    const input = createValidInput();

    const createResponse = await request(app)
      .post('/api/users')
      .send(input)
      .expect(201);

    const userId = createResponse.body.data.id;

    const response = await request(app)
      .get(`/api/users/${userId}`)
      .expect(200);

    expect(response.body.data.password).toBeUndefined();
    expect(response.body.data.passwordHash).toBeUndefined();
  });
});

describe('PATCH /api/users/:userId', () => {
  beforeEach(async () => {
    await cleanDatabase();
  });

  const createValidInput = () => ({
    email: generateTestEmail(),
    password: 'password123',
    name: 'Integration Test User',
    cpf: generateTestCpf(),
    bankingDetails: {
      agency: '0001',
      account: generateTestAccount(),
      accountType: 'checking',
    },
  });

  it('should update user name successfully', async () => {
    const input = createValidInput();

    const createResponse = await request(app)
      .post('/api/users')
      .send(input)
      .expect(201);

    const userId = createResponse.body.data.id;

    const response = await request(app)
      .patch(`/api/users/${userId}`)
      .send({ name: 'Updated Name' })
      .expect(200);

    expect(response.body).toMatchObject({
      success: true,
      message: 'User updated successfully',
    });
    expect(response.body.timestamp).toBeDefined();

    const getResponse = await request(app)
      .get(`/api/users/${userId}`)
      .expect(200);

    expect(getResponse.body.data.name).toBe('Updated Name');
  });

  it('should update user email successfully', async () => {
    const input = createValidInput();

    const createResponse = await request(app)
      .post('/api/users')
      .send(input)
      .expect(201);

    const userId = createResponse.body.data.id;
    const newEmail = generateTestEmail();

    await request(app)
      .patch(`/api/users/${userId}`)
      .send({ email: newEmail })
      .expect(200);

    const getResponse = await request(app)
      .get(`/api/users/${userId}`)
      .expect(200);

    expect(getResponse.body.data.email).toBe(newEmail);
  });

  it('should update banking details successfully', async () => {
    const input = createValidInput();

    const createResponse = await request(app)
      .post('/api/users')
      .send(input)
      .expect(201);

    const userId = createResponse.body.data.id;

    await request(app)
      .patch(`/api/users/${userId}`)
      .send({ bankingDetails: { agency: '0002' } })
      .expect(200);

    const getResponse = await request(app)
      .get(`/api/users/${userId}`)
      .expect(200);

    expect(getResponse.body.data.bankingDetails.agency).toBe('0002');
    expect(getResponse.body.data.bankingDetails.account).toBe(input.bankingDetails.account);
  });

  it('should return 404 when user does not exist', async () => {
    const nonExistentId = '00000000-0000-0000-0000-000000000000';

    const response = await request(app)
      .patch(`/api/users/${nonExistentId}`)
      .send({ name: 'New Name' })
      .expect(404);

    expect(response.body).toMatchObject({
      success: false,
      error: 'User not found',
    });
  });

  it('should return 409 when email already exists', async () => {
    const input1 = createValidInput();
    const input2 = createValidInput();

    await request(app)
      .post('/api/users')
      .send(input1)
      .expect(201);

    const createResponse2 = await request(app)
      .post('/api/users')
      .send(input2)
      .expect(201);

    const userId2 = createResponse2.body.data.id;

    const response = await request(app)
      .patch(`/api/users/${userId2}`)
      .send({ email: input1.email })
      .expect(409);

    expect(response.body).toMatchObject({
      success: false,
      error: 'Email already registered',
    });
  });

  it('should return 409 when banking details already exist', async () => {
    const input1 = createValidInput();
    const input2 = createValidInput();

    await request(app)
      .post('/api/users')
      .send(input1)
      .expect(201);

    const createResponse2 = await request(app)
      .post('/api/users')
      .send(input2)
      .expect(201);

    const userId2 = createResponse2.body.data.id;

    const response = await request(app)
      .patch(`/api/users/${userId2}`)
      .send({
        bankingDetails: {
          agency: input1.bankingDetails.agency,
          account: input1.bankingDetails.account,
        },
      })
      .expect(409);

    expect(response.body).toMatchObject({
      success: false,
      error: 'Banking details already in use',
    });
  });

  it('should return 400 for invalid UUID format', async () => {
    const response = await request(app)
      .patch('/api/users/invalid-uuid')
      .send({ name: 'New Name' })
      .expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.details).toContainEqual(
      expect.objectContaining({ field: 'params.userId' }),
    );
  });

  it('should return 400 when no fields provided', async () => {
    const input = createValidInput();

    const createResponse = await request(app)
      .post('/api/users')
      .send(input)
      .expect(201);

    const userId = createResponse.body.data.id;

    const response = await request(app)
      .patch(`/api/users/${userId}`)
      .send({})
      .expect(400);

    expect(response.body.success).toBe(false);
  });

  it('should return 400 for invalid email format', async () => {
    const input = createValidInput();

    const createResponse = await request(app)
      .post('/api/users')
      .send(input)
      .expect(201);

    const userId = createResponse.body.data.id;

    const response = await request(app)
      .patch(`/api/users/${userId}`)
      .send({ email: 'invalid-email' })
      .expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.details).toContainEqual(
      expect.objectContaining({ field: 'body.email' }),
    );
  });
});

describe('PATCH /api/users/:userId/profile-picture', () => {
  beforeEach(async () => {
    await cleanDatabase();
  });

  const createValidInput = () => ({
    email: generateTestEmail(),
    password: 'password123',
    name: 'Integration Test User',
    cpf: generateTestCpf(),
    bankingDetails: {
      agency: '0001',
      account: generateTestAccount(),
      accountType: 'checking',
    },
  });

  it('should update profile picture successfully', async () => {
    const input = createValidInput();

    const createResponse = await request(app)
      .post('/api/users')
      .send(input)
      .expect(201);

    const userId = createResponse.body.data.id;
    const profilePictureUrl = 'https://example.com/photo.jpg';

    const response = await request(app)
      .patch(`/api/users/${userId}/profile-picture`)
      .send({ profilePictureUrl })
      .expect(200);

    expect(response.body).toMatchObject({
      success: true,
      message: 'Profile picture updated successfully',
    });
    expect(response.body.timestamp).toBeDefined();

    const getResponse = await request(app)
      .get(`/api/users/${userId}`)
      .expect(200);

    expect(getResponse.body.data.profilePictureUrl).toBe(profilePictureUrl);
  });

  it('should return 404 when user does not exist', async () => {
    const nonExistentId = '00000000-0000-0000-0000-000000000000';

    const response = await request(app)
      .patch(`/api/users/${nonExistentId}/profile-picture`)
      .send({ profilePictureUrl: 'https://example.com/photo.jpg' })
      .expect(404);

    expect(response.body).toMatchObject({
      success: false,
      error: 'User not found',
    });
  });

  it('should return 400 for invalid UUID format', async () => {
    const response = await request(app)
      .patch('/api/users/invalid-uuid/profile-picture')
      .send({ profilePictureUrl: 'https://example.com/photo.jpg' })
      .expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.details).toContainEqual(
      expect.objectContaining({ field: 'params.userId' }),
    );
  });

  it('should return 400 for invalid URL format', async () => {
    const input = createValidInput();

    const createResponse = await request(app)
      .post('/api/users')
      .send(input)
      .expect(201);

    const userId = createResponse.body.data.id;

    const response = await request(app)
      .patch(`/api/users/${userId}/profile-picture`)
      .send({ profilePictureUrl: 'not-a-valid-url' })
      .expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.details).toContainEqual(
      expect.objectContaining({ field: 'body.profilePictureUrl' }),
    );
  });

  it('should return 400 when profilePictureUrl is missing', async () => {
    const input = createValidInput();

    const createResponse = await request(app)
      .post('/api/users')
      .send(input)
      .expect(201);

    const userId = createResponse.body.data.id;

    const response = await request(app)
      .patch(`/api/users/${userId}/profile-picture`)
      .send({})
      .expect(400);

    expect(response.body.success).toBe(false);
  });
});

describe('POST /api/users/:userId/deposit', () => {
  beforeEach(async () => {
    await cleanDatabase();
  });

  const createValidInput = () => ({
    email: generateTestEmail(),
    password: 'password123',
    name: 'Integration Test User',
    cpf: generateTestCpf(),
    bankingDetails: {
      agency: '0001',
      account: generateTestAccount(),
      accountType: 'checking',
    },
  });

  it('should deposit amount and update balance', async () => {
    const input = createValidInput();

    const createResponse = await request(app)
      .post('/api/users')
      .send(input)
      .expect(201);

    const userId = createResponse.body.data.id;

    const response = await request(app)
      .post(`/api/users/${userId}/deposit`)
      .send({ amount: 1000 })
      .expect(200);

    expect(response.body).toMatchObject({
      success: true,
      message: 'Deposit completed successfully',
      data: {
        userId,
        newBalance: 1000,
      },
    });
    expect(response.body.timestamp).toBeDefined();

    const getResponse = await request(app)
      .get(`/api/users/${userId}`)
      .expect(200);

    expect(getResponse.body.data.bankingDetails.balance).toBe(1000);
  });

  it('should accumulate multiple deposits', async () => {
    const input = createValidInput();

    const createResponse = await request(app)
      .post('/api/users')
      .send(input)
      .expect(201);

    const userId = createResponse.body.data.id;

    await request(app)
      .post(`/api/users/${userId}/deposit`)
      .send({ amount: 500 })
      .expect(200);

    const response = await request(app)
      .post(`/api/users/${userId}/deposit`)
      .send({ amount: 300 })
      .expect(200);

    expect(response.body.data.newBalance).toBe(800);
  });

  it('should return 404 when user does not exist', async () => {
    const nonExistentId = '00000000-0000-0000-0000-000000000000';

    const response = await request(app)
      .post(`/api/users/${nonExistentId}/deposit`)
      .send({ amount: 100 })
      .expect(404);

    expect(response.body).toMatchObject({
      success: false,
      error: 'User not found',
    });
  });

  it('should return 400 for invalid UUID format', async () => {
    const response = await request(app)
      .post('/api/users/invalid-uuid/deposit')
      .send({ amount: 100 })
      .expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.details).toContainEqual(
      expect.objectContaining({ field: 'params.userId' }),
    );
  });

  it('should return 400 for zero amount', async () => {
    const input = createValidInput();

    const createResponse = await request(app)
      .post('/api/users')
      .send(input)
      .expect(201);

    const userId = createResponse.body.data.id;

    const response = await request(app)
      .post(`/api/users/${userId}/deposit`)
      .send({ amount: 0 })
      .expect(400);

    expect(response.body.success).toBe(false);
  });

  it('should return 400 for negative amount', async () => {
    const input = createValidInput();

    const createResponse = await request(app)
      .post('/api/users')
      .send(input)
      .expect(201);

    const userId = createResponse.body.data.id;

    const response = await request(app)
      .post(`/api/users/${userId}/deposit`)
      .send({ amount: -100 })
      .expect(400);

    expect(response.body.success).toBe(false);
  });

  it('should return 400 when amount is missing', async () => {
    const input = createValidInput();

    const createResponse = await request(app)
      .post('/api/users')
      .send(input)
      .expect(201);

    const userId = createResponse.body.data.id;

    const response = await request(app)
      .post(`/api/users/${userId}/deposit`)
      .send({})
      .expect(400);

    expect(response.body.success).toBe(false);
  });
});

describe('POST /api/users/:userId/withdraw', () => {
  beforeEach(async () => {
    await cleanDatabase();
  });

  const createValidInput = () => ({
    email: generateTestEmail(),
    password: 'password123',
    name: 'Integration Test User',
    cpf: generateTestCpf(),
    bankingDetails: {
      agency: '0001',
      account: generateTestAccount(),
      accountType: 'checking',
    },
  });

  it('should withdraw amount and update balance', async () => {
    const input = createValidInput();

    const createResponse = await request(app)
      .post('/api/users')
      .send(input)
      .expect(201);

    const userId = createResponse.body.data.id;

    await request(app)
      .post(`/api/users/${userId}/deposit`)
      .send({ amount: 1000 })
      .expect(200);

    const response = await request(app)
      .post(`/api/users/${userId}/withdraw`)
      .send({ amount: 400 })
      .expect(200);

    expect(response.body).toMatchObject({
      success: true,
      message: 'Withdrawal completed successfully',
      data: {
        userId,
        newBalance: 600,
      },
    });
    expect(response.body.timestamp).toBeDefined();

    const getResponse = await request(app)
      .get(`/api/users/${userId}`)
      .expect(200);

    expect(getResponse.body.data.bankingDetails.balance).toBe(600);
  });

  it('should return 400 for insufficient balance', async () => {
    const input = createValidInput();

    const createResponse = await request(app)
      .post('/api/users')
      .send(input)
      .expect(201);

    const userId = createResponse.body.data.id;

    await request(app)
      .post(`/api/users/${userId}/deposit`)
      .send({ amount: 100 })
      .expect(200);

    const response = await request(app)
      .post(`/api/users/${userId}/withdraw`)
      .send({ amount: 500 })
      .expect(400);

    expect(response.body).toMatchObject({
      success: false,
      error: 'Insufficient balance',
    });
  });

  it('should return 404 when user does not exist', async () => {
    const nonExistentId = '00000000-0000-0000-0000-000000000000';

    const response = await request(app)
      .post(`/api/users/${nonExistentId}/withdraw`)
      .send({ amount: 100 })
      .expect(404);

    expect(response.body).toMatchObject({
      success: false,
      error: 'User not found',
    });
  });

  it('should return 400 for invalid UUID format', async () => {
    const response = await request(app)
      .post('/api/users/invalid-uuid/withdraw')
      .send({ amount: 100 })
      .expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.details).toContainEqual(
      expect.objectContaining({ field: 'params.userId' }),
    );
  });

  it('should return 400 for zero amount', async () => {
    const input = createValidInput();

    const createResponse = await request(app)
      .post('/api/users')
      .send(input)
      .expect(201);

    const userId = createResponse.body.data.id;

    const response = await request(app)
      .post(`/api/users/${userId}/withdraw`)
      .send({ amount: 0 })
      .expect(400);

    expect(response.body.success).toBe(false);
  });

  it('should return 400 for negative amount', async () => {
    const input = createValidInput();

    const createResponse = await request(app)
      .post('/api/users')
      .send(input)
      .expect(201);

    const userId = createResponse.body.data.id;

    const response = await request(app)
      .post(`/api/users/${userId}/withdraw`)
      .send({ amount: -100 })
      .expect(400);

    expect(response.body.success).toBe(false);
  });

  it('should return 400 when amount is missing', async () => {
    const input = createValidInput();

    const createResponse = await request(app)
      .post('/api/users')
      .send(input)
      .expect(201);

    const userId = createResponse.body.data.id;

    const response = await request(app)
      .post(`/api/users/${userId}/withdraw`)
      .send({})
      .expect(400);

    expect(response.body.success).toBe(false);
  });

  it('should allow withdrawal of entire balance', async () => {
    const input = createValidInput();

    const createResponse = await request(app)
      .post('/api/users')
      .send(input)
      .expect(201);

    const userId = createResponse.body.data.id;

    await request(app)
      .post(`/api/users/${userId}/deposit`)
      .send({ amount: 500 })
      .expect(200);

    const response = await request(app)
      .post(`/api/users/${userId}/withdraw`)
      .send({ amount: 500 })
      .expect(200);

    expect(response.body.data.newBalance).toBe(0);
  });
});
