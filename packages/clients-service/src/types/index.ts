export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  timestamp: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface User {
  id: string;
  email: string;
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

export interface HealthData {
  status: string;
  uptime: number;
  timestamp: string;
}
