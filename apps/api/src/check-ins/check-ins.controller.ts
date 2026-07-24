import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { AuthService } from '../auth/auth.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthGuard, type AuthRequest } from '../auth/guards/auth.guard';
import { toCheckInPublic } from '../common/serializers';
import { IntegrationPushService } from '../integrations/integration-push.service';
import { ReplayIntegrationDto } from '../integrations/dto/replay.dto';
import { Roles } from '../orgs/decorators/roles.decorator';
import { OrgMemberGuard } from '../orgs/guards/org-member.guard';
import { CheckInsService } from './check-ins.service';
import { CreateCheckInDto, VoidCheckInDto } from './dto/check-ins.dto';

@Controller('organizations/:orgId')
@UseGuards(AuthGuard, OrgMemberGuard)
export class CheckInsController {
  constructor(
    private readonly checkIns: CheckInsService,
    private readonly integrationPush: IntegrationPushService,
    private readonly auth: AuthService,
  ) {}

  @Post('check-ins')
  @Roles('org_admin', 'rep')
  async create(
    @Param('orgId') orgId: string,
    @CurrentUser() user: { id: string },
    @Body() dto: CreateCheckInDto,
    @Req() req: AuthRequest,
  ) {
    const checkIn = await this.checkIns.create(
      orgId,
      user.id,
      dto,
      this.auth.clientIp(req),
    );
    return { checkIn: toCheckInPublic(checkIn) };
  }

  @Get('appointments/:appointmentId/check-ins')
  async listForAppointment(
    @Param('orgId') orgId: string,
    @Param('appointmentId') appointmentId: string,
  ) {
    const checkIns = await this.checkIns.listForAppointment(
      orgId,
      appointmentId,
    );
    return { checkIns: checkIns.map(toCheckInPublic) };
  }

  @Get('check-ins/:checkInId')
  async get(
    @Param('orgId') orgId: string,
    @Param('checkInId') checkInId: string,
  ) {
    const checkIn = await this.checkIns.get(orgId, checkInId);
    return { checkIn: toCheckInPublic(checkIn) };
  }

  @Post('check-ins/:checkInId/void')
  @Roles('org_admin', 'rep')
  async voidCheckIn(
    @Param('orgId') orgId: string,
    @Param('checkInId') checkInId: string,
    @CurrentUser() user: { id: string },
    @Body() dto: VoidCheckInDto,
    @Req() req: AuthRequest,
  ) {
    const checkIn = await this.checkIns.voidCheckIn(
      orgId,
      checkInId,
      user.id,
      dto.reason,
      this.auth.clientIp(req),
    );
    return { checkIn: toCheckInPublic(checkIn) };
  }

  @Post('check-ins/:checkInId/integration/replay')
  @Roles('org_admin', 'rep')
  async replayIntegration(
    @Param('orgId') orgId: string,
    @Param('checkInId') checkInId: string,
    @CurrentUser() user: { id: string },
    @Body() dto: ReplayIntegrationDto,
    @Req() req: AuthRequest,
  ) {
    const checkIn = await this.integrationPush.pushCheckIn(
      orgId,
      checkInId,
      user.id,
      {
        forceFail: dto.forceFail,
        ipAddress: this.auth.clientIp(req),
      },
    );
    return { checkIn: toCheckInPublic(checkIn) };
  }

  @Get('congresses/:congressId/export/check-ins')
  async exportCheckIns(
    @Param('orgId') orgId: string,
    @Param('congressId') congressId: string,
    @Res() res: Response,
  ) {
    const result = await this.checkIns.exportCsv(orgId, congressId);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${result.filename}"`,
    );
    res.send(result.csv);
  }

  @Get('congresses/:congressId/export/check-ins-cvent')
  async exportCheckInsCvent(
    @Param('orgId') orgId: string,
    @Param('congressId') congressId: string,
    @Res() res: Response,
  ) {
    const result = await this.checkIns.exportCventCsv(orgId, congressId);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${result.filename}"`,
    );
    res.send(result.csv);
  }
}
