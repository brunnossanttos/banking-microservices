import { AppError } from '@banking/shared';
import { Transaction, TransactionFilters, PaginatedTransactions, UserBankingInfo } from '../types';
import { CreateTransactionInput } from '../schemas/transactionSchema';
import * as transactionRepository from '../repositories/transactionRepository';
import * as eventService from './eventService';
import { env } from '../config/env';
import axios from 'axios';
import { logger } from '../utils/logger';

async function getUserBankingInfo(userId: string): Promise<UserBankingInfo | null> {
  try {
    const response = await axios.get<{ success: boolean; data: UserBankingInfo }>(
      `${env.clientsService.url}/api/users/${userId}`,
    );

    if (response.data.success) {
      return response.data.data;
    }
    return null;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      return null;
    }
    logger.error('Error fetching user banking info', { userId, error });
    throw AppError.internal('Error communicating with clients service');
  }
}

export async function createTransaction(input: CreateTransactionInput): Promise<Transaction> {
  if (input.senderUserId === input.receiverUserId) {
    throw AppError.badRequest('Cannot transfer to yourself');
  }

  const [senderInfo, receiverInfo] = await Promise.all([
    getUserBankingInfo(input.senderUserId),
    getUserBankingInfo(input.receiverUserId),
  ]);

  if (!senderInfo) {
    throw AppError.notFound('Sender user not found');
  }

  if (!receiverInfo) {
    throw AppError.notFound('Receiver user not found');
  }

  if (senderInfo.bankingDetails.balance < input.amount) {
    throw AppError.badRequest('Insufficient balance');
  }

  const transaction = await transactionRepository.createTransaction({
    senderUserId: input.senderUserId,
    receiverUserId: input.receiverUserId,
    amount: input.amount,
    description: input.description,
    type: 'transfer',
  });

  eventService.publishTransactionCreated(transaction);

  await transactionRepository.updateStatus(transaction.id, 'completed');

  const completedTransaction: Transaction = {
    ...transaction,
    status: 'completed',
  };

  eventService.publishTransactionCompleted(completedTransaction);

  return completedTransaction;
}

export async function getTransactionById(id: string): Promise<Transaction> {
  const transaction = await transactionRepository.findById(id);

  if (!transaction) {
    throw AppError.notFound('Transaction not found');
  }

  return transaction;
}

export async function getUserTransactions(
  userId: string,
  filters: TransactionFilters,
): Promise<PaginatedTransactions> {
  const userInfo = await getUserBankingInfo(userId);

  if (!userInfo) {
    throw AppError.notFound('User not found');
  }

  const { transactions, total } = await transactionRepository.findByUserId(userId, filters);

  const page = filters.page ?? 1;
  const limit = filters.limit ?? 10;
  const totalPages = Math.ceil(total / limit);

  return {
    data: transactions,
    pagination: {
      page,
      limit,
      total,
      totalPages,
    },
  };
}
