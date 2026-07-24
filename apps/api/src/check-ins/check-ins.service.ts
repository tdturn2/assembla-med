import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, SignatureStatus } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { AppointmentsService } from '../appointments/appointments.service';
import { escapeCsv } from '../common/utils';
import { IntegrationPushService } from '../integrations/integration-push.service';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';

@Injectable()
export class CheckInsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly appointments: AppointmentsService,
    private readonly storage: StorageService,
    private readonly audit: AuditService,
    private readonly integrationPush: IntegrationPushService,
  ) {}

  async create(
    organizationId: string,
    userId: string,
    data: {
      appointmentId?: string;
      checkInCode?: string;
      attendeeName?: string;
      attendeeEmail?: string;
      notes?: string;
      tovAmount?: number;
      tovType?: string;
      tovCurrency?: string;
      signatureBase64?: string;
      replacesCheckInId?: string;
    },
    ipAddress?: string,
  ) {
    if (!data.appointmentId && !data.checkInCode) {
      throw new BadRequestException('appointmentId or checkInCode is required');
    }

    const appointment = data.appointmentId
      ? await this.appointments.get(organizationId, data.appointmentId)
      : await this.appointments.getByCheckInCode(
          organizationId,
          data.checkInCode!,
        );

    let replacesCheckInId: string | null = null;
    if (data.replacesCheckInId) {
      const previous = await this.prisma.checkIn.findFirst({
        where: {
          id: data.replacesCheckInId,
          organizationId,
          appointmentId: appointment.id,
        },
      });
      if (!previous) {
        throw new NotFoundException('Check-in to replace not found');
      }
      if (!previous.voidedAt) {
        throw new ConflictException(
          'Only voided check-ins can be corrected; void the original first',
        );
      }
      replacesCheckInId = previous.id;
    }

    let signatureKey: string | null = null;
    let signatureStatus: SignatureStatus = SignatureStatus.not_required;
    let signatureSignedAt: Date | null = null;

    if (data.signatureBase64) {
      signatureKey = await this.storage.saveSignature(
        organizationId,
        data.signatureBase64,
      );
      signatureStatus = SignatureStatus.signed;
      signatureSignedAt = new Date();
    } else if (data.tovAmount != null) {
      signatureStatus = SignatureStatus.pending;
    }

    const created = await this.prisma.checkIn.create({
      data: {
        organizationId,
        appointmentId: appointment.id,
        checkedInById: userId,
        attendeeName:
          data.attendeeName?.trim() || appointment.kol?.name || null,
        attendeeEmail:
          data.attendeeEmail?.trim().toLowerCase() ||
          appointment.kol?.email ||
          null,
        notes: data.notes?.trim() || null,
        tovAmount:
          data.tovAmount != null ? new Prisma.Decimal(data.tovAmount) : null,
        tovType: data.tovType?.trim() || null,
        tovCurrency: data.tovCurrency?.trim() || 'USD',
        signatureStatus,
        signatureKey,
        signatureSignedAt,
        replacesCheckInId,
      },
    });

    await this.prisma.checkIn.update({
      where: { id: created.id },
      data: { integrationIdempotencyKey: `check_in:${created.id}` },
    });

    await this.audit.log({
      action: 'check_in.create',
      userId,
      organizationId,
      entityType: 'check_in',
      entityId: created.id,
      ipAddress,
      metadata: {
        appointmentId: appointment.id,
        signatureStatus,
        replacesCheckInId,
      },
    });

    return this.integrationPush.pushCheckIn(organizationId, created.id, userId, {
      ipAddress,
    });
  }

  listForAppointment(organizationId: string, appointmentId: string) {
    return this.prisma.checkIn.findMany({
      where: { organizationId, appointmentId },
      include: {
        appointment: { include: { kol: true, congress: true } },
      },
      orderBy: { checkedInAt: 'desc' },
    });
  }

  async get(organizationId: string, checkInId: string) {
    const checkIn = await this.prisma.checkIn.findFirst({
      where: { id: checkInId, organizationId },
      include: {
        appointment: { include: { kol: true, congress: true } },
      },
    });
    if (!checkIn) {
      throw new NotFoundException('Check-in not found');
    }
    return checkIn;
  }

  async voidCheckIn(
    organizationId: string,
    checkInId: string,
    userId: string,
    reason: string,
    ipAddress?: string,
  ) {
    const checkIn = await this.get(organizationId, checkInId);
    if (checkIn.voidedAt) {
      throw new ConflictException('Check-in is already voided');
    }

    const voided = await this.prisma.checkIn.update({
      where: { id: checkIn.id },
      data: {
        voidedAt: new Date(),
        voidReason: reason.trim(),
      },
      include: {
        appointment: { include: { kol: true, congress: true } },
      },
    });

    await this.audit.log({
      action: 'check_in.void',
      userId,
      organizationId,
      entityType: 'check_in',
      entityId: checkIn.id,
      ipAddress,
      metadata: { reason: reason.trim() },
    });

    return voided;
  }

  async exportCsv(organizationId: string, congressId: string) {
    const congress = await this.prisma.congress.findFirst({
      where: { id: congressId, organizationId },
    });
    if (!congress) {
      throw new NotFoundException('Congress not found');
    }

    const rows = await this.prisma.checkIn.findMany({
      where: {
        organizationId,
        appointment: { congressId },
      },
      include: {
        appointment: { include: { kol: true } },
      },
      orderBy: { checkedInAt: 'asc' },
    });

    const header = [
      'check_in_id',
      'checked_in_at',
      'voided_at',
      'void_reason',
      'appointment_id',
      'appointment_title',
      'check_in_code',
      'kol_name',
      'attendee_name',
      'attendee_email',
      'tov_amount',
      'tov_currency',
      'tov_type',
      'signature_status',
      'signature_key',
      'replaces_check_in_id',
      'integration_status',
      'integration_destination',
      'integration_external_id',
      'notes',
    ];

    const lines = [
      header.join(','),
      ...rows.map((row) =>
        [
          escapeCsv(row.id),
          escapeCsv(row.checkedInAt.toISOString()),
          escapeCsv(row.voidedAt?.toISOString()),
          escapeCsv(row.voidReason),
          escapeCsv(row.appointmentId),
          escapeCsv(row.appointment.title),
          escapeCsv(row.appointment.checkInCode),
          escapeCsv(row.appointment.kol?.name),
          escapeCsv(row.attendeeName),
          escapeCsv(row.attendeeEmail),
          escapeCsv(row.tovAmount?.toString()),
          escapeCsv(row.tovCurrency),
          escapeCsv(row.tovType),
          escapeCsv(row.signatureStatus),
          escapeCsv(row.signatureKey),
          escapeCsv(row.replacesCheckInId),
          escapeCsv(row.integrationStatus),
          escapeCsv(row.integrationDestination),
          escapeCsv(row.integrationExternalId),
          escapeCsv(row.notes),
        ].join(','),
      ),
    ];

    return {
      filename: `${congress.name.replace(/\s+/g, '-').toLowerCase()}-check-ins.csv`,
      csv: `${lines.join('\n')}\n`,
      rowCount: rows.length,
    };
  }

  /** Provisional CVENT-oriented columns for buyer self-import. */
  async exportCventCsv(organizationId: string, congressId: string) {
    const congress = await this.prisma.congress.findFirst({
      where: { id: congressId, organizationId },
    });
    if (!congress) {
      throw new NotFoundException('Congress not found');
    }

    const rows = await this.prisma.checkIn.findMany({
      where: {
        organizationId,
        voidedAt: null,
        appointment: { congressId },
      },
      include: {
        appointment: { include: { kol: true, congress: true } },
      },
      orderBy: { checkedInAt: 'asc' },
    });

    // Headers are provisional — see docs/cvent-field-mapping.md
    const header = [
      'SourceSystemId',
      'EventName',
      'ActivityReference',
      'ContactName',
      'ContactEmail',
      'HcpName',
      'HcpEmail',
      'AttendanceTimestamp',
      'TovAmount',
      'TovCurrency',
      'TovType',
      'SignatureStatus',
      'EngagementType',
      'IsContracted',
      'IdempotencyKey',
      'Notes',
    ];

    const lines = [
      header.join(','),
      ...rows.map((row) =>
        [
          escapeCsv(row.id),
          escapeCsv(row.appointment.congress?.name || congress.name),
          escapeCsv(row.appointment.checkInCode),
          escapeCsv(row.attendeeName),
          escapeCsv(row.attendeeEmail),
          escapeCsv(row.appointment.kol?.name),
          escapeCsv(row.appointment.kol?.email),
          escapeCsv(row.checkedInAt.toISOString()),
          escapeCsv(row.tovAmount?.toString()),
          escapeCsv(row.tovCurrency),
          escapeCsv(row.tovType),
          escapeCsv(row.signatureStatus),
          escapeCsv(row.appointment.engagementType),
          escapeCsv(row.appointment.isContracted ? 'true' : 'false'),
          escapeCsv(row.integrationIdempotencyKey || `check_in:${row.id}`),
          escapeCsv(row.notes),
        ].join(','),
      ),
    ];

    return {
      filename: `${congress.name.replace(/\s+/g, '-').toLowerCase()}-cvent-import.csv`,
      csv: `${lines.join('\n')}\n`,
      rowCount: rows.length,
    };
  }
}
