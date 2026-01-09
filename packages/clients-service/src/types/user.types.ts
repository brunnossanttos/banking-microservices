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
