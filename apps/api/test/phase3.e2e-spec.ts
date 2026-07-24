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
} from '@assembla-med/shared';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';

describe('Phase 3 mock integration push (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const suffix = Date.now();
  const email = `integ-${suffix}@example.com`;
  const password = 'password123';
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
    await prisma.user.deleteMany({ where: { email } });
    await app.close();
  });

  it('pushes to mock destination, force-fails, replays idempotently', async () => {
    const agent = request.agent(app.getHttpServer());
    await agent.post('/api/auth/register').send({ email, password });
    const orgRes = await agent
      .post('/api/organizations')
      .send({ name: `Integ Org ${suffix}` });
    const org = (orgRes.body as { organization: OrganizationPublic })
      .organization;

    const congressRes = await agent
      .post(`/api/organizations/${org.id}/congresses`)
      .send({ name: 'Integ Congress', status: 'active' });
    const congress = (congressRes.body as { congress: CongressPublic }).congress;

    const kolRes = await agent.post(`/api/organizations/${org.id}/kols`).send({
      name: 'Dr Integ',
      email: `kol-${suffix}@example.com`,
    });
    const kol = (kolRes.body as { kol: KolPublic }).kol;

    const start = new Date('2026-07-01T15:00:00.000Z');
    const end = new Date('2026-07-01T15:30:00.000Z');
    const apptRes = await agent
      .post(`/api/organizations/${org.id}/appointments`)
      .send({
        congressId: congress.id,
        kolId: kol.id,
        title: 'Integ meeting',
        startTime: start.toISOString(),
        endTime: end.toISOString(),
      });
    const appointment = (apptRes.body as { appointment: AppointmentPublic })
      .appointment;

    const checkInRes = await agent
      .post(`/api/organizations/${org.id}/check-ins`)
      .send({
        checkInCode: appointment.checkInCode,
        tovAmount: 50,
        tovType: 'meal',
        signatureBase64: signature,
      });
    expect(checkInRes.status).toBe(201);
    let checkIn = (checkInRes.body as { checkIn: CheckInPublic }).checkIn;
    expect(checkIn.integrationStatus).toBe('pushed');
    expect(checkIn.integrationDestination).toBe('mock');
    expect(checkIn.integrationExternalId).toBeTruthy();
    expect(checkIn.integrationAttemptCount).toBe(1);
    const externalId = checkIn.integrationExternalId;

    const failRes = await agent
      .post(
        `/api/organizations/${org.id}/check-ins/${checkIn.id}/integration/replay`,
      )
      .send({ forceFail: true });
    expect(failRes.status).toBe(201);
    checkIn = (failRes.body as { checkIn: CheckInPublic }).checkIn;
    expect(checkIn.integrationStatus).toBe('failed');
    expect(checkIn.integrationLastError).toMatch(/forced failure/i);
    expect(checkIn.integrationAttemptCount).toBe(2);

    const replayRes = await agent
      .post(
        `/api/organizations/${org.id}/check-ins/${checkIn.id}/integration/replay`,
      )
      .send({});
    expect(replayRes.status).toBe(201);
    checkIn = (replayRes.body as { checkIn: CheckInPublic }).checkIn;
    expect(checkIn.integrationStatus).toBe('pushed');
    expect(checkIn.integrationExternalId).toBe(externalId);
    expect(checkIn.integrationAttemptCount).toBe(3);

    const mockCount = await prisma.mockIntegrationRecord.count({
      where: {
        organizationId: org.id,
        idempotencyKey: checkIn.integrationIdempotencyKey!,
      },
    });
    expect(mockCount).toBe(1);

    const cventCsv = await agent.get(
      `/api/organizations/${org.id}/congresses/${congress.id}/export/check-ins-cvent`,
    );
    expect(cventCsv.status).toBe(200);
    expect(cventCsv.text).toContain('SourceSystemId');
    expect(cventCsv.text).toContain(checkIn.id);
  });
});
