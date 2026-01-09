export {
  ApiResponse,
  PaginatedResponse,
  HealthData,
  JwtPayload,
  PaginationParams,
} from '@banking/shared';

export type TransactionStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'reversed';
export type TransactionType = 'transfer' | 'deposit' | 'withdrawal';

export interface Transaction {
  id: string;
  senderUserId: string;
  receiverUserId: string;
  amount: number;
  description?: string;
  type: TransactionType;
  status: TransactionStatus;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  failureReason?: string;
}

export interface CreateTransactionDto {
  senderUserId: string;
  receiverUserId: string;
  amount: number;
  description?: string;
}

export interface TransactionFilters {
  userId?: string;
  status?: TransactionStatus;
  type?: TransactionType;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
}

export interface UserBankingInfo {
  id: string;
  name: string;
  email: string;
  bankingDetails: {
    agency: string;
    account: string;
    accountType: string;
    balance: number;
  };
}

export interface TransactionEvent {
  transactionId: string;
  senderUserId: string;
  receiverUserId: string;
  amount: number;
  status: TransactionStatus;
  timestamp: string;
}
