import { Module } from '@nestjs/common';
import { AppointmentsModule } from '../appointments/appointments.module';
import { AuthModule } from '../auth/auth.module';
import { OrgMemberGuard } from '../orgs/guards/org-member.guard';
import { MeetingRequestsController } from './meeting-requests.controller';
import { MeetingRequestsService } from './meeting-requests.service';

@Module({
  imports: [AuthModule, AppointmentsModule],
  controllers: [MeetingRequestsController],
  providers: [MeetingRequestsService, OrgMemberGuard],
  exports: [MeetingRequestsService],
})
export class MeetingRequestsModule {}
