import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { OrgMemberGuard } from './guards/org-member.guard';
import { OrgsController } from './orgs.controller';
import { OrgsService } from './orgs.service';

@Module({
  imports: [AuthModule],
  controllers: [OrgsController],
  providers: [OrgsService, OrgMemberGuard],
  exports: [OrgsService],
})
export class OrgsModule {}
