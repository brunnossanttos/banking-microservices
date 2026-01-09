export {
  ApiResponse,
  PaginatedResponse,
  HealthData,
  JwtPayload,
  PaginationParams,
} from '@banking/shared';

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

export interface CreateUserDto {
  email: string;
  password: string;
  name: string;
  cpf: string;
  address?: Address;
  bankingDetails: BankingDetails;
}

export interface UpdateUserDto {
  name?: string;
  email?: string;
  address?: Address;
  bankingDetails?: Partial<BankingDetails>;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: Omit<User, 'password'>;
  accessToken: string;
  refreshToken?: string;
}
