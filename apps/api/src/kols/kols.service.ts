import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { parseCsv } from '../common/utils';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class KolsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  create(
    organizationId: string,
    userId: string,
    data: {
      name: string;
      email?: string;
      institution?: string;
      therapeuticArea?: string;
      region?: string;
      notes?: string;
    },
    ipAddress?: string,
  ) {
    return this.prisma.$transaction(async () => {
      const kol = await this.prisma.kol.create({
        data: {
          organizationId,
          name: data.name.trim(),
          email: data.email?.trim().toLowerCase() || null,
          institution: data.institution?.trim() || null,
          therapeuticArea: data.therapeuticArea?.trim() || null,
          region: data.region?.trim() || null,
          notes: data.notes?.trim() || null,
        },
      });

      await this.audit.log({
        action: 'kol.create',
        userId,
        organizationId,
        entityType: 'kol',
        entityId: kol.id,
        ipAddress,
      });

      return kol;
    });
  }

  list(organizationId: string) {
    return this.prisma.kol.findMany({
      where: { organizationId },
      orderBy: { name: 'asc' },
    });
  }

  async get(organizationId: string, kolId: string) {
    const kol = await this.prisma.kol.findFirst({
      where: { id: kolId, organizationId },
    });
    if (!kol) {
      throw new NotFoundException('KOL not found');
    }
    return kol;
  }

  async update(
    organizationId: string,
    kolId: string,
    userId: string,
    data: {
      name?: string;
      email?: string | null;
      institution?: string | null;
      therapeuticArea?: string | null;
      region?: string | null;
      notes?: string | null;
    },
    ipAddress?: string,
  ) {
    await this.get(organizationId, kolId);

    const patch: Prisma.KolUpdateInput = {};
    if (data.name !== undefined) patch.name = data.name.trim();
    if (data.email !== undefined) {
      patch.email = data.email?.trim().toLowerCase() || null;
    }
    if (data.institution !== undefined) {
      patch.institution = data.institution?.trim() || null;
    }
    if (data.therapeuticArea !== undefined) {
      patch.therapeuticArea = data.therapeuticArea?.trim() || null;
    }
    if (data.region !== undefined) patch.region = data.region?.trim() || null;
    if (data.notes !== undefined) patch.notes = data.notes?.trim() || null;

    const kol = await this.prisma.kol.update({
      where: { id: kolId },
      data: patch,
    });

    await this.audit.log({
      action: 'kol.update',
      userId,
      organizationId,
      entityType: 'kol',
      entityId: kol.id,
      ipAddress,
    });

    return kol;
  }

  async remove(
    organizationId: string,
    kolId: string,
    userId: string,
    ipAddress?: string,
  ) {
    await this.get(organizationId, kolId);
    await this.prisma.kol.delete({ where: { id: kolId } });
    await this.audit.log({
      action: 'kol.delete',
      userId,
      organizationId,
      entityType: 'kol',
      entityId: kolId,
      ipAddress,
    });
    return { ok: true };
  }

  async importCsv(
    organizationId: string,
    userId: string,
    csv: string,
    ipAddress?: string,
  ) {
    const rows = parseCsv(csv);
    const created = [];
    const skipped: { row: number; reason: string }[] = [];

    for (let i = 0; i < rows.length; i += 1) {
      const row = rows[i];
      const name = row.name || row.fullname || '';
      if (!name.trim()) {
        skipped.push({ row: i + 2, reason: 'missing name' });
        continue;
      }

      const email = (row.email || '').trim().toLowerCase() || null;
      if (email) {
        const existing = await this.prisma.kol.findFirst({
          where: { organizationId, email },
        });
        if (existing) {
          skipped.push({ row: i + 2, reason: 'duplicate email' });
          continue;
        }
      }

      const kol = await this.prisma.kol.create({
        data: {
          organizationId,
          name: name.trim(),
          email,
          institution: (row.institution || '').trim() || null,
          therapeuticArea:
            (row.therapeuticarea || row.therapeutic_area || '').trim() || null,
          region: (row.region || '').trim() || null,
          notes: (row.notes || '').trim() || null,
        },
      });
      created.push(kol);
    }

    await this.audit.log({
      action: 'kol.import',
      userId,
      organizationId,
      entityType: 'kol',
      ipAddress,
      metadata: { created: created.length, skipped: skipped.length },
    });

    return { created, skipped };
  }
}
