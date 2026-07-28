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
import { toRoomPublic } from '../common/serializers';
import { Roles } from '../orgs/decorators/roles.decorator';
import { OrgMemberGuard } from '../orgs/guards/org-member.guard';
import { CreateRoomDto, UpdateRoomDto } from './dto/rooms.dto';
import { RoomsService } from './rooms.service';

@Controller('organizations/:orgId')
@UseGuards(AuthGuard, OrgMemberGuard)
export class RoomsController {
  constructor(
    private readonly rooms: RoomsService,
    private readonly auth: AuthService,
  ) {}

  @Get('congresses/:congressId/rooms')
  async list(
    @Param('orgId') orgId: string,
    @Param('congressId') congressId: string,
  ) {
    const rooms = await this.rooms.list(orgId, congressId);
    return { rooms: rooms.map(toRoomPublic) };
  }

  @Get('congresses/:congressId/rooms/availability')
  async availability(
    @Param('orgId') orgId: string,
    @Param('congressId') congressId: string,
    @Query('startTime') startTime: string,
    @Query('endTime') endTime: string,
    @Query('excludeAppointmentId') excludeAppointmentId?: string,
  ) {
    const rooms = await this.rooms.availability(
      orgId,
      congressId,
      startTime,
      endTime,
      excludeAppointmentId,
    );
    return { rooms: rooms.map(toRoomPublic) };
  }

  @Get('availability/person')
  async personAvailability(
    @Param('orgId') orgId: string,
    @Query('startTime') startTime: string,
    @Query('endTime') endTime: string,
    @Query('kolId') kolId?: string,
    @Query('userId') userId?: string,
    @Query('excludeAppointmentId') excludeAppointmentId?: string,
  ) {
    return this.rooms.personAvailability(orgId, {
      kolId,
      userId,
      startTime,
      endTime,
      excludeAppointmentId,
    });
  }

  @Post('congresses/:congressId/rooms')
  @Roles('org_admin', 'rep')
  async create(
    @Param('orgId') orgId: string,
    @Param('congressId') congressId: string,
    @CurrentUser() user: { id: string },
    @Body() dto: CreateRoomDto,
    @Req() req: AuthRequest,
  ) {
    const room = await this.rooms.create(
      orgId,
      congressId,
      user.id,
      dto,
      this.auth.clientIp(req),
    );
    return { room: toRoomPublic(room) };
  }

  @Patch('rooms/:roomId')
  @Roles('org_admin', 'rep')
  async update(
    @Param('orgId') orgId: string,
    @Param('roomId') roomId: string,
    @CurrentUser() user: { id: string },
    @Body() dto: UpdateRoomDto,
    @Req() req: AuthRequest,
  ) {
    const room = await this.rooms.update(
      orgId,
      roomId,
      user.id,
      dto,
      this.auth.clientIp(req),
    );
    return { room: toRoomPublic(room) };
  }

  @Delete('rooms/:roomId')
  @Roles('org_admin', 'rep')
  async remove(
    @Param('orgId') orgId: string,
    @Param('roomId') roomId: string,
    @CurrentUser() user: { id: string },
    @Req() req: AuthRequest,
  ) {
    return this.rooms.remove(orgId, roomId, user.id, this.auth.clientIp(req));
  }
}
