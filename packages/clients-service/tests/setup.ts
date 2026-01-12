import { connectDatabase, disconnectDatabase, getPool } from '../src/config/database';

beforeAll(async () => {
  await connectDatabase();
});

afterAll(async () => {
  await disconnectDatabase();
});

export async function cleanDatabase(): Promise<void> {
  const pool = getPool();
  await pool.query('DELETE FROM refresh_tokens');
  await pool.query('DELETE FROM users WHERE email LIKE $1', ['%@test.com']);
}

export function generateTestEmail(): string {
  return `test-${Date.now()}-${Math.random().toString(36).substring(7)}@test.com`;
}

export function generateTestCpf(): string {
  const random = () => Math.floor(Math.random() * 10);
  return `${random()}${random()}${random()}${random()}${random()}${random()}${random()}${random()}${random()}${random()}${random()}`;
}

let accountCounter = 0;
export function generateTestAccount(): string {
  accountCounter++;
  return `ACC-${accountCounter}-${Math.random().toString(36).substring(2, 10)}`;
}
