import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from '../auth/auth.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthGuard, type AuthRequest } from '../auth/guards/auth.guard';
import { toAppointmentPublic } from '../common/serializers';
import { Roles } from '../orgs/decorators/roles.decorator';
import { OrgMemberGuard } from '../orgs/guards/org-member.guard';
import { AppointmentsService } from './appointments.service';
import {
  AddAttendeeDto,
  CreateAppointmentDto,
  UpdateAppointmentDto,
} from './dto/appointments.dto';

@Controller('organizations/:orgId/appointments')
@UseGuards(AuthGuard, OrgMemberGuard)
export class AppointmentsController {
  constructor(
    private readonly appointments: AppointmentsService,
    private readonly auth: AuthService,
  ) {}

  @Post()
  @Roles('org_admin', 'rep')
  async create(
    @Param('orgId') orgId: string,
    @CurrentUser() user: { id: string },
    @Body() dto: CreateAppointmentDto,
    @Req() req: AuthRequest,
  ) {
    const appointment = await this.appointments.create(
      orgId,
      user.id,
      dto,
      this.auth.clientIp(req),
    );
    return { appointment: toAppointmentPublic(appointment) };
  }

  @Get()
  async list(
    @Param('orgId') orgId: string,
    @Query('congressId') congressId?: string,
    @Query('kolId') kolId?: string,
  ) {
    const appointments = await this.appointments.list(orgId, {
      congressId,
      kolId,
    });
    return { appointments: appointments.map(toAppointmentPublic) };
  }

  @Get('by-code/:code')
  async byCode(@Param('orgId') orgId: string, @Param('code') code: string) {
    const appointment = await this.appointments.getByCheckInCode(orgId, code);
    return { appointment: toAppointmentPublic(appointment) };
  }

  @Get(':appointmentId')
  async get(
    @Param('orgId') orgId: string,
    @Param('appointmentId') appointmentId: string,
  ) {
    const appointment = await this.appointments.get(orgId, appointmentId);
    return { appointment: toAppointmentPublic(appointment) };
  }

  @Patch(':appointmentId')
  @Roles('org_admin', 'rep')
  async update(
    @Param('orgId') orgId: string,
    @Param('appointmentId') appointmentId: string,
    @CurrentUser() user: { id: string },
    @Body() dto: UpdateAppointmentDto,
    @Req() req: AuthRequest,
  ) {
    const appointment = await this.appointments.update(
      orgId,
      appointmentId,
      user.id,
      dto,
      this.auth.clientIp(req),
    );
    return { appointment: toAppointmentPublic(appointment) };
  }

  @Post(':appointmentId/attendees')
  @Roles('org_admin', 'rep')
  async addAttendee(
    @Param('orgId') orgId: string,
    @Param('appointmentId') appointmentId: string,
    @CurrentUser() user: { id: string },
    @Body() dto: AddAttendeeDto,
    @Req() req: AuthRequest,
  ) {
    const appointment = await this.appointments.addAttendee(
      orgId,
      appointmentId,
      user.id,
      dto,
      this.auth.clientIp(req),
    );
    return { appointment: toAppointmentPublic(appointment) };
  }

  @Delete(':appointmentId/attendees/:attendeeId')
  @Roles('org_admin', 'rep')
  async removeAttendee(
    @Param('orgId') orgId: string,
    @Param('appointmentId') appointmentId: string,
    @Param('attendeeId') attendeeId: string,
    @CurrentUser() user: { id: string },
    @Req() req: AuthRequest,
  ) {
    const appointment = await this.appointments.removeAttendee(
      orgId,
      appointmentId,
      attendeeId,
      user.id,
      this.auth.clientIp(req),
    );
    return { appointment: toAppointmentPublic(appointment) };
  }
}
