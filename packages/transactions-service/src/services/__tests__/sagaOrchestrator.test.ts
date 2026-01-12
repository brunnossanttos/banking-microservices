import { SagaOrchestrator } from '../sagaOrchestrator';
import { SagaStep, SagaStepResult } from '../../types/saga';

jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
  },
}));

interface TestContext {
  value: number;
  step1Completed: boolean;
  step2Completed: boolean;
}

describe('SagaOrchestrator', () => {
  const createMockStep = (
    name: string,
    executeResult: SagaStepResult,
    compensateResult: SagaStepResult<void> = { success: true },
  ): SagaStep<TestContext> => ({
    name,
    execute: jest.fn().mockResolvedValue(executeResult),
    compensate: jest.fn().mockResolvedValue(compensateResult),
  });

  const initialContext: TestContext = {
    value: 0,
    step1Completed: false,
    step2Completed: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    it('should execute all steps successfully', async () => {
      const step1 = createMockStep('step1', {
        success: true,
        data: { step1Completed: true, value: 10 },
      });
      const step2 = createMockStep('step2', {
        success: true,
        data: { step2Completed: true },
      });

      const saga = new SagaOrchestrator<TestContext>('test-saga').addStep(step1).addStep(step2);

      const result = await saga.execute(initialContext);

      expect(result.success).toBe(true);
      expect(result.completedSteps).toEqual(['step1', 'step2']);
      expect(result.context.step1Completed).toBe(true);
      expect(result.context.step2Completed).toBe(true);
      expect(result.context.value).toBe(10);
      expect(step1.execute).toHaveBeenCalledTimes(1);
      expect(step2.execute).toHaveBeenCalledTimes(1);
      expect(step1.compensate).not.toHaveBeenCalled();
      expect(step2.compensate).not.toHaveBeenCalled();
    });

    it('should return failed step name when step fails', async () => {
      const step1 = createMockStep('step1', {
        success: true,
        data: { step1Completed: true },
      });
      const step2 = createMockStep('step2', {
        success: false,
        error: new Error('Step 2 failed'),
      });

      const saga = new SagaOrchestrator<TestContext>('test-saga').addStep(step1).addStep(step2);

      const result = await saga.execute(initialContext);

      expect(result.success).toBe(false);
      expect(result.failedStep).toBe('step2');
      expect(result.error?.message).toBe('Step 2 failed');
      expect(result.completedSteps).toEqual(['step1']);
    });

    it('should compensate completed steps in reverse order on failure', async () => {
      const compensateOrder: string[] = [];

      const step1: SagaStep<TestContext> = {
        name: 'step1',
        execute: jest.fn().mockResolvedValue({ success: true, data: { step1Completed: true } }),
        compensate: jest.fn().mockImplementation(() => {
          compensateOrder.push('step1');
          return Promise.resolve({ success: true });
        }),
      };

      const step2: SagaStep<TestContext> = {
        name: 'step2',
        execute: jest.fn().mockResolvedValue({ success: true, data: { step2Completed: true } }),
        compensate: jest.fn().mockImplementation(() => {
          compensateOrder.push('step2');
          return Promise.resolve({ success: true });
        }),
      };

      const step3: SagaStep<TestContext> = {
        name: 'step3',
        execute: jest.fn().mockResolvedValue({ success: false, error: new Error('Failed') }),
        compensate: jest.fn(),
      };

      const saga = new SagaOrchestrator<TestContext>('test-saga')
        .addStep(step1)
        .addStep(step2)
        .addStep(step3);

      await saga.execute(initialContext);

      expect(compensateOrder).toEqual(['step2', 'step1']);
      expect(step3.compensate).not.toHaveBeenCalled();
    });

    it('should include compensation results when steps fail', async () => {
      const step1 = createMockStep(
        'step1',
        { success: true, data: { step1Completed: true } },
        { success: true },
      );
      const step2 = createMockStep('step2', { success: false, error: new Error('Step 2 failed') });

      const saga = new SagaOrchestrator<TestContext>('test-saga').addStep(step1).addStep(step2);

      const result = await saga.execute(initialContext);

      expect(result.compensationResults).toBeDefined();
      expect(result.compensationResults).toHaveLength(1);
      expect(result.compensationResults![0].stepName).toBe('step1');
      expect(result.compensationResults![0].success).toBe(true);
    });

    it('should report compensation failures', async () => {
      const step1 = createMockStep(
        'step1',
        { success: true, data: { step1Completed: true } },
        { success: false, error: new Error('Compensation failed') },
      );
      const step2 = createMockStep('step2', { success: false, error: new Error('Step 2 failed') });

      const saga = new SagaOrchestrator<TestContext>('test-saga').addStep(step1).addStep(step2);

      const result = await saga.execute(initialContext);

      expect(result.compensationResults![0].success).toBe(false);
      expect(result.compensationResults![0].error?.message).toBe('Compensation failed');
    });

    it('should handle empty saga', async () => {
      const saga = new SagaOrchestrator<TestContext>('empty-saga');

      const result = await saga.execute(initialContext);

      expect(result.success).toBe(true);
      expect(result.completedSteps).toEqual([]);
    });

    it('should fail immediately if first step fails', async () => {
      const step1 = createMockStep('step1', {
        success: false,
        error: new Error('First step failed'),
      });
      const step2 = createMockStep('step2', { success: true });

      const saga = new SagaOrchestrator<TestContext>('test-saga').addStep(step1).addStep(step2);

      const result = await saga.execute(initialContext);

      expect(result.success).toBe(false);
      expect(result.failedStep).toBe('step1');
      expect(result.completedSteps).toEqual([]);
      expect(result.compensationResults).toEqual([]);
      expect(step2.execute).not.toHaveBeenCalled();
    });

    it('should pass updated context between steps', async () => {
      const step1: SagaStep<TestContext> = {
        name: 'step1',
        execute: jest.fn().mockResolvedValue({
          success: true,
          data: { value: 100 },
        }),
        compensate: jest.fn().mockResolvedValue({ success: true }),
      };

      const step2: SagaStep<TestContext> = {
        name: 'step2',
        execute: jest.fn().mockImplementation((ctx: TestContext) =>
          Promise.resolve({
            success: true,
            data: { value: ctx.value * 2 },
          }),
        ),
        compensate: jest.fn().mockResolvedValue({ success: true }),
      };

      const saga = new SagaOrchestrator<TestContext>('test-saga').addStep(step1).addStep(step2);

      const result = await saga.execute(initialContext);

      expect(result.context.value).toBe(200);
    });
  });

  describe('addStep', () => {
    it('should allow chaining', () => {
      const step1 = createMockStep('step1', { success: true });
      const step2 = createMockStep('step2', { success: true });

      const saga = new SagaOrchestrator<TestContext>('test-saga');

      const result = saga.addStep(step1).addStep(step2);

      expect(result).toBe(saga);
    });
  });
});
