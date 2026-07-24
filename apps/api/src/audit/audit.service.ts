import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(input: {
    action: string;
    userId?: string | null;
    organizationId?: string | null;
    entityType?: string | null;
    entityId?: string | null;
    ipAddress?: string | null;
    metadata?: Prisma.InputJsonValue;
  }) {
    return this.prisma.auditEvent.create({
      data: {
        action: input.action,
        userId: input.userId ?? null,
        organizationId: input.organizationId ?? null,
        entityType: input.entityType ?? null,
        entityId: input.entityId ?? null,
        ipAddress: input.ipAddress ?? null,
        metadata: input.metadata,
      },
    });
  }
}
