import request from 'supertest';
import { createApp } from '../../src/app';
import { cleanDatabase, generateTestEmail, generateTestCpf, generateTestAccount } from '../setup';

const app = createApp();

describe('POST /api/auth/login', () => {
  const createTestUser = async () => {
    const email = generateTestEmail();
    const password = 'password123';

    await request(app)
      .post('/api/users')
      .send({
        email,
        password,
        name: 'Test User',
        cpf: generateTestCpf(),
        bankingDetails: {
          agency: '0001',
          account: generateTestAccount(),
          accountType: 'checking',
        },
      })
      .expect(201);

    return { email, password };
  };

  beforeEach(async () => {
    await cleanDatabase();
  });

  it('should login successfully and return tokens', async () => {
    const { email, password } = await createTestUser();

    const response = await request(app)
      .post('/api/auth/login')
      .send({ email, password })
      .expect(200);

    expect(response.body).toMatchObject({
      success: true,
      message: 'Login successful',
    });
    expect(response.body.data).toHaveProperty('accessToken');
    expect(response.body.data).toHaveProperty('refreshToken');
    expect(response.body.data).toHaveProperty('expiresIn');
    expect(response.body.timestamp).toBeDefined();
  });

  it('should return 401 for invalid email', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'nonexistent@test.com',
        password: 'password123',
      })
      .expect(401);

    expect(response.body).toMatchObject({
      success: false,
      error: 'Invalid credentials',
    });
  });

  it('should return 401 for invalid password', async () => {
    const { email } = await createTestUser();

    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email,
        password: 'wrongpassword',
      })
      .expect(401);

    expect(response.body).toMatchObject({
      success: false,
      error: 'Invalid credentials',
    });
  });

  it('should return 400 for missing email', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ password: 'password123' })
      .expect(400);

    expect(response.body.success).toBe(false);
  });

  it('should return 400 for missing password', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@test.com' })
      .expect(400);

    expect(response.body.success).toBe(false);
  });

  it('should return 400 for invalid email format', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'invalid-email',
        password: 'password123',
      })
      .expect(400);

    expect(response.body.success).toBe(false);
  });
});

describe('POST /api/auth/refresh', () => {
  const createTestUserAndLogin = async () => {
    const email = generateTestEmail();
    const password = 'password123';

    await request(app)
      .post('/api/users')
      .send({
        email,
        password,
        name: 'Test User',
        cpf: generateTestCpf(),
        bankingDetails: {
          agency: '0001',
          account: generateTestAccount(),
          accountType: 'checking',
        },
      })
      .expect(201);

    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({ email, password })
      .expect(200);

    return loginResponse.body.data;
  };

  beforeEach(async () => {
    await cleanDatabase();
  });

  it('should refresh tokens successfully', async () => {
    const { refreshToken } = await createTestUserAndLogin();

    const response = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken })
      .expect(200);

    expect(response.body).toMatchObject({
      success: true,
      message: 'Tokens refreshed successfully',
    });
    expect(response.body.data).toHaveProperty('accessToken');
    expect(response.body.data).toHaveProperty('refreshToken');
    expect(response.body.data.refreshToken).not.toBe(refreshToken);
  });

  it('should return 401 for invalid refresh token', async () => {
    const response = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: 'invalid-token' })
      .expect(401);

    expect(response.body).toMatchObject({
      success: false,
      error: 'Invalid or expired refresh token',
    });
  });

  it('should return 401 when using same refresh token twice', async () => {
    const { refreshToken } = await createTestUserAndLogin();

    await request(app).post('/api/auth/refresh').send({ refreshToken }).expect(200);

    const response = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken })
      .expect(401);

    expect(response.body).toMatchObject({
      success: false,
      error: 'Invalid or expired refresh token',
    });
  });

  it('should return 400 for missing refresh token', async () => {
    const response = await request(app).post('/api/auth/refresh').send({}).expect(400);

    expect(response.body.success).toBe(false);
  });
});

