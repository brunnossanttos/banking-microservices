import { z } from 'zod';

export const createTransactionSchema = z.object({
  body: z.object({
    senderUserId: z.string().uuid('Invalid sender user ID format'),
    receiverUserId: z.string().uuid('Invalid receiver user ID format'),
    amount: z
      .number()
      .positive('Amount must be positive')
      .max(1000000, 'Amount exceeds maximum limit'),
    description: z.string().max(255, 'Description too long').optional(),
  }),
});

export const getTransactionSchema = z.object({
  params: z.object({
    transactionId: z.string().uuid('Invalid transaction ID format'),
  }),
});

export const getUserTransactionsSchema = z.object({
  params: z.object({
    userId: z.string().uuid('Invalid user ID format'),
  }),
  query: z.object({
    page: z.string().regex(/^\d+$/, 'Page must be a number').optional(),
    limit: z.string().regex(/^\d+$/, 'Limit must be a number').optional(),
    status: z.enum(['pending', 'processing', 'completed', 'failed', 'reversed']).optional(),
    type: z.enum(['transfer', 'deposit', 'withdrawal']).optional(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
  }),
});

export type CreateTransactionInput = z.infer<typeof createTransactionSchema>['body'];
export type GetTransactionParams = z.infer<typeof getTransactionSchema>['params'];
export type GetUserTransactionsQuery = z.infer<typeof getUserTransactionsSchema>['query'];
