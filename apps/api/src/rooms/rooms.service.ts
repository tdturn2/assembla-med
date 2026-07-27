import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AppointmentStatus, Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { overlaps } from '../common/utils';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RoomsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  private async assertCongress(organizationId: string, congressId: string) {
    const congress = await this.prisma.congress.findFirst({
      where: { id: congressId, organizationId },
    });
    if (!congress) {
      throw new NotFoundException('Congress not found');
    }
    return congress;
  }

  async create(
    organizationId: string,
    congressId: string,
    userId: string,
    data: {
      title: string;
      sitting?: number;
      capacity?: number;
      hasAv?: boolean;
      avNotes?: string;
      layout?: string;
      supplyList?: string;
      notes?: string;
    },
    ipAddress?: string,
  ) {
    await this.assertCongress(organizationId, congressId);
    const room = await this.prisma.room.create({
      data: {
        organizationId,
        congressId,
        title: data.title.trim(),
        sitting: data.sitting ?? null,
        capacity: data.capacity ?? null,
        hasAv: data.hasAv ?? false,
        avNotes: data.avNotes?.trim() || null,
        layout: data.layout?.trim() || null,
        supplyList: data.supplyList?.trim() || null,
        notes: data.notes?.trim() || null,
      },
    });

    await this.audit.log({
      action: 'room.create',
      userId,
      organizationId,
      entityType: 'room',
      entityId: room.id,
      ipAddress,
      metadata: { congressId, title: room.title },
    });

    return room;
  }

  list(organizationId: string, congressId: string) {
    return this.prisma.room.findMany({
      where: { organizationId, congressId },
      orderBy: { title: 'asc' },
    });
  }

  async get(organizationId: string, roomId: string) {
    const room = await this.prisma.room.findFirst({
      where: { id: roomId, organizationId },
    });
    if (!room) {
      throw new NotFoundException('Room not found');
    }
    return room;
  }

  async update(
    organizationId: string,
    roomId: string,
    userId: string,
    data: {
      title?: string;
      sitting?: number | null;
      capacity?: number | null;
      hasAv?: boolean;
      avNotes?: string | null;
      layout?: string | null;
      supplyList?: string | null;
      notes?: string | null;
    },
    ipAddress?: string,
  ) {
    await this.get(organizationId, roomId);
    const patch: Prisma.RoomUpdateInput = {};
    if (data.title !== undefined) patch.title = data.title.trim();
    if (data.sitting !== undefined) patch.sitting = data.sitting;
    if (data.capacity !== undefined) patch.capacity = data.capacity;
    if (data.hasAv !== undefined) patch.hasAv = data.hasAv;
    if (data.avNotes !== undefined) {
      patch.avNotes = data.avNotes?.trim() || null;
    }
    if (data.layout !== undefined) patch.layout = data.layout?.trim() || null;
    if (data.supplyList !== undefined) {
      patch.supplyList = data.supplyList?.trim() || null;
    }
    if (data.notes !== undefined) patch.notes = data.notes?.trim() || null;

    const room = await this.prisma.room.update({
      where: { id: roomId },
      data: patch,
    });

    await this.audit.log({
      action: 'room.update',
      userId,
      organizationId,
      entityType: 'room',
      entityId: room.id,
      ipAddress,
    });

    return room;
  }

  async remove(
    organizationId: string,
    roomId: string,
    userId: string,
    ipAddress?: string,
  ) {
    await this.get(organizationId, roomId);
    await this.prisma.room.delete({ where: { id: roomId } });
    await this.audit.log({
      action: 'room.delete',
      userId,
      organizationId,
      entityType: 'room',
      entityId: roomId,
      ipAddress,
    });
    return { ok: true };
  }

  async availability(
    organizationId: string,
    congressId: string,
    startTimeIso: string,
    endTimeIso: string,
  ) {
    await this.assertCongress(organizationId, congressId);
    const startTime = new Date(startTimeIso);
    const endTime = new Date(endTimeIso);
    if (!(startTime < endTime)) {
      throw new BadRequestException('startTime must be before endTime');
    }

    const [rooms, appointments] = await Promise.all([
      this.list(organizationId, congressId),
      this.prisma.appointment.findMany({
        where: {
          organizationId,
          congressId,
          status: { not: AppointmentStatus.cancelled },
          roomId: { not: null },
        },
        select: {
          id: true,
          roomId: true,
          title: true,
          startTime: true,
          endTime: true,
        },
      }),
    ]);

    return rooms.map((room) => {
      const conflict = appointments.find(
        (appt) =>
          appt.roomId === room.id &&
          overlaps(startTime, endTime, appt.startTime, appt.endTime),
      );
      return {
        ...room,
        available: !conflict,
        conflictingAppointmentId: conflict?.id ?? null,
      };
    });
  }

  async personAvailability(
    organizationId: string,
    input: {
      kolId?: string;
      userId?: string;
      startTime: string;
      endTime: string;
      excludeAppointmentId?: string;
    },
  ) {
    const startTime = new Date(input.startTime);
    const endTime = new Date(input.endTime);
    if (!(startTime < endTime)) {
      throw new BadRequestException('startTime must be before endTime');
    }
    if (!input.kolId && !input.userId) {
      throw new BadRequestException('kolId or userId is required');
    }

    const orFilters: Prisma.AppointmentWhereInput[] = [];
    if (input.kolId) {
      orFilters.push({ kolId: input.kolId });
      orFilters.push({ attendees: { some: { kolId: input.kolId } } });
    }
    if (input.userId) {
      orFilters.push({ createdById: input.userId });
      orFilters.push({ attendees: { some: { userId: input.userId } } });
    }

    const candidates = await this.prisma.appointment.findMany({
      where: {
        organizationId,
        status: { not: AppointmentStatus.cancelled },
        id: input.excludeAppointmentId
          ? { not: input.excludeAppointmentId }
          : undefined,
        OR: orFilters,
      },
      select: { id: true, title: true, startTime: true, endTime: true },
    });

    const conflict = candidates.find((appt) =>
      overlaps(startTime, endTime, appt.startTime, appt.endTime),
    );

    return {
      available: !conflict,
      conflictingAppointmentId: conflict?.id ?? null,
      conflictingTitle: conflict?.title ?? null,
    };
  }
}
