import { getPool } from '../config/database';
import { RefreshToken, RefreshTokenRow } from '../types';

function mapRowToRefreshToken(row: RefreshTokenRow): RefreshToken {
  return {
    id: row.id,
    userId: row.user_id,
    token: row.token,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
    revokedAt: row.revoked_at,
  };
}

export async function createRefreshToken(
  userId: string,
  token: string,
  expiresAt: Date,
): Promise<RefreshToken> {
  const pool = getPool();

  const query = `
    INSERT INTO refresh_tokens (user_id, token, expires_at)
    VALUES ($1, $2, $3)
    RETURNING *
  `;

  const result = await pool.query<RefreshTokenRow>(query, [userId, token, expiresAt]);
  return mapRowToRefreshToken(result.rows[0]);
}

export async function findRefreshToken(token: string): Promise<RefreshToken | null> {
  const pool = getPool();

  const query = `
    SELECT * FROM refresh_tokens
    WHERE token = $1 AND revoked_at IS NULL AND expires_at > NOW()
  `;

  const result = await pool.query<RefreshTokenRow>(query, [token]);

  if (result.rows.length === 0) {
    return null;
  }

  return mapRowToRefreshToken(result.rows[0]);
}

export async function revokeRefreshToken(token: string): Promise<boolean> {
  const pool = getPool();

  const query = `
    UPDATE refresh_tokens
    SET revoked_at = NOW()
    WHERE token = $1 AND revoked_at IS NULL
  `;

  const result = await pool.query(query, [token]);
  return result.rowCount !== null && result.rowCount > 0;
}

export async function revokeAllUserRefreshTokens(userId: string): Promise<number> {
  const pool = getPool();

  const query = `
    UPDATE refresh_tokens
    SET revoked_at = NOW()
    WHERE user_id = $1 AND revoked_at IS NULL
  `;

  const result = await pool.query(query, [userId]);
  return result.rowCount ?? 0;
}

export async function deleteExpiredTokens(): Promise<number> {
  const pool = getPool();

  const query = `
    DELETE FROM refresh_tokens
    WHERE expires_at < NOW() OR revoked_at IS NOT NULL
  `;

  const result = await pool.query(query);
  return result.rowCount ?? 0;
}
