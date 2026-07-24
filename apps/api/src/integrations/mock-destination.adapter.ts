import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type {
  DestinationAdapter,
  IntegrationPushPayload,
  IntegrationPushResult,
} from './destination.adapter';

@Injectable()
export class MockDestinationAdapter implements DestinationAdapter {
  readonly destination = 'mock' as const;

  constructor(private readonly prisma: PrismaService) {}

  async pushCheckIn(
    payload: IntegrationPushPayload,
  ): Promise<IntegrationPushResult> {
    if (
      payload.forceFail ||
      process.env.INTEGRATION_MOCK_FORCE_FAIL === 'true'
    ) {
      throw new ServiceUnavailableException(
        'Simulated destination forced failure (demo)',
      );
    }

    const existing = await this.prisma.mockIntegrationRecord.findUnique({
      where: {
        organizationId_idempotencyKey: {
          organizationId: payload.organizationId,
          idempotencyKey: payload.idempotencyKey,
        },
      },
    });
    if (existing) {
      return { externalId: existing.id, alreadyExisted: true };
    }

    const created = await this.prisma.mockIntegrationRecord.create({
      data: {
        organizationId: payload.organizationId,
        idempotencyKey: payload.idempotencyKey,
        checkInId: payload.checkInId,
        payloadJson: payload as unknown as Prisma.InputJsonValue,
      },
    });

    return { externalId: created.id, alreadyExisted: false };
  }
}
