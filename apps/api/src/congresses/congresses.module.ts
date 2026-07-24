import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { OrgMemberGuard } from '../orgs/guards/org-member.guard';
import { CongressesController } from './congresses.controller';
import { CongressesService } from './congresses.service';

@Module({
  imports: [AuthModule],
  controllers: [CongressesController],
  providers: [CongressesService, OrgMemberGuard],
  exports: [CongressesService],
})
export class CongressesModule {}
