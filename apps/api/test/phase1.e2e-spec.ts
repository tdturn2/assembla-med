import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { App } from 'supertest/types';
import type {
  AppointmentPublic,
  CheckInPublic,
  CongressPublic,
  KolPublic,
  OrganizationPublic,
  UserPublic,
} from '@assembla-med/shared';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';

describe('Phase 1 congress spine (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const suffix = Date.now();
  const email = `spine-${suffix}@example.com`;
  const outsiderEmail = `spine-out-${suffix}@example.com`;
  const password = 'password123';
  // 1x1 PNG
  const signature =
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

  beforeAll(async () => {
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
    await prisma.user.deleteMany({
      where: { email: { in: [email, outsiderEmail] } },
    });
    await app.close();
  });

  it('runs congress → KOL → appointment → check-in → export with tenancy', async () => {
    const agent = request.agent(app.getHttpServer());
    const outsider = request.agent(app.getHttpServer());

    await agent.post('/api/auth/register').send({ email, password });
    const orgRes = await agent
      .post('/api/organizations')
      .send({ name: `Spine Org ${suffix}` });
    const org = (orgRes.body as { organization: OrganizationPublic })
      .organization;

    const congressRes = await agent
      .post(`/api/organizations/${org.id}/congresses`)
      .send({
        name: 'ASCO Demo',
        startDate: '2026-06-01',
        endDate: '2026-06-05',
        location: 'Chicago',
        status: 'active',
      });
    expect(congressRes.status).toBe(201);
    const congress = (congressRes.body as { congress: CongressPublic })
      .congress;

    const importRes = await agent
      .post(`/api/organizations/${org.id}/kols/import`)
      .send({
        csv: 'name,email,institution,therapeuticArea,region\nJane KOL,jane@example.com,City Hospital,Oncology,US\n',
      });
    expect(importRes.status).toBe(201);
    const kols = (importRes.body as { created: KolPublic[] }).created;
    expect(kols).toHaveLength(1);

    const start = new Date('2026-06-02T15:00:00.000Z');
    const end = new Date('2026-06-02T15:30:00.000Z');
    const apptRes = await agent
      .post(`/api/organizations/${org.id}/appointments`)
      .send({
        congressId: congress.id,
        kolId: kols[0].id,
        title: 'KOL meeting',
        startTime: start.toISOString(),
        endTime: end.toISOString(),
      });
    expect(apptRes.status).toBe(201);
    const appointment = (apptRes.body as { appointment: AppointmentPublic })
      .appointment;
    expect(appointment.checkInCode).toHaveLength(8);
    expect(appointment.engagementType).toBe('meeting');
    expect(appointment.isContracted).toBe(false);
    expect(appointment.attendees?.length).toBeGreaterThanOrEqual(1);
    expect(appointment.attendees?.[0]?.kolId).toBe(kols[0].id);
    expect(appointment.attendees?.[0]?.isPrimary).toBe(true);

    const withExtras = await agent
      .post(`/api/organizations/${org.id}/appointments`)
      .send({
        congressId: congress.id,
        kolId: kols[0].id,
        title: 'Contracted advisory',
        startTime: new Date('2026-06-03T15:00:00.000Z').toISOString(),
        endTime: new Date('2026-06-03T15:30:00.000Z').toISOString(),
        engagementType: 'advisory_board',
        isContracted: true,
        contractNotes: 'SOW-1',
        attendees: [
          {
            kind: 'external',
            name: 'Agency Partner',
            email: 'partner@example.com',
          },
        ],
      });
    expect(withExtras.status).toBe(201);
    const contracted = (
      withExtras.body as { appointment: AppointmentPublic }
    ).appointment;
    expect(contracted.isContracted).toBe(true);
    expect(contracted.engagementType).toBe('advisory_board');
    expect(contracted.attendees?.some((a) => a.name === 'Agency Partner')).toBe(
      true,
    );

    const conflict = await agent
      .post(`/api/organizations/${org.id}/appointments`)
      .send({
        congressId: congress.id,
        kolId: kols[0].id,
        title: 'Overlap',
        startTime: new Date('2026-06-02T15:15:00.000Z').toISOString(),
        endTime: new Date('2026-06-02T15:45:00.000Z').toISOString(),
      });
    expect(conflict.status).toBe(409);

    const checkInRes = await agent
      .post(`/api/organizations/${org.id}/check-ins`)
      .send({
        checkInCode: appointment.checkInCode,
        tovAmount: 125.5,
        tovType: 'meal',
        signatureBase64: signature,
      });
    expect(checkInRes.status).toBe(201);
    const checkIn = (checkInRes.body as { checkIn: CheckInPublic }).checkIn;
    expect(checkIn.signatureStatus).toBe('signed');
    expect(checkIn.signatureKey).toBeTruthy();
    expect(checkIn.tovAmount).toBe('125.5');
    expect(checkIn.integrationStatus).toBe('pushed');
    expect(checkIn.integrationDestination).toBe('mock');
    expect(checkIn.integrationExternalId).toBeTruthy();

    const exportRes = await agent.get(
      `/api/organizations/${org.id}/congresses/${congress.id}/export/check-ins`,
    );
    expect(exportRes.status).toBe(200);
    expect(exportRes.text).toContain(checkIn.id);
    expect(exportRes.text).toContain('125.5');
    expect(exportRes.text).toContain(appointment.checkInCode);

    await outsider
      .post('/api/auth/register')
      .send({ email: outsiderEmail, password });
    const denied = await outsider.get(
      `/api/organizations/${org.id}/congresses/${congress.id}`,
    );
    expect(denied.status).toBe(403);

    const voidRes = await agent
      .post(`/api/organizations/${org.id}/check-ins/${checkIn.id}/void`)
      .send({ reason: 'Wrong ToV amount' });
    expect(voidRes.status).toBe(201);

    const correction = await agent
      .post(`/api/organizations/${org.id}/check-ins`)
      .send({
        appointmentId: appointment.id,
        tovAmount: 100,
        tovType: 'meal',
        signatureBase64: signature,
        replacesCheckInId: checkIn.id,
      });
    expect(correction.status).toBe(201);
    const corrected = (correction.body as { checkIn: CheckInPublic }).checkIn;
    expect(corrected.replacesCheckInId).toBe(checkIn.id);
    expect(corrected.tovAmount).toBe('100');

    const user = (
      (await agent.get('/api/auth/me')).body as { user: UserPublic }
    ).user;
    expect(user.email).toBe(email);
  });
});