describe('POST /api/auth/logout', () => {
  const createTestUserAndLogin = async () => {
    const email = generateTestEmail();
    const password = 'password123';

    await request(app)
      .post('/api/users')
      .send({
        email,
        password,
        name: 'Test User',
        cpf: generateTestCpf(),
        bankingDetails: {
          agency: '0001',
          account: generateTestAccount(),
          accountType: 'checking',
        },
      })
      .expect(201);

    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({ email, password })
      .expect(200);

    return loginResponse.body.data;
  };

  beforeEach(async () => {
    await cleanDatabase();
  });

  it('should logout successfully', async () => {
    const { refreshToken } = await createTestUserAndLogin();

    const response = await request(app)
      .post('/api/auth/logout')
      .send({ refreshToken })
      .expect(200);

    expect(response.body).toMatchObject({
      success: true,
      message: 'Logged out successfully',
    });
  });

  it('should invalidate refresh token after logout', async () => {
    const { refreshToken } = await createTestUserAndLogin();

    await request(app).post('/api/auth/logout').send({ refreshToken }).expect(200);

    const response = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken })
      .expect(401);

    expect(response.body).toMatchObject({
      success: false,
      error: 'Invalid or expired refresh token',
    });
  });

  it('should return 200 even for invalid refresh token', async () => {
    const response = await request(app)
      .post('/api/auth/logout')
      .send({ refreshToken: 'invalid-token' })
      .expect(200);

    expect(response.body.success).toBe(true);
  });
});

describe('GET /api/auth/me', () => {
  const createTestUserAndLogin = async () => {
    const email = generateTestEmail();
    const password = 'password123';

    const createResponse = await request(app)
      .post('/api/users')
      .send({
        email,
        password,
        name: 'Test User',
        cpf: generateTestCpf(),
        bankingDetails: {
          agency: '0001',
          account: generateTestAccount(),
          accountType: 'checking',
        },
      })
      .expect(201);

    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({ email, password })
      .expect(200);

    return {
      userId: createResponse.body.data.id,
      accessToken: loginResponse.body.data.accessToken,
    };
  };

  beforeEach(async () => {
    await cleanDatabase();
  });

  it('should return current user data', async () => {
    const { userId, accessToken } = await createTestUserAndLogin();

    const response = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(response.body).toMatchObject({
      success: true,
    });
    expect(response.body.data.id).toBe(userId);
    expect(response.body.data).not.toHaveProperty('password');
  });

  it('should return 401 without authentication', async () => {
    const response = await request(app).get('/api/auth/me').expect(401);

    expect(response.body).toMatchObject({
      success: false,
      error: 'Authorization header missing',
    });
  });

  it('should return 401 with invalid token', async () => {
    const response = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer invalid-token')
      .expect(401);

    expect(response.body).toMatchObject({
      success: false,
      error: 'Invalid token',
    });
  });
});

describe('Protected user routes', () => {
  const createTestUserAndLogin = async () => {
    const email = generateTestEmail();
    const password = 'password123';

    const createResponse = await request(app)
      .post('/api/users')
      .send({
        email,
        password,
        name: 'Test User',
        cpf: generateTestCpf(),
        bankingDetails: {
          agency: '0001',
          account: generateTestAccount(),
          accountType: 'checking',
        },
      })
      .expect(201);

    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({ email, password })
      .expect(200);

    return {
      userId: createResponse.body.data.id,
      accessToken: loginResponse.body.data.accessToken,
    };
  };

  beforeEach(async () => {
    await cleanDatabase();
  });

  it('should return 401 when accessing GET /users/:userId without auth', async () => {
    const { userId } = await createTestUserAndLogin();

    const response = await request(app).get(`/api/users/${userId}`).expect(401);

    expect(response.body).toMatchObject({
      success: false,
      error: 'Authorization header missing',
    });
  });

  it('should return user data when authenticated', async () => {
    const { userId, accessToken } = await createTestUserAndLogin();

    const response = await request(app)
      .get(`/api/users/${userId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.id).toBe(userId);
  });

  it('should return 403 when accessing other user resources', async () => {
    const { accessToken } = await createTestUserAndLogin();
    const otherUserId = '00000000-0000-0000-0000-000000000001';

    const response = await request(app)
      .get(`/api/users/${otherUserId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(403);

    expect(response.body).toMatchObject({
      success: false,
      error: 'Access denied. You can only access your own resources',
    });
  });

  it('should allow deposit when authenticated as owner', async () => {
    const { userId, accessToken } = await createTestUserAndLogin();

    const response = await request(app)
      .post(`/api/users/${userId}/deposit`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ amount: 100 })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.newBalance).toBe(100);
  });

  it('should return 401 when depositing without auth', async () => {
    const { userId } = await createTestUserAndLogin();

    const response = await request(app)
      .post(`/api/users/${userId}/deposit`)
      .send({ amount: 100 })
      .expect(401);

    expect(response.body.success).toBe(false);
  });
});
