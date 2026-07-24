import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { PrismaModule } from '../prisma/prisma.module';
import { IntegrationPushService } from './integration-push.service';
import { MockDestinationAdapter } from './mock-destination.adapter';

@Module({
  imports: [PrismaModule, AuditModule],
  providers: [MockDestinationAdapter, IntegrationPushService],
  exports: [IntegrationPushService, MockDestinationAdapter],
})
export class IntegrationsModule {}
