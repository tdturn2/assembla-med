import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { OrgMemberGuard } from '../orgs/guards/org-member.guard';
import { KolsController } from './kols.controller';
import { KolsService } from './kols.service';

@Module({
  imports: [AuthModule],
  controllers: [KolsController],
  providers: [KolsService, OrgMemberGuard],
  exports: [KolsService],
})
export class KolsModule {}
