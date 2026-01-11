import { connectDatabase, closeDatabase, getPool } from '../src/config/database';
import { v4 as uuidv4 } from 'uuid';

beforeAll(async () => {
  await connectDatabase();
});

afterAll(async () => {
  await closeDatabase();
});

export async function cleanDatabase(): Promise<void> {
  const pool = getPool();
  await pool.query('DELETE FROM transaction_events');
  await pool.query('DELETE FROM transactions');
}

export function generateTestUUID(): string {
  return uuidv4();
}
