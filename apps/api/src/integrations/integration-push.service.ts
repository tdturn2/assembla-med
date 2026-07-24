import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  IntegrationDestination,
  IntegrationPushStatus,
} from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import type { IntegrationPushPayload } from './destination.adapter';
import { MockDestinationAdapter } from './mock-destination.adapter';

@Injectable()
export class IntegrationPushService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mock: MockDestinationAdapter,
    private readonly audit: AuditService,
  ) {}

  private adapterFor(destination: IntegrationDestination) {
    if (destination === IntegrationDestination.mock) {
      return this.mock;
    }
    throw new BadRequestException(
      'CVENT destination is not configured yet; using simulated destination only',
    );
  }

  async pushCheckIn(
    organizationId: string,
    checkInId: string,
    userId?: string,
    options?: { forceFail?: boolean; ipAddress?: string },
  ) {
    const checkIn = await this.prisma.checkIn.findFirst({
      where: { id: checkInId, organizationId },
      include: {
        appointment: { include: { kol: true, congress: true } },
      },
    });
    if (!checkIn) {
      throw new NotFoundException('Check-in not found');
    }
    if (checkIn.voidedAt) {
      const skipped = await this.prisma.checkIn.update({
        where: { id: checkIn.id },
        data: {
          integrationStatus: IntegrationPushStatus.skipped,
          integrationLastError: 'Voided check-ins are not pushed',
        },
        include: {
          appointment: { include: { kol: true, congress: true } },
        },
      });
      return skipped;
    }

    const destination =
      checkIn.integrationDestination ?? IntegrationDestination.mock;
    const adapter = this.adapterFor(destination);
    const idempotencyKey =
      checkIn.integrationIdempotencyKey || `check_in:${checkIn.id}`;

    const payload: IntegrationPushPayload = {
      organizationId,
      checkInId: checkIn.id,
      idempotencyKey,
      congressName: checkIn.appointment.congress?.name ?? null,
      appointmentId: checkIn.appointmentId,
      appointmentTitle: checkIn.appointment.title,
      checkInCode: checkIn.appointment.checkInCode,
      attendeeName: checkIn.attendeeName,
      attendeeEmail: checkIn.attendeeEmail,
      kolName: checkIn.appointment.kol?.name ?? null,
      kolEmail: checkIn.appointment.kol?.email ?? null,
      checkedInAt: checkIn.checkedInAt.toISOString(),
      tovAmount: checkIn.tovAmount?.toString() ?? null,
      tovCurrency: checkIn.tovCurrency,
      tovType: checkIn.tovType,
      signatureStatus: checkIn.signatureStatus,
      engagementType: checkIn.appointment.engagementType,
      isContracted: checkIn.appointment.isContracted,
      forceFail: options?.forceFail,
    };

    try {
      const result = await adapter.pushCheckIn(payload);
      const updated = await this.prisma.checkIn.update({
        where: { id: checkIn.id },
        data: {
          integrationStatus: IntegrationPushStatus.pushed,
          integrationDestination: destination,
          integrationExternalId: result.externalId,
          integrationLastError: null,
          integrationIdempotencyKey: idempotencyKey,
          integrationAttemptCount: { increment: 1 },
          integrationPushedAt: new Date(),
        },
        include: {
          appointment: { include: { kol: true, congress: true } },
        },
      });

      await this.audit.log({
        action: 'integration.push',
        userId,
        organizationId,
        entityType: 'check_in',
        entityId: checkIn.id,
        ipAddress: options?.ipAddress,
        metadata: {
          destination,
          externalId: result.externalId,
          alreadyExisted: result.alreadyExisted,
          forceFail: Boolean(options?.forceFail),
        },
      });

      return updated;
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Integration push failed';
      const updated = await this.prisma.checkIn.update({
        where: { id: checkIn.id },
        data: {
          integrationStatus: IntegrationPushStatus.failed,
          integrationDestination: destination,
          integrationLastError: message.slice(0, 500),
          integrationIdempotencyKey: idempotencyKey,
          integrationAttemptCount: { increment: 1 },
        },
        include: {
          appointment: { include: { kol: true, congress: true } },
        },
      });

      await this.audit.log({
        action: 'integration.push.failed',
        userId,
        organizationId,
        entityType: 'check_in',
        entityId: checkIn.id,
        ipAddress: options?.ipAddress,
        metadata: { destination, message },
      });

      return updated;
    }
  }
}
