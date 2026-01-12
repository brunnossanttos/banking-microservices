import { getPool } from '../config/database';
import {
  Transaction,
  TransactionRow,
  TransactionStatus,
  CreateTransactionData,
  TransactionFilters,
} from '../types';

function mapRowToTransaction(row: TransactionRow): Transaction {
  return {
    id: row.id,
    senderUserId: row.sender_user_id,
    receiverUserId: row.receiver_user_id,
    amount: parseFloat(row.amount),
    fee: parseFloat(row.fee),
    description: row.description ?? undefined,
    type: row.type,
    status: row.status,
    idempotencyKey: row.idempotency_key ?? undefined,
    referenceId: row.reference_id ?? undefined,
    metadata: row.metadata ?? undefined,
    errorMessage: row.error_message ?? undefined,
    errorCode: row.error_code ?? undefined,
    retryCount: row.retry_count,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    completedAt: row.completed_at ?? undefined,
    reversedAt: row.reversed_at ?? undefined,
  };
}

export async function createTransaction(data: CreateTransactionData): Promise<Transaction> {
  const pool = getPool();

  const query = `
    INSERT INTO transactions (
      sender_user_id, receiver_user_id, amount, description, type, idempotency_key
    ) VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *
  `;

  const values = [
    data.senderUserId,
    data.receiverUserId,
    data.amount,
    data.description ?? null,
    data.type ?? 'transfer',
    data.idempotencyKey ?? null,
  ];

  const result = await pool.query<TransactionRow>(query, values);
  return mapRowToTransaction(result.rows[0]);
}

export async function findById(id: string): Promise<Transaction | null> {
  const pool = getPool();

  const query = `SELECT * FROM transactions WHERE id = $1`;
  const result = await pool.query<TransactionRow>(query, [id]);

  if (result.rows.length === 0) {
    return null;
  }

  return mapRowToTransaction(result.rows[0]);
}

export async function findByIdempotencyKey(key: string): Promise<Transaction | null> {
  const pool = getPool();

  const query = `SELECT * FROM transactions WHERE idempotency_key = $1`;
  const result = await pool.query<TransactionRow>(query, [key]);

  if (result.rows.length === 0) {
    return null;
  }

  return mapRowToTransaction(result.rows[0]);
}

export async function findByUserId(
  userId: string,
  filters: TransactionFilters,
): Promise<{ transactions: Transaction[]; total: number }> {
  const pool = getPool();

  const page = filters.page ?? 1;
  const limit = filters.limit ?? 10;
  const offset = (page - 1) * limit;

  const conditions: string[] = ['(sender_user_id = $1 OR receiver_user_id = $1)'];
  const values: unknown[] = [userId];
  let paramIndex = 2;

  if (filters.status) {
    conditions.push(`status = $${paramIndex++}`);
    values.push(filters.status);
  }

  if (filters.type) {
    conditions.push(`type = $${paramIndex++}`);
    values.push(filters.type);
  }

  if (filters.startDate) {
    conditions.push(`created_at >= $${paramIndex++}`);
    values.push(filters.startDate);
  }

  if (filters.endDate) {
    conditions.push(`created_at <= $${paramIndex++}`);
    values.push(filters.endDate);
  }

  const whereClause = conditions.join(' AND ');

  const countQuery = `SELECT COUNT(*) FROM transactions WHERE ${whereClause}`;
  const countResult = await pool.query<{ count: string }>(countQuery, values);
  const total = parseInt(countResult.rows[0].count, 10);

  const query = `
    SELECT * FROM transactions
    WHERE ${whereClause}
    ORDER BY created_at DESC
    LIMIT $${paramIndex++} OFFSET $${paramIndex}
  `;
  values.push(limit, offset);

  const result = await pool.query<TransactionRow>(query, values);
  const transactions = result.rows.map(mapRowToTransaction);

  return { transactions, total };
}

export async function updateStatus(
  id: string,
  status: TransactionStatus,
  errorMessage?: string,
  errorCode?: string,
): Promise<boolean> {
  const pool = getPool();

  let query: string;
  let values: unknown[];

  if (status === 'completed') {
    query = `
      UPDATE transactions
      SET status = $1, completed_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `;
    values = [status, id];
  } else if (status === 'failed') {
    query = `
      UPDATE transactions
      SET status = $1, error_message = $2, error_code = $3
      WHERE id = $4
    `;
    values = [status, errorMessage ?? null, errorCode ?? null, id];
  } else if (status === 'reversed') {
    query = `
      UPDATE transactions
      SET status = $1, reversed_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `;
    values = [status, id];
  } else {
    query = `
      UPDATE transactions
      SET status = $1
      WHERE id = $2
    `;
    values = [status, id];
  }

  const result = await pool.query(query, values);
  return result.rowCount !== null && result.rowCount > 0;
}

export async function incrementRetryCount(id: string): Promise<boolean> {
  const pool = getPool();

  const query = `
    UPDATE transactions
    SET retry_count = retry_count + 1
    WHERE id = $1
  `;

  const result = await pool.query(query, [id]);
  return result.rowCount !== null && result.rowCount > 0;
}
