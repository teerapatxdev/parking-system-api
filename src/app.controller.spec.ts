import { Test, type TestingModule } from '@nestjs/testing';
import { HealthCheckService, MemoryHealthIndicator } from '@nestjs/terminus';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        AppService,
        {
          provide: HealthCheckService,
          useValue: { check: jest.fn().mockResolvedValue({ status: 'ok' }) },
        },
        {
          provide: MemoryHealthIndicator,
          useValue: { checkHeap: jest.fn() },
        },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('health', () => {
    it('should return health check result', async () => {
      await expect(appController.check()).resolves.toEqual({ status: 'ok' });
    });
  });
});
