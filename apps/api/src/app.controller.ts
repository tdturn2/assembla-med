import { Controller, Get } from '@nestjs/common';
import type { HealthResponse } from '@assembla-med/shared';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('health')
  getHealth(): Promise<HealthResponse & { database: 'up' | 'down' }> {
    return this.appService.getHealth();
  }
}
