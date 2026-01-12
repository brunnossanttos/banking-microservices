import { logger } from '../utils/logger';
import { SagaStep, SagaExecutionResult, CompensationResult } from '../types/saga';

export class SagaOrchestrator<TContext> {
  private readonly steps: SagaStep<TContext>[] = [];
  private readonly sagaName: string;

  constructor(sagaName: string) {
    this.sagaName = sagaName;
  }

  addStep(step: SagaStep<TContext>): this {
    this.steps.push(step);
    return this;
  }

  async execute(initialContext: TContext): Promise<SagaExecutionResult<TContext>> {
    const completedSteps: string[] = [];
    let context = { ...initialContext };

    logger.info(`Starting saga: ${this.sagaName}`, { context });

    for (const step of this.steps) {
      logger.debug(`Executing step: ${step.name}`, { saga: this.sagaName });

      const result = await step.execute(context);

      if (!result.success) {
        logger.error(`Step failed: ${step.name}`, {
          saga: this.sagaName,
          error: result.error?.message,
        });

        const compensationResults = await this.compensate(completedSteps, context);

        return {
          success: false,
          context,
          completedSteps,
          failedStep: step.name,
          error: result.error,
          compensationResults,
        };
      }

      completedSteps.push(step.name);

      if (result.data) {
        context = { ...context, ...(result.data as Partial<TContext>) };
      }

      logger.debug(`Step completed: ${step.name}`, { saga: this.sagaName });
    }

    logger.info(`Saga completed successfully: ${this.sagaName}`, {
      completedSteps,
    });

    return {
      success: true,
      context,
      completedSteps,
    };
  }

  private async compensate(
    completedSteps: string[],
    context: TContext,
  ): Promise<CompensationResult[]> {
    const results: CompensationResult[] = [];
    const stepsToCompensate = [...completedSteps].reverse();

    logger.warn(`Starting compensation for saga: ${this.sagaName}`, {
      stepsToCompensate,
    });

    for (const stepName of stepsToCompensate) {
      const step = this.steps.find(s => s.name === stepName);

      if (!step) {
        logger.error(`Compensation step not found: ${stepName}`);
        results.push({
          stepName,
          success: false,
          error: new Error(`Step not found: ${stepName}`),
        });
        continue;
      }

      logger.debug(`Compensating step: ${stepName}`, { saga: this.sagaName });

      const result = await step.compensate(context);

      results.push({
        stepName,
        success: result.success,
        error: result.error,
      });

      if (result.success) {
        logger.info(`Compensation successful: ${stepName}`, { saga: this.sagaName });
      } else {
        logger.error(`Compensation failed: ${stepName}`, {
          saga: this.sagaName,
          error: result.error?.message,
        });
      }
    }

    logger.warn(`Compensation completed for saga: ${this.sagaName}`, {
      results: results.map(r => ({ step: r.stepName, success: r.success })),
    });

    return results;
  }
}
