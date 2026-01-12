import { Request, Response, NextFunction } from 'express';
import { StatusCodes } from 'http-status-codes';
import { transactionService } from '../services';
import {
  CreateTransactionInput,
  GetTransactionParams,
  GetUserTransactionsQuery,
} from '../schemas/transactionSchema';

export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = req.body as CreateTransactionInput;
    const transaction = await transactionService.createTransaction(input);

    res.status(StatusCodes.CREATED).json({
      success: true,
      data: transaction,
      message: 'Transaction created successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
}

export async function getById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { transactionId } = req.params as unknown as GetTransactionParams;
    const transaction = await transactionService.getTransactionById(transactionId);

    res.status(StatusCodes.OK).json({
      success: true,
      data: transaction,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
}

export async function getByUserId(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { userId } = req.params as unknown as { userId: string };
    const query = req.query as unknown as GetUserTransactionsQuery;

    const result = await transactionService.getUserTransactions(userId, {
      status: query.status,
      type: query.type,
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
      page: query.page ? parseInt(query.page, 10) : undefined,
      limit: query.limit ? parseInt(query.limit, 10) : undefined,
    });

    res.status(StatusCodes.OK).json({
      success: true,
      data: result.data,
      pagination: result.pagination,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
}
