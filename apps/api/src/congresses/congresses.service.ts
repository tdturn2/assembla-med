import { Injectable, NotFoundException } from '@nestjs/common';
import { CongressStatus, Prisma } from '@prisma/client';
import type { DisclosureItemPublic } from '@assembla-med/shared';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';

type GuidePatch = {
  agendaMarkdown?: string | null;
  floorPlanUrl?: string | null;
  boothNotes?: string | null;
  boothScheduleMarkdown?: string | null;
  exhibitHallHoursMarkdown?: string | null;
  staffDirectoryMarkdown?: string | null;
  logisticsMarkdown?: string | null;
  contactsMarkdown?: string | null;
  lodgingMarkdown?: string | null;
  safetyMarkdown?: string | null;
  disclosuresMarkdown?: string | null;
  disclosureItems?: DisclosureItemPublic[] | null;
  icwDinnersMarkdown?: string | null;
  icwReceptionMarkdown?: string | null;
  icwAdBoardsMarkdown?: string | null;
  icwWorkRoomMarkdown?: string | null;
  icwMeetingRoomsMarkdown?: string | null;
};

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
      cventId?: string;
      companyContactName?: string;
      companyContactEmail?: string;
      websiteUrl?: string;
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
          cventId: data.cventId?.trim() || null,
          companyContactName: data.companyContactName?.trim() || null,
          companyContactEmail: data.companyContactEmail?.trim() || null,
          websiteUrl: data.websiteUrl?.trim() || null,
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
      cventId?: string | null;
      companyContactName?: string | null;
      companyContactEmail?: string | null;
      websiteUrl?: string | null;
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
    if (data.cventId !== undefined) {
      patch.cventId = data.cventId?.trim() || null;
    }
    if (data.companyContactName !== undefined) {
      patch.companyContactName = data.companyContactName?.trim() || null;
    }
    if (data.companyContactEmail !== undefined) {
      patch.companyContactEmail = data.companyContactEmail?.trim() || null;
    }
    if (data.websiteUrl !== undefined) {
      patch.websiteUrl = data.websiteUrl?.trim() || null;
    }
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

    const [
      appointments,
      checkIns,
      activeCheckIns,
      byStatus,
      completed,
      noShow,
      cancelled,
    ] = await Promise.all([
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
      this.prisma.appointment.groupBy({
        by: ['status'],
        where: { organizationId, congressId },
        _count: { _all: true },
      }),
      this.prisma.appointment.count({
        where: { organizationId, congressId, status: 'completed' },
      }),
      this.prisma.appointment.count({
        where: { organizationId, congressId, status: 'no_show' },
      }),
      this.prisma.appointment.count({
        where: { organizationId, congressId, status: 'cancelled' },
      }),
    ]);

    const statusCounts = Object.fromEntries(
      byStatus.map((row) => [row.status, row._count._all]),
    );

    return {
      congressId,
      appointments,
      checkIns,
      activeCheckIns,
      completed,
      noShow,
      cancelled,
      statusCounts,
      attendanceRate:
        appointments > 0
          ? Math.round((activeCheckIns / appointments) * 100)
          : null,
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
    data: GuidePatch,
    ipAddress?: string,
  ) {
    await this.get(organizationId, congressId);

    const normalize = (value?: string | null) => {
      if (value === undefined) return undefined;
      if (value === null) return null;
      const trimmed = value.trim();
      return trimmed.length ? trimmed : null;
    };

    const normalizeItems = (items?: DisclosureItemPublic[] | null) => {
      if (items === undefined) return undefined;
      if (items === null) return [];
      return items
        .map((item) => ({
          title: item.title.trim(),
          url: item.url?.trim() || null,
          description: item.description?.trim() || null,
        }))
        .filter((item) => item.title.length > 0);
    };

    const stringFields = [
      'agendaMarkdown',
      'floorPlanUrl',
      'boothNotes',
      'boothScheduleMarkdown',
      'exhibitHallHoursMarkdown',
      'staffDirectoryMarkdown',
      'logisticsMarkdown',
      'contactsMarkdown',
      'lodgingMarkdown',
      'safetyMarkdown',
      'disclosuresMarkdown',
      'icwDinnersMarkdown',
      'icwReceptionMarkdown',
      'icwAdBoardsMarkdown',
      'icwWorkRoomMarkdown',
      'icwMeetingRoomsMarkdown',
    ] as const;

    const createData: Prisma.CongressGuideCreateInput = {
      organization: { connect: { id: organizationId } },
      congress: { connect: { id: congressId } },
    };
    const updateData: Prisma.CongressGuideUpdateInput = {};

    for (const field of stringFields) {
      if (data[field] !== undefined) {
        const value = normalize(data[field]);
        createData[field] = value ?? null;
        updateData[field] = value;
      }
    }

    if (data.disclosureItems !== undefined) {
      const items = normalizeItems(data.disclosureItems) ?? [];
      createData.disclosureItems = items;
      updateData.disclosureItems = items;
    }

    const guide = await this.prisma.congressGuide.upsert({
      where: { congressId },
      create: createData,
      update: updateData,
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
