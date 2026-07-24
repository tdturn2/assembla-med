import { Module } from '@nestjs/common';
import { AppointmentsModule } from '../appointments/appointments.module';
import { AuthModule } from '../auth/auth.module';
import { IntegrationsModule } from '../integrations/integrations.module';
import { OrgMemberGuard } from '../orgs/guards/org-member.guard';
import { CheckInsController } from './check-ins.controller';
import { CheckInsService } from './check-ins.service';

@Module({
  imports: [AuthModule, AppointmentsModule, IntegrationsModule],
  controllers: [CheckInsController],
  providers: [CheckInsService, OrgMemberGuard],
  exports: [CheckInsService],
})
export class CheckInsModule {}
