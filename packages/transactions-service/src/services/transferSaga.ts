import axios from 'axios';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import { SagaStep, SagaStepResult, TransferSagaContext } from '../types/saga';
import { SagaOrchestrator } from './sagaOrchestrator';

const internalApiHeaders = {
  'x-internal-api-key': env.clientsService.internalApiKey,
};

const clientsApi = {
  async withdraw(userId: string, amount: number): Promise<void> {
    await axios.post(
      `${env.clientsService.url}/api/internal/users/${userId}/withdraw`,
      { amount },
      { headers: internalApiHeaders },
    );
  },

  async deposit(userId: string, amount: number): Promise<void> {
    await axios.post(
      `${env.clientsService.url}/api/internal/users/${userId}/deposit`,
      { amount },
      { headers: internalApiHeaders },
    );
  },
};

class WithdrawStep implements SagaStep<TransferSagaContext> {
  readonly name = 'withdraw';

  async execute(
    context: TransferSagaContext,
  ): Promise<SagaStepResult<Partial<TransferSagaContext>>> {
    try {
      await clientsApi.withdraw(context.senderUserId, context.amount);

      logger.info('Withdraw executed successfully', {
        transactionId: context.transactionId,
        userId: context.senderUserId,
        amount: context.amount,
      });

      return {
        success: true,
        data: { withdrawCompleted: true },
      };
    } catch (error) {
      logger.error('Withdraw failed', {
        transactionId: context.transactionId,
        userId: context.senderUserId,
        amount: context.amount,
        error,
      });

      return {
        success: false,
        error: error instanceof Error ? error : new Error('Withdraw failed'),
      };
    }
  }

  async compensate(context: TransferSagaContext): Promise<SagaStepResult<void>> {
    if (!context.withdrawCompleted) {
      logger.debug('Withdraw was not completed, skipping compensation', {
        transactionId: context.transactionId,
      });
      return { success: true };
    }

    try {
      await clientsApi.deposit(context.senderUserId, context.amount);

      logger.info('Withdraw compensation successful (refund)', {
        transactionId: context.transactionId,
        userId: context.senderUserId,
        amount: context.amount,
      });

      return { success: true };
    } catch (error) {
      logger.error('Withdraw compensation failed', {
        transactionId: context.transactionId,
        userId: context.senderUserId,
        amount: context.amount,
        error,
      });

      return {
        success: false,
        error: error instanceof Error ? error : new Error('Refund failed'),
      };
    }
  }
}

class DepositStep implements SagaStep<TransferSagaContext> {
  readonly name = 'deposit';

  async execute(
    context: TransferSagaContext,
  ): Promise<SagaStepResult<Partial<TransferSagaContext>>> {
    try {
      await clientsApi.deposit(context.receiverUserId, context.amount);

      logger.info('Deposit executed successfully', {
        transactionId: context.transactionId,
        userId: context.receiverUserId,
        amount: context.amount,
      });

      return {
        success: true,
        data: { depositCompleted: true },
      };
    } catch (error) {
      logger.error('Deposit failed', {
        transactionId: context.transactionId,
        userId: context.receiverUserId,
        amount: context.amount,
        error,
      });

      return {
        success: false,
        error: error instanceof Error ? error : new Error('Deposit failed'),
      };
    }
  }

  async compensate(context: TransferSagaContext): Promise<SagaStepResult<void>> {
    if (!context.depositCompleted) {
      logger.debug('Deposit was not completed, skipping compensation', {
        transactionId: context.transactionId,
      });
      return { success: true };
    }

    try {
      await clientsApi.withdraw(context.receiverUserId, context.amount);

      logger.info('Deposit compensation successful (reverse)', {
        transactionId: context.transactionId,
        userId: context.receiverUserId,
        amount: context.amount,
      });

      return { success: true };
    } catch (error) {
      logger.error('Deposit compensation failed', {
        transactionId: context.transactionId,
        userId: context.receiverUserId,
        amount: context.amount,
        error,
      });

      return {
        success: false,
        error: error instanceof Error ? error : new Error('Reverse deposit failed'),
      };
    }
  }
}

export function createTransferSaga(): SagaOrchestrator<TransferSagaContext> {
  return new SagaOrchestrator<TransferSagaContext>('transfer')
    .addStep(new WithdrawStep())
    .addStep(new DepositStep());
}

export { WithdrawStep, DepositStep, clientsApi };
