import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AppointmentStatus,
  AttendeeKind,
  AttendeeRsvpStatus,
  EngagementType,
  Prisma,
} from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { generateCheckInCode, overlaps } from '../common/utils';
import { PrismaService } from '../prisma/prisma.service';
import type { AttendeeInputDto } from './dto/appointments.dto';

const appointmentInclude = {
  kol: true,
  congress: true,
  room: true,
  attendees: { include: { kol: true }, orderBy: { createdAt: 'asc' as const } },
} satisfies Prisma.AppointmentInclude;

@Injectable()
export class AppointmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async create(
    organizationId: string,
    userId: string,
    data: {
      congressId: string;
      kolId?: string;
      roomId?: string;
      title: string;
      location?: string;
      startTime: string;
      endTime: string;
      status?: AppointmentStatus;
      engagementType?: EngagementType;
      isContracted?: boolean;
      contractNotes?: string;
      notes?: string;
      attendees?: AttendeeInputDto[];
    },
    ipAddress?: string,
  ) {
    const startTime = new Date(data.startTime);
    const endTime = new Date(data.endTime);
    if (!(startTime < endTime)) {
      throw new BadRequestException('startTime must be before endTime');
    }

    const congress = await this.prisma.congress.findFirst({
      where: { id: data.congressId, organizationId },
    });
    if (!congress) {
      throw new NotFoundException('Congress not found');
    }

    let primaryKolId = data.kolId || null;
    if (primaryKolId) {
      const kol = await this.prisma.kol.findFirst({
        where: { id: primaryKolId, organizationId },
      });
      if (!kol) {
        throw new NotFoundException('KOL not found');
      }
    }

    let roomId = data.roomId || null;
    let roomTitle: string | null = null;
    if (roomId) {
      const room = await this.prisma.room.findFirst({
        where: { id: roomId, organizationId, congressId: data.congressId },
      });
      if (!room) {
        throw new NotFoundException('Room not found for this congress');
      }
      roomTitle = room.title;
    }

    await this.assertNoConflicts({
      organizationId,
      kolId: primaryKolId,
      roomId,
      createdById: userId,
      startTime,
      endTime,
    });

    const engagementType = data.engagementType ?? EngagementType.meeting;
    const isContracted =
      data.isContracted ?? engagementType === EngagementType.contracted_talk;

    const location =
      data.location?.trim() || roomTitle || null;

    const appointment = await this.prisma.$transaction(async (tx) => {
      const created = await tx.appointment.create({
        data: {
          organizationId,
          congressId: data.congressId,
          roomId,
          kolId: primaryKolId,
          createdById: userId,
          title: data.title.trim(),
          location,
          startTime,
          endTime,
          status: data.status ?? AppointmentStatus.confirmed,
          engagementType,
          isContracted,
          contractNotes: data.contractNotes?.trim() || null,
          notes: data.notes?.trim() || null,
          checkInCode: await this.uniqueCheckInCode(tx),
        },
      });

      const attendeeInputs = [...(data.attendees || [])];
      if (
        primaryKolId &&
        !attendeeInputs.some((a) => a.kolId === primaryKolId)
      ) {
        const kol = await tx.kol.findUniqueOrThrow({
          where: { id: primaryKolId },
        });
        attendeeInputs.unshift({
          kind: AttendeeKind.kol,
          kolId: kol.id,
          name: kol.name,
          email: kol.email || undefined,
          isPrimary: true,
          rsvpStatus: AttendeeRsvpStatus.invited,
        });
      }

      for (const input of attendeeInputs) {
        await this.createAttendeeRecord(tx, organizationId, created.id, input);
      }

      // Keep primary kolId synced from primary attendee if present
      const primary = await tx.appointmentAttendee.findFirst({
        where: { appointmentId: created.id, isPrimary: true },
      });
      if (primary?.kolId && primary.kolId !== created.kolId) {
        await tx.appointment.update({
          where: { id: created.id },
          data: { kolId: primary.kolId },
        });
      }

      return tx.appointment.findUniqueOrThrow({
        where: { id: created.id },
        include: appointmentInclude,
      });
    });

    await this.audit.log({
      action: 'appointment.create',
      userId,
      organizationId,
      entityType: 'appointment',
      entityId: appointment.id,
      ipAddress,
      metadata: {
        engagementType: appointment.engagementType,
        isContracted: appointment.isContracted,
      },
    });

    return appointment;
  }

  list(
    organizationId: string,
    filters?: { congressId?: string; kolId?: string },
  ) {
    return this.prisma.appointment.findMany({
      where: {
        organizationId,
        congressId: filters?.congressId,
        kolId: filters?.kolId,
      },
      include: appointmentInclude,
      orderBy: { startTime: 'asc' },
    });
  }

  async get(organizationId: string, appointmentId: string) {
    const appointment = await this.prisma.appointment.findFirst({
      where: { id: appointmentId, organizationId },
      include: appointmentInclude,
    });
    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }
    return appointment;
  }

  async getByCheckInCode(organizationId: string, code: string) {
    const appointment = await this.prisma.appointment.findFirst({
      where: {
        organizationId,
        checkInCode: code.trim().toUpperCase(),
        status: { not: AppointmentStatus.cancelled },
      },
      include: appointmentInclude,
    });
    if (!appointment) {
      throw new NotFoundException('Appointment not found for check-in code');
    }
    return appointment;
  }

  async update(
    organizationId: string,
    appointmentId: string,
    userId: string,
    data: {
      kolId?: string | null;
      roomId?: string | null;
      title?: string;
      location?: string | null;
      startTime?: string;
      endTime?: string;
      status?: AppointmentStatus;
      engagementType?: EngagementType;
      isContracted?: boolean;
      contractNotes?: string | null;
      notes?: string | null;
    },
    ipAddress?: string,
  ) {
    const existing = await this.get(organizationId, appointmentId);
    const startTime = data.startTime
      ? new Date(data.startTime)
      : existing.startTime;
    const endTime = data.endTime ? new Date(data.endTime) : existing.endTime;
    if (!(startTime < endTime)) {
      throw new BadRequestException('startTime must be before endTime');
    }

    let nextRoomId =
      data.roomId === undefined ? existing.roomId : data.roomId;
    if (nextRoomId) {
      const room = await this.prisma.room.findFirst({
        where: {
          id: nextRoomId,
          organizationId,
          congressId: existing.congressId,
        },
      });
      if (!room) {
        throw new NotFoundException('Room not found for this congress');
      }
    }

    const nextStatus = data.status ?? existing.status;
    if (nextStatus !== AppointmentStatus.cancelled) {
      await this.assertNoConflicts({
        organizationId,
        kolId:
          data.kolId === undefined ? (existing.kolId ?? undefined) : data.kolId,
        roomId: nextRoomId,
        createdById: existing.createdById ?? userId,
        startTime,
        endTime,
        excludeAppointmentId: appointmentId,
      });
    }

    const patch: Prisma.AppointmentUpdateInput = {};
    if (data.title !== undefined) patch.title = data.title.trim();
    if (data.location !== undefined) {
      patch.location = data.location?.trim() || null;
    }
    if (data.notes !== undefined) patch.notes = data.notes?.trim() || null;
    if (data.status !== undefined) patch.status = data.status;
    if (data.startTime !== undefined) patch.startTime = startTime;
    if (data.endTime !== undefined) patch.endTime = endTime;
    if (data.engagementType !== undefined) {
      patch.engagementType = data.engagementType;
    }
    if (data.isContracted !== undefined) patch.isContracted = data.isContracted;
    if (data.contractNotes !== undefined) {
      patch.contractNotes = data.contractNotes?.trim() || null;
    }
    if (data.roomId !== undefined) {
      if (data.roomId) {
        patch.room = { connect: { id: data.roomId } };
        if (data.location === undefined && !existing.location) {
          const room = await this.prisma.room.findUniqueOrThrow({
            where: { id: data.roomId },
          });
          patch.location = room.title;
        }
      } else {
        patch.room = { disconnect: true };
      }
    }
    if (data.kolId !== undefined) {
      if (data.kolId) {
        const kol = await this.prisma.kol.findFirst({
          where: { id: data.kolId, organizationId },
        });
        if (!kol) {
          throw new NotFoundException('KOL not found');
        }
        patch.kol = { connect: { id: data.kolId } };
      } else {
        patch.kol = { disconnect: true };
      }
    }

    const appointment = await this.prisma.appointment.update({
      where: { id: appointmentId },
      data: patch,
      include: appointmentInclude,
    });

    await this.audit.log({
      action: 'appointment.update',
      userId,
      organizationId,
      entityType: 'appointment',
      entityId: appointment.id,
      ipAddress,
    });

    return appointment;
  }

  async addAttendee(
    organizationId: string,
    appointmentId: string,
    userId: string,
    input: AttendeeInputDto,
    ipAddress?: string,
  ) {
    await this.get(organizationId, appointmentId);
    const attendee = await this.prisma.$transaction(async (tx) => {
      if (input.isPrimary) {
        await tx.appointmentAttendee.updateMany({
          where: { appointmentId, isPrimary: true },
          data: { isPrimary: false },
        });
      }
      const created = await this.createAttendeeRecord(
        tx,
        organizationId,
        appointmentId,
        input,
      );
      if (created.isPrimary && created.kolId) {
        await tx.appointment.update({
          where: { id: appointmentId },
          data: { kolId: created.kolId },
        });
      }
      return created;
    });

    await this.audit.log({
      action: 'appointment.attendee.add',
      userId,
      organizationId,
      entityType: 'appointment_attendee',
      entityId: attendee.id,
      ipAddress,
      metadata: { appointmentId, name: attendee.name },
    });

    return this.get(organizationId, appointmentId);
  }

  async removeAttendee(
    organizationId: string,
    appointmentId: string,
    attendeeId: string,
    userId: string,
    ipAddress?: string,
  ) {
    await this.get(organizationId, appointmentId);
    const attendee = await this.prisma.appointmentAttendee.findFirst({
      where: { id: attendeeId, appointmentId, organizationId },
    });
    if (!attendee) {
      throw new NotFoundException('Attendee not found');
    }

    await this.prisma.appointmentAttendee.delete({ where: { id: attendee.id } });

    if (attendee.isPrimary && attendee.kolId) {
      const nextPrimary = await this.prisma.appointmentAttendee.findFirst({
        where: { appointmentId, kind: AttendeeKind.kol },
        orderBy: { createdAt: 'asc' },
      });
      await this.prisma.appointment.update({
        where: { id: appointmentId },
        data: {
          kolId: nextPrimary?.kolId || null,
        },
      });
      if (nextPrimary) {
        await this.prisma.appointmentAttendee.update({
          where: { id: nextPrimary.id },
          data: { isPrimary: true },
        });
      }
    }

    await this.audit.log({
      action: 'appointment.attendee.remove',
      userId,
      organizationId,
      entityType: 'appointment_attendee',
      entityId: attendee.id,
      ipAddress,
      metadata: { appointmentId },
    });

    return this.get(organizationId, appointmentId);
  }

  private async createAttendeeRecord(
    tx: Prisma.TransactionClient,
    organizationId: string,
    appointmentId: string,
    input: AttendeeInputDto,
  ) {
    let name = input.name?.trim() || '';
    let email = input.email?.trim().toLowerCase() || null;
    let kolId = input.kolId || null;
    let userId = input.userId || null;

    if (input.kind === AttendeeKind.kol) {
      if (!kolId) {
        throw new BadRequestException('kolId is required for KOL attendees');
      }
      const kol = await tx.kol.findFirst({
        where: { id: kolId, organizationId },
      });
      if (!kol) {
        throw new NotFoundException('KOL not found');
      }
      name = name || kol.name;
      email = email || kol.email;
    }

    if (input.kind === AttendeeKind.staff) {
      if (!userId) {
        throw new BadRequestException('userId is required for staff attendees');
      }
      const user = await tx.user.findUnique({ where: { id: userId } });
      if (!user) {
        throw new NotFoundException('User not found');
      }
      name = name || user.email;
      email = email || user.email;
    }

    if (input.kind === AttendeeKind.external && !name) {
      throw new BadRequestException('name is required for external attendees');
    }

    if (input.isPrimary) {
      await tx.appointmentAttendee.updateMany({
        where: { appointmentId, isPrimary: true },
        data: { isPrimary: false },
      });
    }

    return tx.appointmentAttendee.create({
      data: {
        organizationId,
        appointmentId,
        kind: input.kind,
        kolId,
        userId,
        name,
        email,
        rsvpStatus: input.rsvpStatus ?? AttendeeRsvpStatus.pending,
        isPrimary: input.isPrimary ?? false,
      },
      include: { kol: true },
    });
  }

  private async assertNoConflicts(input: {
    organizationId: string;
    kolId?: string | null;
    roomId?: string | null;
    createdById?: string | null;
    startTime: Date;
    endTime: Date;
    excludeAppointmentId?: string;
  }) {
    const orFilters: Prisma.AppointmentWhereInput[] = [];
    if (input.kolId) {
      orFilters.push({ kolId: input.kolId });
      orFilters.push({
        attendees: { some: { kolId: input.kolId } },
      });
    }
    if (input.createdById) {
      orFilters.push({ createdById: input.createdById });
    }
    if (input.roomId) {
      orFilters.push({ roomId: input.roomId });
    }
    if (orFilters.length === 0) {
      return;
    }

    const candidates = await this.prisma.appointment.findMany({
      where: {
        organizationId: input.organizationId,
        status: { not: AppointmentStatus.cancelled },
        id: input.excludeAppointmentId
          ? { not: input.excludeAppointmentId }
          : undefined,
        OR: orFilters,
      },
    });

    for (const candidate of candidates) {
      if (
        overlaps(
          input.startTime,
          input.endTime,
          candidate.startTime,
          candidate.endTime,
        )
      ) {
        const isRoom =
          !!input.roomId && candidate.roomId === input.roomId;
        throw new ConflictException({
          message: isRoom
            ? 'Room is already booked for this time'
            : 'Appointment conflicts with an existing booking',
          conflictingAppointmentId: candidate.id,
        });
      }
    }
  }

  private async uniqueCheckInCode(tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const code = generateCheckInCode();
      const existing = await client.appointment.findUnique({
        where: { checkInCode: code },
      });
      if (!existing) {
        return code;
      }
    }
    throw new ConflictException('Unable to allocate check-in code');
  }
}
