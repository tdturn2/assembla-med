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
import { AuthService } from '../auth/auth.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthGuard, type AuthRequest } from '../auth/guards/auth.guard';
import { toKolPublic } from '../common/serializers';
import { Roles } from '../orgs/decorators/roles.decorator';
import { OrgMemberGuard } from '../orgs/guards/org-member.guard';
import { CreateKolDto, ImportKolsDto, UpdateKolDto } from './dto/kols.dto';
import { KolsService } from './kols.service';

@Controller('organizations/:orgId/kols')
@UseGuards(AuthGuard, OrgMemberGuard)
export class KolsController {
  constructor(
    private readonly kols: KolsService,
    private readonly auth: AuthService,
  ) {}

  @Post()
  @Roles('org_admin', 'rep')
  async create(
    @Param('orgId') orgId: string,
    @CurrentUser() user: { id: string },
    @Body() dto: CreateKolDto,
    @Req() req: AuthRequest,
  ) {
    const kol = await this.kols.create(
      orgId,
      user.id,
      dto,
      this.auth.clientIp(req),
    );
    return { kol: toKolPublic(kol) };
  }

  @Post('import')
  @Roles('org_admin', 'rep')
  async importCsv(
    @Param('orgId') orgId: string,
    @CurrentUser() user: { id: string },
    @Body() dto: ImportKolsDto,
    @Req() req: AuthRequest,
  ) {
    const result = await this.kols.importCsv(
      orgId,
      user.id,
      dto.csv,
      this.auth.clientIp(req),
    );
    return {
      created: result.created.map(toKolPublic),
      skipped: result.skipped,
    };
  }

  @Get()
  async list(@Param('orgId') orgId: string) {
    const kols = await this.kols.list(orgId);
    return { kols: kols.map(toKolPublic) };
  }

  @Get(':kolId')
  async get(@Param('orgId') orgId: string, @Param('kolId') kolId: string) {
    const kol = await this.kols.get(orgId, kolId);
    return { kol: toKolPublic(kol) };
  }

  @Patch(':kolId')
  @Roles('org_admin', 'rep')
  async update(
    @Param('orgId') orgId: string,
    @Param('kolId') kolId: string,
    @CurrentUser() user: { id: string },
    @Body() dto: UpdateKolDto,
    @Req() req: AuthRequest,
  ) {
    const kol = await this.kols.update(
      orgId,
      kolId,
      user.id,
      dto,
      this.auth.clientIp(req),
    );
    return { kol: toKolPublic(kol) };
  }

  @Delete(':kolId')
  @Roles('org_admin')
  async remove(
    @Param('orgId') orgId: string,
    @Param('kolId') kolId: string,
    @CurrentUser() user: { id: string },
    @Req() req: AuthRequest,
  ) {
    return this.kols.remove(orgId, kolId, user.id, this.auth.clientIp(req));
  }
}
