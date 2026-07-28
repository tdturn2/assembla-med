import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { MeetingRequestStatus } from '@prisma/client';
import { AuthService } from '../auth/auth.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthGuard, type AuthRequest } from '../auth/guards/auth.guard';
import {
  toAppointmentPublic,
  toMeetingRequestPublic,
} from '../common/serializers';
import { Roles } from '../orgs/decorators/roles.decorator';
import { OrgMemberGuard } from '../orgs/guards/org-member.guard';
import {
  CreateMeetingRequestDto,
  ScheduleMeetingRequestDto,
  UpdateMeetingRequestDto,
} from './dto/meeting-requests.dto';
import { MeetingRequestsService } from './meeting-requests.service';

@Controller('organizations/:orgId/meeting-requests')
@UseGuards(AuthGuard, OrgMemberGuard)
export class MeetingRequestsController {
  constructor(
    private readonly meetingRequests: MeetingRequestsService,
    private readonly auth: AuthService,
  ) {}

  @Get()
  async list(
    @Param('orgId') orgId: string,
    @Query('congressId') congressId?: string,
    @Query('status') status?: MeetingRequestStatus,
  ) {
    const requests = await this.meetingRequests.list(orgId, {
      congressId,
      status,
    });
    return { meetingRequests: requests.map(toMeetingRequestPublic) };
  }

  @Get(':requestId')
  async get(
    @Param('orgId') orgId: string,
    @Param('requestId') requestId: string,
  ) {
    const meetingRequest = await this.meetingRequests.get(orgId, requestId);
    return { meetingRequest: toMeetingRequestPublic(meetingRequest) };
  }

  @Post()
  @Roles('org_admin', 'rep')
  async create(
    @Param('orgId') orgId: string,
    @CurrentUser() user: { id: string },
    @Body() dto: CreateMeetingRequestDto,
    @Req() req: AuthRequest,
  ) {
    const meetingRequest = await this.meetingRequests.create(
      orgId,
      user.id,
      dto,
      this.auth.clientIp(req),
    );
    return { meetingRequest: toMeetingRequestPublic(meetingRequest) };
  }

  @Patch(':requestId')
  @Roles('org_admin', 'rep')
  async update(
    @Param('orgId') orgId: string,
    @Param('requestId') requestId: string,
    @CurrentUser() user: { id: string },
    @Body() dto: UpdateMeetingRequestDto,
    @Req() req: AuthRequest,
  ) {
    const meetingRequest = await this.meetingRequests.update(
      orgId,
      requestId,
      user.id,
      dto,
      this.auth.clientIp(req),
    );
    return { meetingRequest: toMeetingRequestPublic(meetingRequest) };
  }

  @Post(':requestId/schedule')
  @Roles('org_admin', 'rep')
  async schedule(
    @Param('orgId') orgId: string,
    @Param('requestId') requestId: string,
    @CurrentUser() user: { id: string },
    @Body() dto: ScheduleMeetingRequestDto,
    @Req() req: AuthRequest,
  ) {
    const result = await this.meetingRequests.schedule(
      orgId,
      requestId,
      user.id,
      dto,
      this.auth.clientIp(req),
    );
    return {
      meetingRequest: toMeetingRequestPublic(result.meetingRequest),
      appointment: toAppointmentPublic(result.appointment),
    };
  }
}
