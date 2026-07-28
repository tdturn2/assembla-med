import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { App } from 'supertest/types';
import type {
  CampaignPublic,
  CongressPublic,
  InvitationPublic,
  InvitationTemplatePublic,
  KolPublic,
  OrganizationPublic,
} from '@assembla-med/shared';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';

describe('Phase 2 outreach (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const suffix = Date.now();
  const email = `outreach-${suffix}@example.com`;
  const password = 'password123';

  beforeAll(async () => {
    process.env.MAILGUN_DRY_RUN = 'true';
    process.env.MAILGUN_TEST_TO = 'tdturn2@gmail.com';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email } });
    await app.close();
  });

  it('creates template/campaign, dry-runs send, accepts RSVP', async () => {
    const agent = request.agent(app.getHttpServer());
    await agent.post('/api/auth/register').send({ email, password });
    const orgRes = await agent
      .post('/api/organizations')
      .send({ name: `Outreach Org ${suffix}` });
    const org = (orgRes.body as { organization: OrganizationPublic })
      .organization;

    const congressRes = await agent
      .post(`/api/organizations/${org.id}/congresses`)
      .send({ name: 'Outreach Congress', status: 'active' });
    const congress = (congressRes.body as { congress: CongressPublic })
      .congress;

    const kolRes = await agent.post(`/api/organizations/${org.id}/kols`).send({
      name: 'Dr Test',
      email: `kol-${suffix}@example.com`,
    });
    const kol = (kolRes.body as { kol: KolPublic }).kol;

    const templateRes = await agent
      .post(`/api/organizations/${org.id}/outreach/templates`)
      .send({
        name: 'Default',
        subject: 'Hello {{name}}',
        bodyHtml: '<p>Welcome to {{congress}}</p>',
      });
    expect(templateRes.status).toBe(201);
    const template = (
      templateRes.body as { template: InvitationTemplatePublic }
    ).template;

    const campaignRes = await agent
      .post(`/api/organizations/${org.id}/outreach/campaigns`)
      .send({
        name: 'Wave 1',
        templateId: template.id,
        congressId: congress.id,
        kolIds: [kol.id],
      });
    expect(campaignRes.status).toBe(201);
    const campaign = (campaignRes.body as { campaign: CampaignPublic })
      .campaign;

    const sendRes = await agent.post(
      `/api/organizations/${org.id}/outreach/campaigns/${campaign.id}/send`,
    );
    expect(sendRes.status).toBe(201);
    const sendBody = sendRes.body as { sent: number; failed: number };
    expect(sendBody.sent).toBe(1);
    expect(sendBody.failed).toBe(0);

    const detail = await agent.get(
      `/api/organizations/${org.id}/outreach/campaigns/${campaign.id}`,
    );
    const invitations = (detail.body as { campaign: CampaignPublic }).campaign
      .invitations!;
    expect(invitations[0].status).toBe('sent');
    const token = invitations[0].responseToken!;

    const openRes = await request(app.getHttpServer()).get(
      `/api/public/invitations/${token}/open.gif`,
    );
    expect(openRes.status).toBe(200);

    const respondRes = await request(app.getHttpServer())
      .post(`/api/public/invitations/${token}/respond`)
      .send({ response: 'accepted', message: 'Looking forward to it' });
    expect(respondRes.status).toBe(201);
    const invitation = (respondRes.body as { invitation: InvitationPublic })
      .invitation;
    expect(invitation.status).toBe('responded');
    expect(invitation.appointmentId).toBeFalsy();

    const audits = await prisma.auditEvent.count({
      where: {
        organizationId: org.id,
        action: {
          in: ['outreach.campaign.send', 'outreach.invitation.respond'],
        },
      },
    });
    expect(audits).toBeGreaterThanOrEqual(2);
  });
});
