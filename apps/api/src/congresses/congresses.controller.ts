import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from '../auth/auth.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthGuard, type AuthRequest } from '../auth/guards/auth.guard';
import {
  toCongressGuidePublic,
  toCongressPublic,
} from '../common/serializers';
import { Roles } from '../orgs/decorators/roles.decorator';
import { OrgMemberGuard } from '../orgs/guards/org-member.guard';
import { CongressesService } from './congresses.service';
import {
  CreateCongressDto,
  UpdateCongressDto,
  UpdateCongressGuideDto,
} from './dto/congresses.dto';

@Controller('organizations/:orgId/congresses')
@UseGuards(AuthGuard, OrgMemberGuard)
export class CongressesController {
  constructor(
    private readonly congresses: CongressesService,
    private readonly auth: AuthService,
  ) {}

  @Post()
  @Roles('org_admin', 'rep')
  async create(
    @Param('orgId') orgId: string,
    @CurrentUser() user: { id: string },
    @Body() dto: CreateCongressDto,
    @Req() req: AuthRequest,
  ) {
    const congress = await this.congresses.create(
      orgId,
      user.id,
      dto,
      this.auth.clientIp(req),
    );
    return { congress: toCongressPublic(congress) };
  }

  @Get()
  async list(@Param('orgId') orgId: string) {
    const congresses = await this.congresses.list(orgId);
    return { congresses: congresses.map(toCongressPublic) };
  }

  @Get(':congressId')
  async get(
    @Param('orgId') orgId: string,
    @Param('congressId') congressId: string,
  ) {
    const congress = await this.congresses.get(orgId, congressId);
    return { congress: toCongressPublic(congress) };
  }

  @Get(':congressId/summary')
  async summary(
    @Param('orgId') orgId: string,
    @Param('congressId') congressId: string,
  ) {
    return this.congresses.summary(orgId, congressId);
  }

  @Get(':congressId/guide')
  async getGuide(
    @Param('orgId') orgId: string,
    @Param('congressId') congressId: string,
  ) {
    const guide = await this.congresses.getOrCreateGuide(orgId, congressId);
    return { guide: toCongressGuidePublic(guide) };
  }

  @Patch(':congressId/guide')
  @Roles('org_admin', 'rep')
  async updateGuide(
    @Param('orgId') orgId: string,
    @Param('congressId') congressId: string,
    @CurrentUser() user: { id: string },
    @Body() dto: UpdateCongressGuideDto,
    @Req() req: AuthRequest,
  ) {
    const guide = await this.congresses.updateGuide(
      orgId,
      congressId,
      user.id,
      dto,
      this.auth.clientIp(req),
    );
    return { guide: toCongressGuidePublic(guide) };
  }

  @Patch(':congressId')
  @Roles('org_admin', 'rep')
  async update(
    @Param('orgId') orgId: string,
    @Param('congressId') congressId: string,
    @CurrentUser() user: { id: string },
    @Body() dto: UpdateCongressDto,
    @Req() req: AuthRequest,
  ) {
    const congress = await this.congresses.update(
      orgId,
      congressId,
      user.id,
      dto,
      this.auth.clientIp(req),
    );
    return { congress: toCongressPublic(congress) };
  }
}
