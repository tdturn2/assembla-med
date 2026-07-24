import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { MembershipRole } from '@prisma/client';
import { AuthService } from '../auth/auth.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthGuard, type AuthRequest } from '../auth/guards/auth.guard';
import {
  toMembershipPublic,
  toOrganizationPublic,
} from '../common/serializers';
import { Roles } from './decorators/roles.decorator';
import {
  AddMemberDto,
  CreateOrganizationDto,
  UpdateMemberRoleDto,
} from './dto/orgs.dto';
import { OrgMemberGuard } from './guards/org-member.guard';
import { OrgsService } from './orgs.service';

@Controller('organizations')
@UseGuards(AuthGuard)
export class OrgsController {
  constructor(
    private readonly orgs: OrgsService,
    private readonly auth: AuthService,
  ) {}

  @Post()
  async create(
    @CurrentUser() user: { id: string },
    @Body() dto: CreateOrganizationDto,
    @Req() req: AuthRequest,
  ) {
    const org = await this.orgs.create(
      user.id,
      dto.name,
      this.auth.clientIp(req),
    );
    return { organization: toOrganizationPublic(org) };
  }

  @Get()
  async list(@CurrentUser() user: { id: string }) {
    const organizations = await this.orgs.listForUser(user.id);
    return { organizations: organizations.map(toOrganizationPublic) };
  }

  @Get(':orgId')
  @UseGuards(OrgMemberGuard)
  async get(
    @Param('orgId') orgId: string,
    @CurrentUser() user: { id: string },
  ) {
    const org = await this.orgs.getForMember(orgId, user.id);
    return { organization: toOrganizationPublic(org) };
  }

  @Get(':orgId/members')
  @UseGuards(OrgMemberGuard)
  async listMembers(@Param('orgId') orgId: string) {
    const members = await this.orgs.listMembers(orgId);
    return { members: members.map(toMembershipPublic) };
  }

  @Post(':orgId/members')
  @UseGuards(OrgMemberGuard)
  @Roles('org_admin')
  async addMember(
    @Param('orgId') orgId: string,
    @CurrentUser() user: { id: string },
    @Body() dto: AddMemberDto,
    @Req() req: AuthRequest,
  ) {
    const membership = await this.orgs.addMember(
      orgId,
      user.id,
      dto.email,
      dto.role ?? MembershipRole.rep,
      this.auth.clientIp(req),
    );
    return { membership: toMembershipPublic(membership) };
  }

  @Patch(':orgId/members/:membershipId')
  @UseGuards(OrgMemberGuard)
  @Roles('org_admin')
  async updateMemberRole(
    @Param('orgId') orgId: string,
    @Param('membershipId') membershipId: string,
    @CurrentUser() user: { id: string },
    @Body() dto: UpdateMemberRoleDto,
    @Req() req: AuthRequest,
  ) {
    const membership = await this.orgs.updateMemberRole(
      orgId,
      membershipId,
      user.id,
      dto.role,
      this.auth.clientIp(req),
    );
    return { membership: toMembershipPublic(membership) };
  }

  @Delete(':orgId/members/:membershipId')
  @UseGuards(OrgMemberGuard)
  @Roles('org_admin')
  async removeMember(
    @Param('orgId') orgId: string,
    @Param('membershipId') membershipId: string,
    @CurrentUser() user: { id: string },
    @Req() req: AuthRequest,
  ) {
    return this.orgs.removeMember(
      orgId,
      membershipId,
      user.id,
      this.auth.clientIp(req),
    );
  }
}
