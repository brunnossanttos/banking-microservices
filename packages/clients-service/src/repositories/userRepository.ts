import { getPool } from '../config/database';
import { User, Address, BankingDetails } from '../types';

export interface CreateUserData {
  email: string;
  passwordHash: string;
  name: string;
  cpf: string;
  address?: Address;
  bankingDetails: Omit<BankingDetails, 'balance'>;
}

interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  name: string;
  cpf: string;
  address_street: string | null;
  address_number: string | null;
  address_complement: string | null;
  address_neighborhood: string | null;
  address_city: string | null;
  address_state: string | null;
  address_zip_code: string | null;
  banking_agency: string;
  banking_account: string;
  banking_account_type: 'checking' | 'savings';
  balance: string;
  profile_picture_url: string | null;
  status: 'active' | 'inactive' | 'blocked' | 'pending_verification';
  email_verified: boolean;
  created_at: Date;
  updated_at: Date;
}

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
