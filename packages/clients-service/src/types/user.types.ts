export interface User {
  id: string;
  email: string;
  password?: string;
  name: string;
  cpf: string;
  address?: Address;
  bankingDetails: BankingDetails;
  profilePictureUrl?: string;
  status: UserStatus;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Address {
  street?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  zipCode?: string;
}

export interface BankingDetails {
  agency: string;
  account: string;
  accountType: AccountType;
  balance: number;
}

export type AccountType = 'checking' | 'savings';
export type UserStatus = 'active' | 'inactive' | 'blocked' | 'pending_verification';

export interface CreateUserData {
  email: string;
  passwordHash: string;
  name: string;
  cpf: string;
  address?: Address;
  bankingDetails: Omit<BankingDetails, 'balance'>;
}

export interface UpdateUserData {
  name?: string;
  email?: string;
  bankingDetails?: Partial<Omit<BankingDetails, 'balance'>>;
}

export interface UserRow {
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
