export {
  ApiResponse,
  PaginatedResponse,
  HealthData,
  JwtPayload,
  PaginationParams,
} from '@banking/shared';

export type TransactionStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'reversed'
  | 'cancelled';
export type TransactionType = 'transfer' | 'deposit' | 'withdrawal' | 'payment' | 'refund';

export interface Transaction {
  id: string;
  senderUserId: string;
  receiverUserId: string;
  amount: number;
  fee: number;
  description?: string;
  type: TransactionType;
  status: TransactionStatus;
  idempotencyKey?: string;
  referenceId?: string;
  metadata?: Record<string, unknown>;
  errorMessage?: string;
  errorCode?: string;
  retryCount: number;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  reversedAt?: Date;
}

export interface TransactionRow {
  id: string;
  sender_user_id: string;
  receiver_user_id: string;
  amount: string;
  fee: string;
  description: string | null;
  type: TransactionType;
  status: TransactionStatus;
  idempotency_key: string | null;
  reference_id: string | null;
  metadata: Record<string, unknown> | null;
  error_message: string | null;
  error_code: string | null;
  retry_count: number;
  created_at: Date;
  updated_at: Date;
  completed_at: Date | null;
  reversed_at: Date | null;
}

export interface CreateTransactionData {
  senderUserId: string;
  receiverUserId: string;
  amount: number;
  description?: string;
  type?: TransactionType;
  idempotencyKey?: string;
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

export interface PaginatedTransactions {
  data: Transaction[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
