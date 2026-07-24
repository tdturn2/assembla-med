import { Injectable } from '@nestjs/common';
import type { HealthResponse } from '@assembla-med/shared';
import { PrismaService } from './prisma/prisma.service';

@Injectable()
export class AppService {
  constructor(private readonly prisma: PrismaService) {}

  async getHealth(): Promise<HealthResponse & { database: 'up' | 'down' }> {
    let database: 'up' | 'down' = 'down';

    try {
      await this.prisma.$queryRaw`SELECT 1`;
      database = 'up';
    } catch {
      database = 'down';
    }

    return {
      status: 'ok',
      service: 'assembla-med-api',
      timestamp: new Date().toISOString(),
      database,
    };
  }
}
