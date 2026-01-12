import { AppError } from '@banking/shared';
import axios from 'axios';
import {
  Transaction,
  TransactionFilters,
  PaginatedTransactions,
  UserBankingInfo,
  TransferSagaContext,
  CompensationResult,
} from '../types';
import { CreateTransactionInput } from '../schemas/transactionSchema';
import * as transactionRepository from '../repositories/transactionRepository';
import * as eventService from './eventService';
import { createTransferSaga } from './transferSaga';
import { env } from '../config/env';
import { logger } from '../utils/logger';

const internalApiHeaders = {
  'x-internal-api-key': env.clientsService.internalApiKey,
};

async function getUserBankingInfo(userId: string): Promise<UserBankingInfo | null> {
  try {
    const response = await axios.get<{ success: boolean; data: UserBankingInfo }>(
      `${env.clientsService.url}/api/internal/users/${userId}`,
      { headers: internalApiHeaders },
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

function hasCompensationFailures(results?: CompensationResult[]): boolean {
  return results?.some(r => !r.success) ?? false;
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

  await transactionRepository.updateStatus(transaction.id, 'processing');

  const sagaContext: TransferSagaContext = {
    transactionId: transaction.id,
    senderUserId: input.senderUserId,
    receiverUserId: input.receiverUserId,
    amount: input.amount,
    withdrawCompleted: false,
    depositCompleted: false,
  };

  const saga = createTransferSaga();
  const result = await saga.execute(sagaContext);

  if (result.success) {
    await transactionRepository.updateStatus(transaction.id, 'completed');

    const completedTransaction: Transaction = {
      ...transaction,
      status: 'completed',
    };

    eventService.publishTransactionCompleted(completedTransaction);

    logger.info('Transaction completed successfully', {
      transactionId: transaction.id,
      steps: result.completedSteps,
    });

    return completedTransaction;
  }

  const hasCompletedSteps = result.completedSteps.length > 0;
  const compensationFailed = hasCompensationFailures(result.compensationResults);
  const errorMessage = result.error?.message ?? 'Transfer failed';

  let finalStatus: 'failed' | 'reversed';
  let errorCode: string;

  if (!hasCompletedSteps) {
    finalStatus = 'failed';
    errorCode = 'TRANSFER_FAILED';
  } else if (compensationFailed) {
    finalStatus = 'failed';
    errorCode = 'COMPENSATION_FAILED';
  } else {
    finalStatus = 'reversed';
    errorCode = 'TRANSFER_FAILED';
  }

  await transactionRepository.updateStatus(transaction.id, finalStatus, errorMessage, errorCode);

  const failedTransaction: Transaction = {
    ...transaction,
    status: finalStatus,
    errorMessage,
    errorCode,
  };

  if (compensationFailed) {
    logger.error('Transaction failed with compensation errors', {
      transactionId: transaction.id,
      failedStep: result.failedStep,
      compensationResults: result.compensationResults,
    });
  } else if (hasCompletedSteps) {
    logger.warn('Transaction failed but compensation successful', {
      transactionId: transaction.id,
      failedStep: result.failedStep,
      compensatedSteps: result.compensationResults?.filter(r => r.success).map(r => r.stepName),
    });

    eventService.publishTransactionReversed(failedTransaction);
  } else {
    logger.error('Transaction failed at first step', {
      transactionId: transaction.id,
      failedStep: result.failedStep,
    });
  }

  eventService.publishTransactionFailed(failedTransaction, errorMessage, errorCode);

  throw AppError.internal(errorMessage);
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
