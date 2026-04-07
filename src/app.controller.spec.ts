import { Test, type TestingModule } from '@nestjs/testing';
import {
  HealthCheckService,
  MemoryHealthIndicator,
  type HealthCheckResult,
  type HealthIndicatorFunction,
} from '@nestjs/terminus';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let appController: AppController;
  const checkMock = jest.fn<Promise<HealthCheckResult>, [HealthIndicatorFunction[]]>();
  const checkHeapMock = jest.fn();

  beforeEach(async () => {
    checkMock.mockReset();
    checkHeapMock.mockReset();

    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        AppService,
        {
          provide: HealthCheckService,
          useValue: { check: checkMock },
        },
        {
          provide: MemoryHealthIndicator,
          useValue: { checkHeap: checkHeapMock },
        },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  it('should be defined', () => {
    expect(appController).toBeDefined();
  });

  describe('check', () => {
    it('should call HealthCheckService.check and return its result', async () => {
      const result: HealthCheckResult = { status: 'ok', info: {}, error: {}, details: {} };
      checkMock.mockResolvedValue(result);

      await expect(appController.check()).resolves.toEqual(result);
      expect(checkMock).toHaveBeenCalledTimes(1);
      expect(checkMock).toHaveBeenCalledWith([expect.any(Function)]);
    });

    it('should pass an indicator that calls memory.checkHeap with 150MB threshold', async () => {
      let capturedIndicators: HealthIndicatorFunction[] = [];
      checkMock.mockImplementation((indicators) => {
        capturedIndicators = indicators;
        return Promise.resolve({ status: 'ok', info: {}, error: {}, details: {} });
      });

      await appController.check();
      await capturedIndicators[0]();

      expect(checkHeapMock).toHaveBeenCalledWith('memory_heap', 150 * 1024 * 1024);
    });

    it('should propagate errors from HealthCheckService', async () => {
      checkMock.mockRejectedValue(new Error('health check failed'));

      await expect(appController.check()).rejects.toThrow('health check failed');
    });
  });
});
