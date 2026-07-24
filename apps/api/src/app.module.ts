import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AppointmentsModule } from './appointments/appointments.module';
import { AuditModule } from './audit/audit.module';
import { AuthModule } from './auth/auth.module';
import { CheckInsModule } from './check-ins/check-ins.module';
import { CongressesModule } from './congresses/congresses.module';
import { IntegrationsModule } from './integrations/integrations.module';
import { KolsModule } from './kols/kols.module';
import { MailModule } from './mail/mail.module';
import { OrgsModule } from './orgs/orgs.module';
import { OutreachModule } from './outreach/outreach.module';
import { PrismaModule } from './prisma/prisma.module';
import { StorageModule } from './file-store/storage.module';

@Module({
  imports: [
    PrismaModule,
    StorageModule,
    MailModule,
    AuditModule,
    AuthModule,
    OrgsModule,
    CongressesModule,
    KolsModule,
    AppointmentsModule,
    CheckInsModule,
    OutreachModule,
    IntegrationsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

