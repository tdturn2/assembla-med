import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MembershipRole } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class OrgsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async create(userId: string, name: string, ipAddress?: string) {
    const organization = await this.prisma.$transaction(async (tx) => {
      const org = await tx.organization.create({
        data: { name: name.trim() },
      });

      await tx.membership.create({
        data: {
          userId,
          organizationId: org.id,
          role: MembershipRole.org_admin,
        },
      });

      return org;
    });

    await this.audit.log({
      action: 'org.create',
      userId,
      organizationId: organization.id,
      entityType: 'organization',
      entityId: organization.id,
      ipAddress,
      metadata: { name: organization.name },
    });

    return organization;
  }

  listForUser(userId: string) {
    return this.prisma.organization.findMany({
      where: {
        memberships: { some: { userId } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async getForMember(organizationId: string, userId: string) {
    const membership = await this.prisma.membership.findUnique({
      where: {
        userId_organizationId: { userId, organizationId },
      },
      include: { organization: true },
    });

    if (!membership) {
      throw new ForbiddenException('Not a member of this organization');
    }

    return membership.organization;
  }

  listMembers(organizationId: string) {
    return this.prisma.membership.findMany({
      where: { organizationId },
      include: { user: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  async addMember(
    organizationId: string,
    actorUserId: string,
    email: string,
    role: MembershipRole = MembershipRole.rep,
    ipAddress?: string,
  ) {
    const normalized = email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({
      where: { email: normalized },
    });

    if (!user) {
      throw new NotFoundException('User not found for that email');
    }

    try {
      const membership = await this.prisma.membership.create({
        data: {
          organizationId,
          userId: user.id,
          role,
        },
        include: { user: true },
      });

      await this.audit.log({
        action: 'org.member.add',
        userId: actorUserId,
        organizationId,
        entityType: 'membership',
        entityId: membership.id,
        ipAddress,
        metadata: { role, email: normalized },
      });

      return membership;
    } catch {
      throw new ConflictException('User is already a member');
    }
  }

  async updateMemberRole(
    organizationId: string,
    membershipId: string,
    actorUserId: string,
    role: MembershipRole,
    ipAddress?: string,
  ) {
    const membership = await this.prisma.membership.findFirst({
      where: { id: membershipId, organizationId },
    });

    if (!membership) {
      throw new NotFoundException('Membership not found');
    }

    if (
      membership.role === MembershipRole.org_admin &&
      role !== MembershipRole.org_admin
    ) {
      const adminCount = await this.prisma.membership.count({
        where: { organizationId, role: MembershipRole.org_admin },
      });
      if (adminCount <= 1) {
        throw new ConflictException('Cannot demote the last org admin');
      }
    }

    const updated = await this.prisma.membership.update({
      where: { id: membership.id },
      data: { role },
      include: { user: true },
    });

    await this.audit.log({
      action: 'org.member.role_update',
      userId: actorUserId,
      organizationId,
      entityType: 'membership',
      entityId: membership.id,
      ipAddress,
      metadata: { role },
    });

    return updated;
  }

  async removeMember(
    organizationId: string,
    membershipId: string,
    actorUserId: string,
    ipAddress?: string,
  ) {
    const membership = await this.prisma.membership.findFirst({
      where: { id: membershipId, organizationId },
    });

    if (!membership) {
      throw new NotFoundException('Membership not found');
    }

    if (membership.role === MembershipRole.org_admin) {
      const adminCount = await this.prisma.membership.count({
        where: { organizationId, role: MembershipRole.org_admin },
      });
      if (adminCount <= 1) {
        throw new ConflictException('Cannot remove the last org admin');
      }
    }

    await this.prisma.membership.delete({ where: { id: membership.id } });

    await this.audit.log({
      action: 'org.member.remove',
      userId: actorUserId,
      organizationId,
      entityType: 'membership',
      entityId: membership.id,
      ipAddress,
    });

    return { ok: true };
  }
}
