import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { HealthCheck, HealthCheckService, MemoryHealthIndicator } from '@nestjs/terminus';
import { SkipThrottle } from '@nestjs/throttler';
import { Public } from './common/decorators/public.decorator';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private health: HealthCheckService,
    private memory: MemoryHealthIndicator,
  ) {}

  @Get('health')
  @HealthCheck()
  @Public()
  @SkipThrottle()
  check() {
    return this.health.check([() => this.memory.checkHeap('memory_heap', 150 * 1024 * 1024)]);
  }
}
