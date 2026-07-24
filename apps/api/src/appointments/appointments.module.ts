import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { OrgMemberGuard } from '../orgs/guards/org-member.guard';
import { AppointmentsController } from './appointments.controller';
import { AppointmentsService } from './appointments.service';

@Module({
  imports: [AuthModule],
  controllers: [AppointmentsController],
  providers: [AppointmentsService, OrgMemberGuard],
  exports: [AppointmentsService],
})
export class AppointmentsModule {}
