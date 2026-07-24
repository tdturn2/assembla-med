import { Injectable, NotFoundException } from '@nestjs/common';
import { CongressStatus, Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CongressesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  create(
    organizationId: string,
    userId: string,
    data: {
      name: string;
      startDate?: string;
      endDate?: string;
      location?: string;
      status?: CongressStatus;
    },
    ipAddress?: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const congress = await tx.congress.create({
        data: {
          organizationId,
          name: data.name.trim(),
          startDate: data.startDate ? new Date(data.startDate) : null,
          endDate: data.endDate ? new Date(data.endDate) : null,
          location: data.location?.trim() || null,
          status: data.status ?? CongressStatus.planning,
        },
      });

      await this.audit.log({
        action: 'congress.create',
        userId,
        organizationId,
        entityType: 'congress',
        entityId: congress.id,
        ipAddress,
        metadata: { name: congress.name },
      });

      return congress;
    });
  }

  list(organizationId: string) {
    return this.prisma.congress.findMany({
      where: { organizationId },
      orderBy: [{ startDate: 'asc' }, { name: 'asc' }],
    });
  }

  async get(organizationId: string, congressId: string) {
    const congress = await this.prisma.congress.findFirst({
      where: { id: congressId, organizationId },
    });
    if (!congress) {
      throw new NotFoundException('Congress not found');
    }
    return congress;
  }

  async update(
    organizationId: string,
    congressId: string,
    userId: string,
    data: {
      name?: string;
      startDate?: string | null;
      endDate?: string | null;
      location?: string | null;
      status?: CongressStatus;
    },
    ipAddress?: string,
  ) {
    await this.get(organizationId, congressId);

    const patch: Prisma.CongressUpdateInput = {};
    if (data.name !== undefined) patch.name = data.name.trim();
    if (data.location !== undefined) {
      patch.location = data.location?.trim() || null;
    }
    if (data.status !== undefined) patch.status = data.status;
    if (data.startDate !== undefined) {
      patch.startDate = data.startDate ? new Date(data.startDate) : null;
    }
    if (data.endDate !== undefined) {
      patch.endDate = data.endDate ? new Date(data.endDate) : null;
    }

    const congress = await this.prisma.congress.update({
      where: { id: congressId },
      data: patch,
    });

    await this.audit.log({
      action: 'congress.update',
      userId,
      organizationId,
      entityType: 'congress',
      entityId: congress.id,
      ipAddress,
    });

    return congress;
  }

  async summary(organizationId: string, congressId: string) {
    await this.get(organizationId, congressId);

    const [appointments, checkIns, activeCheckIns] = await Promise.all([
      this.prisma.appointment.count({
        where: { organizationId, congressId, status: { not: 'cancelled' } },
      }),
      this.prisma.checkIn.count({
        where: { organizationId, appointment: { congressId } },
      }),
      this.prisma.checkIn.count({
        where: {
          organizationId,
          voidedAt: null,
          appointment: { congressId },
        },
      }),
    ]);

    return {
      congressId,
      appointments,
      checkIns,
      activeCheckIns,
    };
  }

  async getOrCreateGuide(organizationId: string, congressId: string) {
    await this.get(organizationId, congressId);
    const existing = await this.prisma.congressGuide.findUnique({
      where: { congressId },
    });
    if (existing) {
      return existing;
    }
    return this.prisma.congressGuide.create({
      data: { organizationId, congressId },
    });
  }

  async updateGuide(
    organizationId: string,
    congressId: string,
    userId: string,
    data: {
      agendaMarkdown?: string | null;
      floorPlanUrl?: string | null;
      boothNotes?: string | null;
      logisticsMarkdown?: string | null;
      contactsMarkdown?: string | null;
      lodgingMarkdown?: string | null;
      safetyMarkdown?: string | null;
      disclosuresMarkdown?: string | null;
    },
    ipAddress?: string,
  ) {
    await this.get(organizationId, congressId);

    const normalize = (value?: string | null) => {
      if (value === undefined) return undefined;
      if (value === null) return null;
      const trimmed = value.trim();
      return trimmed.length ? trimmed : null;
    };

    const guide = await this.prisma.congressGuide.upsert({
      where: { congressId },
      create: {
        organizationId,
        congressId,
        agendaMarkdown: normalize(data.agendaMarkdown) ?? null,
        floorPlanUrl: normalize(data.floorPlanUrl) ?? null,
        boothNotes: normalize(data.boothNotes) ?? null,
        logisticsMarkdown: normalize(data.logisticsMarkdown) ?? null,
        contactsMarkdown: normalize(data.contactsMarkdown) ?? null,
        lodgingMarkdown: normalize(data.lodgingMarkdown) ?? null,
        safetyMarkdown: normalize(data.safetyMarkdown) ?? null,
        disclosuresMarkdown: normalize(data.disclosuresMarkdown) ?? null,
      },
      update: {
        ...(data.agendaMarkdown !== undefined && {
          agendaMarkdown: normalize(data.agendaMarkdown),
        }),
        ...(data.floorPlanUrl !== undefined && {
          floorPlanUrl: normalize(data.floorPlanUrl),
        }),
        ...(data.boothNotes !== undefined && {
          boothNotes: normalize(data.boothNotes),
        }),
        ...(data.logisticsMarkdown !== undefined && {
          logisticsMarkdown: normalize(data.logisticsMarkdown),
        }),
        ...(data.contactsMarkdown !== undefined && {
          contactsMarkdown: normalize(data.contactsMarkdown),
        }),
        ...(data.lodgingMarkdown !== undefined && {
          lodgingMarkdown: normalize(data.lodgingMarkdown),
        }),
        ...(data.safetyMarkdown !== undefined && {
          safetyMarkdown: normalize(data.safetyMarkdown),
        }),
        ...(data.disclosuresMarkdown !== undefined && {
          disclosuresMarkdown: normalize(data.disclosuresMarkdown),
        }),
      },
    });

    await this.audit.log({
      action: 'congress.guide.update',
      userId,
      organizationId,
      entityType: 'congress_guide',
      entityId: guide.id,
      ipAddress,
      metadata: { congressId },
    });

    return guide;
  }
}
