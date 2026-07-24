import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Membership, MembershipRole } from '@prisma/client';
import type { AuthRequest } from '../../auth/guards/auth.guard';
import { PrismaService } from '../../prisma/prisma.service';
import { ROLES_KEY } from '../decorators/roles.decorator';

export type OrgRequest = AuthRequest & {
  membership?: Membership;
  organizationId?: string;
};

@Injectable()
export class OrgMemberGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<OrgRequest>();
    const userId = req.user?.id;
    const rawOrgId = req.params.orgId;
    const organizationId = Array.isArray(rawOrgId) ? rawOrgId[0] : rawOrgId;

    if (!userId) {
      throw new ForbiddenException('Authentication required');
    }

    if (!organizationId) {
      throw new NotFoundException('Organization not found');
    }

    const membership = await this.prisma.membership.findUnique({
      where: {
        userId_organizationId: {
          userId,
          organizationId,
        },
      },
    });

    if (!membership) {
      throw new ForbiddenException('Not a member of this organization');
    }

    const requiredRoles = this.reflector.getAllAndOverride<MembershipRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (requiredRoles?.length && !requiredRoles.includes(membership.role)) {
      throw new ForbiddenException('Insufficient organization role');
    }

    req.membership = membership;
    req.organizationId = organizationId;
    return true;
  }
}
