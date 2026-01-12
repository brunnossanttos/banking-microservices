import { getPool } from '../config/database';
import { CreateUserData, UpdateUserData, User, UserRow, UserWithPassword } from '../types';

function mapRowToUser(row: UserRow): Omit<User, 'password'> {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    cpf: row.cpf,
    address: {
      street: row.address_street ?? undefined,
      number: row.address_number ?? undefined,
      complement: row.address_complement ?? undefined,
      neighborhood: row.address_neighborhood ?? undefined,
      city: row.address_city ?? undefined,
      state: row.address_state ?? undefined,
      zipCode: row.address_zip_code ?? undefined,
    },
    bankingDetails: {
      agency: row.banking_agency,
      account: row.banking_account,
      accountType: row.banking_account_type,
      balance: parseFloat(row.balance),
    },
    profilePictureUrl: row.profile_picture_url ?? undefined,
    status: row.status,
    emailVerified: row.email_verified,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function createUser(data: CreateUserData): Promise<Omit<User, 'password'>> {
  const pool = getPool();

  const query = `
    INSERT INTO users (
      email, password_hash, name, cpf,
      address_street, address_number, address_complement,
      address_neighborhood, address_city, address_state, address_zip_code,
      banking_agency, banking_account, banking_account_type
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
    RETURNING *
  `;

  const values = [
    data.email,
    data.passwordHash,
    data.name,
    data.cpf,
    data.address?.street ?? null,
    data.address?.number ?? null,
    data.address?.complement ?? null,
    data.address?.neighborhood ?? null,
    data.address?.city ?? null,
    data.address?.state ?? null,
    data.address?.zipCode?.replace(/\D/g, '') ?? null,
    data.bankingDetails.agency,
    data.bankingDetails.account,
    data.bankingDetails.accountType,
  ];

  const result = await pool.query<UserRow>(query, values);
  return mapRowToUser(result.rows[0]);
}

export async function findByEmail(email: string): Promise<Omit<User, 'password'> | null> {
  const pool = getPool();

  const query = `
    SELECT * FROM users
    WHERE email = $1 AND deleted_at IS NULL
  `;

  const result = await pool.query<UserRow>(query, [email]);

  if (result.rows.length === 0) {
    return null;
  }

  return mapRowToUser(result.rows[0]);
}

export async function findByEmailWithPassword(email: string): Promise<UserWithPassword | null> {
  const pool = getPool();

  const query = `
    SELECT id, email, password_hash, name, status
    FROM users
    WHERE email = $1 AND deleted_at IS NULL
  `;

  const result = await pool.query<{
    id: string;
    email: string;
    password_hash: string;
    name: string;
    status: 'active' | 'inactive' | 'blocked' | 'pending_verification';
  }>(query, [email]);

  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0];
  return {
    id: row.id,
    email: row.email,
    passwordHash: row.password_hash,
    name: row.name,
    status: row.status,
  };
}

export async function findByCpf(cpf: string): Promise<Omit<User, 'password'> | null> {
  const pool = getPool();

  const query = `
    SELECT * FROM users
    WHERE cpf = $1 AND deleted_at IS NULL
  `;

  const result = await pool.query<UserRow>(query, [cpf]);

  if (result.rows.length === 0) {
    return null;
  }

  return mapRowToUser(result.rows[0]);
}

export async function findByBankingDetails(
  agency: string,
  account: string,
): Promise<Omit<User, 'password'> | null> {
  const pool = getPool();

  const query = `
    SELECT * FROM users
    WHERE banking_agency = $1 AND banking_account = $2 AND deleted_at IS NULL
  `;

  const result = await pool.query<UserRow>(query, [agency, account]);

  if (result.rows.length === 0) {
    return null;
  }

  return mapRowToUser(result.rows[0]);
}

export async function findById(id: string): Promise<Omit<User, 'password'> | null> {
  const pool = getPool();

  const query = `
    SELECT * FROM users
    WHERE id = $1 AND deleted_at IS NULL
  `;

  const result = await pool.query<UserRow>(query, [id]);

  if (result.rows.length === 0) {
    return null;
  }

  return mapRowToUser(result.rows[0]);
}

export async function updateUser(id: string, data: UpdateUserData): Promise<boolean> {
  const pool = getPool();

  const updates: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  if (data.name !== undefined) {
    updates.push(`name = $${paramIndex++}`);
    values.push(data.name);
  }

  if (data.email !== undefined) {
    updates.push(`email = $${paramIndex++}`);
    values.push(data.email);
  }

  if (data.bankingDetails?.agency !== undefined) {
    updates.push(`banking_agency = $${paramIndex++}`);
    values.push(data.bankingDetails.agency);
  }

  if (data.bankingDetails?.account !== undefined) {
    updates.push(`banking_account = $${paramIndex++}`);
    values.push(data.bankingDetails.account);
  }

  if (data.bankingDetails?.accountType !== undefined) {
    updates.push(`banking_account_type = $${paramIndex++}`);
    values.push(data.bankingDetails.accountType);
  }

  if (updates.length === 0) {
    return false;
  }

  values.push(id);

  const query = `
    UPDATE users
    SET ${updates.join(', ')}
    WHERE id = $${paramIndex} AND deleted_at IS NULL
  `;

  const result = await pool.query(query, values);
  return result.rowCount !== null && result.rowCount > 0;
}

export async function updateProfilePicture(
  id: string,
  profilePictureUrl: string,
): Promise<boolean> {
  const pool = getPool();

  const query = `
    UPDATE users
    SET profile_picture_url = $1
    WHERE id = $2 AND deleted_at IS NULL
  `;

  const result = await pool.query(query, [profilePictureUrl, id]);
  return result.rowCount !== null && result.rowCount > 0;
}

export async function updateBalance(
  id: string,
  amount: number,
  operation: 'credit' | 'debit',
): Promise<Omit<User, 'password'> | null> {
  const pool = getPool();

  const operator = operation === 'credit' ? '+' : '-';

  const query = `
    UPDATE users
    SET balance = balance ${operator} $1, updated_at = NOW()
    WHERE id = $2 AND deleted_at IS NULL
    ${operation === 'debit' ? 'AND balance >= $1' : ''}
    RETURNING *
  `;

  const result = await pool.query<UserRow>(query, [amount, id]);

  if (result.rows.length === 0) {
    return null;
  }

  return mapRowToUser(result.rows[0]);
}
