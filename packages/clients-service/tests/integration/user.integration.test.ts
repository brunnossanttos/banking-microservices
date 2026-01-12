import request from 'supertest';
import { createApp } from '../../src/app';
import { getPool } from '../../src/config/database';
import { cleanDatabase, generateTestEmail, generateTestCpf, generateTestAccount } from '../setup';

const app = createApp();

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

const createUserAndLogin = async (input = createValidInput()) => {
  const createResponse = await request(app).post('/api/users').send(input).expect(201);

  const loginResponse = await request(app)
    .post('/api/auth/login')
    .send({ email: input.email, password: input.password })
    .expect(200);

  return {
    userId: createResponse.body.data.id,
    accessToken: loginResponse.body.data.accessToken,
    input,
  };
};

describe('POST /api/users', () => {
  beforeEach(async () => {
    await cleanDatabase();
  });

  it('should create a user and persist in database', async () => {
    const input = createValidInput();

    const response = await request(app).post('/api/users').send(input).expect(201);

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

    await request(app).post('/api/users').send(input).expect(201);

    const pool = getPool();
    const result = await pool.query('SELECT password_hash FROM users WHERE email = $1', [
      input.email,
    ]);

    expect(result.rows[0].password_hash).not.toBe(input.password);
    expect(result.rows[0].password_hash).toMatch(/^\$2[aby]\$/);
  });

  it('should return 409 when email already exists', async () => {
    const input = createValidInput();

    await request(app).post('/api/users').send(input).expect(201);

    const response = await request(app)
      .post('/api/users')
      .send({
        ...input,
        cpf: generateTestCpf(),
        bankingDetails: { ...input.bankingDetails, account: generateTestAccount() },
      })
      .expect(409);

    expect(response.body).toMatchObject({
      success: false,
      error: 'Email already registered',
    });
  });

  it('should return 409 when CPF already exists', async () => {
    const input = createValidInput();

    await request(app).post('/api/users').send(input).expect(201);

    const response = await request(app)
      .post('/api/users')
      .send({
        ...input,
        email: generateTestEmail(),
        bankingDetails: { ...input.bankingDetails, account: generateTestAccount() },
      })
      .expect(409);

    expect(response.body).toMatchObject({
      success: false,
      error: 'CPF already registered',
    });
  });

  it('should return 409 when banking details already exist', async () => {
    const input = createValidInput();

    await request(app).post('/api/users').send(input).expect(201);

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

    const response = await request(app).post('/api/users').send(input).expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.details).toContainEqual(
      expect.objectContaining({ field: 'body.email' }),
    );
  });

  it('should return 400 for password too short', async () => {
    const input = { ...createValidInput(), password: '123' };

    const response = await request(app).post('/api/users').send(input).expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.details).toContainEqual(
      expect.objectContaining({ field: 'body.password' }),
    );
  });

  it('should return 400 for invalid CPF format', async () => {
    const input = { ...createValidInput(), cpf: '123' };

    const response = await request(app).post('/api/users').send(input).expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.details).toContainEqual(expect.objectContaining({ field: 'body.cpf' }));
  });

  it('should sanitize CPF before storing', async () => {
    const rawCpf = generateTestCpf();
    const formattedCpf = `${rawCpf.slice(0, 3)}.${rawCpf.slice(3, 6)}.${rawCpf.slice(6, 9)}-${rawCpf.slice(9, 11)}`;
    const input = { ...createValidInput(), cpf: formattedCpf };

    await request(app).post('/api/users').send(input).expect(201);

    const pool = getPool();
    const result = await pool.query('SELECT cpf FROM users WHERE email = $1', [input.email]);
    expect(result.rows[0].cpf).toBe(rawCpf);
  });
});

