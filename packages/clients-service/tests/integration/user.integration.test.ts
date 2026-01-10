import request from 'supertest';
import { createApp } from '../../src/app';
import { getPool } from '../../src/config/database';
import { cleanDatabase, generateTestEmail, generateTestCpf } from '../setup';

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
      account: `${Date.now()}`,
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

    // Verify user exists in database
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
      .send({ ...input, cpf: generateTestCpf(), bankingDetails: { ...input.bankingDetails, account: `${Date.now()}` } })
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
      .send({ ...input, email: generateTestEmail(), bankingDetails: { ...input.bankingDetails, account: `${Date.now()}` } })
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
    const input = { ...createValidInput(), cpf: '123.456.789-00' };

    await request(app)
      .post('/api/users')
      .send(input)
      .expect(201);

    const pool = getPool();
    const result = await pool.query('SELECT cpf FROM users WHERE email = $1', [input.email]);
    expect(result.rows[0].cpf).toBe('12345678900');
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
      account: `${Date.now()}`,
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
