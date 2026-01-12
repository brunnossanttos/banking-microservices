export interface SagaStepResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: Error;
}

export interface SagaStep<TContext, TResult = unknown> {
  name: string;
  execute(context: TContext): Promise<SagaStepResult<TResult>>;
  compensate(context: TContext): Promise<SagaStepResult<void>>;
}

export interface SagaExecutionResult<TContext> {
  success: boolean;
  context: TContext;
  completedSteps: string[];
  failedStep?: string;
  error?: Error;
  compensationResults?: CompensationResult[];
}

export interface CompensationResult {
  stepName: string;
  success: boolean;
  error?: Error;
}

export interface TransferSagaContext {
  transactionId: string;
  senderUserId: string;
  receiverUserId: string;
  amount: number;
  withdrawCompleted: boolean;
  depositCompleted: boolean;
}