describe('GET /api/users/:userId', () => {
  beforeEach(async () => {
    await cleanDatabase();
  });

  it('should return user data when user exists and authenticated', async () => {
    const { userId, accessToken, input } = await createUserAndLogin();

    const response = await request(app)
      .get(`/api/users/${userId}`)
      .set('Authorization', `Bearer ${accessToken}`)
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

  it('should return 401 without authentication', async () => {
    const { userId } = await createUserAndLogin();

    const response = await request(app).get(`/api/users/${userId}`).expect(401);

    expect(response.body).toMatchObject({
      success: false,
      error: 'Authorization header missing',
    });
  });

  it('should return 403 when accessing other user resources', async () => {
    const { accessToken } = await createUserAndLogin();
    const otherUser = await createUserAndLogin();

    const response = await request(app)
      .get(`/api/users/${otherUser.userId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(403);

    expect(response.body).toMatchObject({
      success: false,
      error: 'Access denied. You can only access your own resources',
    });
  });

  it('should return 400 for invalid UUID format', async () => {
    const { accessToken } = await createUserAndLogin();

    const response = await request(app)
      .get('/api/users/invalid-uuid')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.details).toContainEqual(
      expect.objectContaining({ field: 'params.userId' }),
    );
  });

  it('should not return password in response', async () => {
    const { userId, accessToken } = await createUserAndLogin();

    const response = await request(app)
      .get(`/api/users/${userId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(response.body.data.password).toBeUndefined();
    expect(response.body.data.passwordHash).toBeUndefined();
  });
});

describe('PATCH /api/users/:userId', () => {
  beforeEach(async () => {
    await cleanDatabase();
  });

  it('should update user name successfully', async () => {
    const { userId, accessToken } = await createUserAndLogin();

    const response = await request(app)
      .patch(`/api/users/${userId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Updated Name' })
      .expect(200);

    expect(response.body).toMatchObject({
      success: true,
      message: 'User updated successfully',
    });
    expect(response.body.timestamp).toBeDefined();

    const getResponse = await request(app)
      .get(`/api/users/${userId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(getResponse.body.data.name).toBe('Updated Name');
  });

  it('should update user email successfully', async () => {
    const { userId, accessToken } = await createUserAndLogin();
    const newEmail = generateTestEmail();

    await request(app)
      .patch(`/api/users/${userId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ email: newEmail })
      .expect(200);

    const getResponse = await request(app)
      .get(`/api/users/${userId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(getResponse.body.data.email).toBe(newEmail);
  });

  it('should update banking details successfully', async () => {
    const { userId, accessToken, input } = await createUserAndLogin();

    await request(app)
      .patch(`/api/users/${userId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ bankingDetails: { agency: '0002' } })
      .expect(200);

    const getResponse = await request(app)
      .get(`/api/users/${userId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(getResponse.body.data.bankingDetails.agency).toBe('0002');
    expect(getResponse.body.data.bankingDetails.account).toBe(input.bankingDetails.account);
  });

  it('should return 401 without authentication', async () => {
    const { userId } = await createUserAndLogin();

    const response = await request(app)
      .patch(`/api/users/${userId}`)
      .send({ name: 'New Name' })
      .expect(401);

    expect(response.body.success).toBe(false);
  });

  it('should return 403 when updating other user', async () => {
    const { accessToken } = await createUserAndLogin();
    const otherUser = await createUserAndLogin();

    const response = await request(app)
      .patch(`/api/users/${otherUser.userId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'New Name' })
      .expect(403);

    expect(response.body.success).toBe(false);
  });

  it('should return 409 when email already exists', async () => {
    const user1 = await createUserAndLogin();
    const user2 = await createUserAndLogin();

    const response = await request(app)
      .patch(`/api/users/${user2.userId}`)
      .set('Authorization', `Bearer ${user2.accessToken}`)
      .send({ email: user1.input.email })
      .expect(409);

    expect(response.body).toMatchObject({
      success: false,
      error: 'Email already registered',
    });
  });

  it('should return 409 when banking details already exist', async () => {
    const user1 = await createUserAndLogin();
    const user2 = await createUserAndLogin();

    const response = await request(app)
      .patch(`/api/users/${user2.userId}`)
      .set('Authorization', `Bearer ${user2.accessToken}`)
      .send({
        bankingDetails: {
          agency: user1.input.bankingDetails.agency,
          account: user1.input.bankingDetails.account,
        },
      })
      .expect(409);

    expect(response.body).toMatchObject({
      success: false,
      error: 'Banking details already in use',
    });
  });

  it('should return 400 for invalid UUID format', async () => {
    const { accessToken } = await createUserAndLogin();

    const response = await request(app)
      .patch('/api/users/invalid-uuid')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'New Name' })
      .expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.details).toContainEqual(
      expect.objectContaining({ field: 'params.userId' }),
    );
  });

  it('should return 400 when no fields provided', async () => {
    const { userId, accessToken } = await createUserAndLogin();

    const response = await request(app)
      .patch(`/api/users/${userId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({})
      .expect(400);

    expect(response.body.success).toBe(false);
  });

  it('should return 400 for invalid email format', async () => {
    const { userId, accessToken } = await createUserAndLogin();

    const response = await request(app)
      .patch(`/api/users/${userId}`)
      .set('Authorization', `Bearer ${accessToken}`)
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

  it('should update profile picture successfully', async () => {
    const { userId, accessToken } = await createUserAndLogin();
    const profilePictureUrl = 'https://example.com/photo.jpg';

    const response = await request(app)
      .patch(`/api/users/${userId}/profile-picture`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ profilePictureUrl })
      .expect(200);

    expect(response.body).toMatchObject({
      success: true,
      message: 'Profile picture updated successfully',
    });
    expect(response.body.timestamp).toBeDefined();

    const getResponse = await request(app)
      .get(`/api/users/${userId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(getResponse.body.data.profilePictureUrl).toBe(profilePictureUrl);
  });

  it('should return 401 without authentication', async () => {
    const { userId } = await createUserAndLogin();

    const response = await request(app)
      .patch(`/api/users/${userId}/profile-picture`)
      .send({ profilePictureUrl: 'https://example.com/photo.jpg' })
      .expect(401);

    expect(response.body.success).toBe(false);
  });

  it('should return 400 for invalid UUID format', async () => {
    const { accessToken } = await createUserAndLogin();

    const response = await request(app)
      .patch('/api/users/invalid-uuid/profile-picture')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ profilePictureUrl: 'https://example.com/photo.jpg' })
      .expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.details).toContainEqual(
      expect.objectContaining({ field: 'params.userId' }),
    );
  });

  it('should return 400 for invalid URL format', async () => {
    const { userId, accessToken } = await createUserAndLogin();

    const response = await request(app)
      .patch(`/api/users/${userId}/profile-picture`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ profilePictureUrl: 'not-a-valid-url' })
      .expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.details).toContainEqual(
      expect.objectContaining({ field: 'body.profilePictureUrl' }),
    );
  });

  it('should return 400 when profilePictureUrl is missing', async () => {
    const { userId, accessToken } = await createUserAndLogin();

    const response = await request(app)
      .patch(`/api/users/${userId}/profile-picture`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({})
      .expect(400);

    expect(response.body.success).toBe(false);
  });
});

describe('POST /api/users/:userId/deposit', () => {
  beforeEach(async () => {
    await cleanDatabase();
  });

  it('should deposit amount and update balance', async () => {
    const { userId, accessToken } = await createUserAndLogin();

    const response = await request(app)
      .post(`/api/users/${userId}/deposit`)
      .set('Authorization', `Bearer ${accessToken}`)
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
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(getResponse.body.data.bankingDetails.balance).toBe(1000);
  });

  it('should accumulate multiple deposits', async () => {
    const { userId, accessToken } = await createUserAndLogin();

    await request(app)
      .post(`/api/users/${userId}/deposit`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ amount: 500 })
      .expect(200);

    const response = await request(app)
      .post(`/api/users/${userId}/deposit`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ amount: 300 })
      .expect(200);

    expect(response.body.data.newBalance).toBe(800);
  });

  it('should return 401 without authentication', async () => {
    const { userId } = await createUserAndLogin();

    const response = await request(app)
      .post(`/api/users/${userId}/deposit`)
      .send({ amount: 100 })
      .expect(401);

    expect(response.body.success).toBe(false);
  });

  it('should return 403 when depositing to other user account', async () => {
    const { accessToken } = await createUserAndLogin();
    const otherUser = await createUserAndLogin();

    const response = await request(app)
      .post(`/api/users/${otherUser.userId}/deposit`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ amount: 100 })
      .expect(403);

    expect(response.body.success).toBe(false);
  });

  it('should return 400 for invalid UUID format', async () => {
    const { accessToken } = await createUserAndLogin();

    const response = await request(app)
      .post('/api/users/invalid-uuid/deposit')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ amount: 100 })
      .expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.details).toContainEqual(
      expect.objectContaining({ field: 'params.userId' }),
    );
  });

  it('should return 400 for zero amount', async () => {
    const { userId, accessToken } = await createUserAndLogin();

    const response = await request(app)
      .post(`/api/users/${userId}/deposit`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ amount: 0 })
      .expect(400);

    expect(response.body.success).toBe(false);
  });

  it('should return 400 for negative amount', async () => {
    const { userId, accessToken } = await createUserAndLogin();

    const response = await request(app)
      .post(`/api/users/${userId}/deposit`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ amount: -100 })
      .expect(400);

    expect(response.body.success).toBe(false);
  });

  it('should return 400 when amount is missing', async () => {
    const { userId, accessToken } = await createUserAndLogin();

    const response = await request(app)
      .post(`/api/users/${userId}/deposit`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({})
      .expect(400);

    expect(response.body.success).toBe(false);
  });
});

describe('POST /api/users/:userId/withdraw', () => {
  beforeEach(async () => {
    await cleanDatabase();
  });

  it('should withdraw amount and update balance', async () => {
    const { userId, accessToken } = await createUserAndLogin();

    await request(app)
      .post(`/api/users/${userId}/deposit`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ amount: 1000 })
      .expect(200);

    const response = await request(app)
      .post(`/api/users/${userId}/withdraw`)
      .set('Authorization', `Bearer ${accessToken}`)
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
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(getResponse.body.data.bankingDetails.balance).toBe(600);
  });

  it('should return 400 for insufficient balance', async () => {
    const { userId, accessToken } = await createUserAndLogin();

    await request(app)
      .post(`/api/users/${userId}/deposit`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ amount: 100 })
      .expect(200);

    const response = await request(app)
      .post(`/api/users/${userId}/withdraw`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ amount: 500 })
      .expect(400);

    expect(response.body).toMatchObject({
      success: false,
      error: 'Insufficient balance',
    });
  });

  it('should return 401 without authentication', async () => {
    const { userId } = await createUserAndLogin();

    const response = await request(app)
      .post(`/api/users/${userId}/withdraw`)
      .send({ amount: 100 })
      .expect(401);

    expect(response.body.success).toBe(false);
  });

  it('should return 400 for invalid UUID format', async () => {
    const { accessToken } = await createUserAndLogin();

    const response = await request(app)
      .post('/api/users/invalid-uuid/withdraw')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ amount: 100 })
      .expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.details).toContainEqual(
      expect.objectContaining({ field: 'params.userId' }),
    );
  });

  it('should return 400 for zero amount', async () => {
    const { userId, accessToken } = await createUserAndLogin();

    const response = await request(app)
      .post(`/api/users/${userId}/withdraw`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ amount: 0 })
      .expect(400);

    expect(response.body.success).toBe(false);
  });

  it('should return 400 for negative amount', async () => {
    const { userId, accessToken } = await createUserAndLogin();

    const response = await request(app)
      .post(`/api/users/${userId}/withdraw`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ amount: -100 })
      .expect(400);

    expect(response.body.success).toBe(false);
  });

  it('should return 400 when amount is missing', async () => {
    const { userId, accessToken } = await createUserAndLogin();

    const response = await request(app)
      .post(`/api/users/${userId}/withdraw`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({})
      .expect(400);

    expect(response.body.success).toBe(false);
  });

  it('should allow withdrawal of entire balance', async () => {
    const { userId, accessToken } = await createUserAndLogin();

    await request(app)
      .post(`/api/users/${userId}/deposit`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ amount: 500 })
      .expect(200);

    const response = await request(app)
      .post(`/api/users/${userId}/withdraw`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ amount: 500 })
      .expect(200);

    expect(response.body.data.newBalance).toBe(0);
  });
});
