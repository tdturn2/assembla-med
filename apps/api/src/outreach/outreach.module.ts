import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { OrgMemberGuard } from '../orgs/guards/org-member.guard';
import { OutreachController } from './outreach.controller';
import { OutreachService } from './outreach.service';
import { PublicInvitationsController } from './public-invitations.controller';

@Module({
  imports: [AuthModule],
  controllers: [OutreachController, PublicInvitationsController],
  providers: [OutreachService, OrgMemberGuard],
  exports: [OutreachService],
})
export class OutreachModule {}
