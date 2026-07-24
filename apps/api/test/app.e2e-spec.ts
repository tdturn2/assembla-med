import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { App } from 'supertest/types';
import type {
  HealthResponse,
  MeResponse,
  OrganizationPublic,
  UserPublic,
} from '@assembla-med/shared';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';

describe('Auth + Orgs (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const suffix = Date.now();
  const adminEmail = `admin-${suffix}@example.com`;
  const memberEmail = `member-${suffix}@example.com`;
  const password = 'password123';

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
      where: {
        email: { in: [adminEmail, memberEmail] },
      },
    });
    await app.close();
  });

  it('/api/health (GET)', async () => {
    const response = await request(app.getHttpServer()).get('/api/health');
    const body = response.body as HealthResponse;

    expect(response.status).toBe(200);
    expect(body.status).toBe('ok');
    expect(body.database).toBe('up');
  });

  it('registers, creates org, enforces tenant isolation', async () => {
    const adminAgent = request.agent(app.getHttpServer());
    const outsiderAgent = request.agent(app.getHttpServer());

    const register = await adminAgent
      .post('/api/auth/register')
      .send({ email: adminEmail, password });
    const registerBody = register.body as { user: UserPublic };
    expect(register.status).toBe(201);
    expect(registerBody.user.email).toBe(adminEmail);

    const me = await adminAgent.get('/api/auth/me');
    const meBody = me.body as MeResponse;
    expect(me.status).toBe(200);
    expect(meBody.user.email).toBe(adminEmail);

    const createOrg = await adminAgent
      .post('/api/organizations')
      .send({ name: `Org ${suffix}` });
    const createOrgBody = createOrg.body as {
      organization: OrganizationPublic;
    };
    expect(createOrg.status).toBe(201);
    const orgId = createOrgBody.organization.id;

    const memberRegister = await outsiderAgent
      .post('/api/auth/register')
      .send({ email: memberEmail, password });
    expect(memberRegister.status).toBe(201);

    const denied = await outsiderAgent.get(`/api/organizations/${orgId}`);
    expect(denied.status).toBe(403);

    const addMember = await adminAgent
      .post(`/api/organizations/${orgId}/members`)
      .send({ email: memberEmail, role: 'rep' });
    expect(addMember.status).toBe(201);

    const allowed = await outsiderAgent.get(`/api/organizations/${orgId}`);
    const allowedBody = allowed.body as { organization: OrganizationPublic };
    expect(allowed.status).toBe(200);
    expect(allowedBody.organization.id).toBe(orgId);

    const auditCount = await prisma.auditEvent.count({
      where: {
        OR: [
          { action: 'auth.register', userId: registerBody.user.id },
          { action: 'org.create', organizationId: orgId },
          { action: 'org.member.add', organizationId: orgId },
        ],
      },
    });
    expect(auditCount).toBeGreaterThanOrEqual(3);
  });
});
