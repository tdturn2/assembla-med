import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { App } from 'supertest/types';
import type {
  CongressGuidePublic,
  CongressPublic,
  OrganizationPublic,
} from '@assembla-med/shared';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';

describe('Phase 4 Event App guide (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const suffix = Date.now();
  const email = `event-${suffix}@example.com`;
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
    await prisma.user.deleteMany({ where: { email } });
    await app.close();
  });

  it('creates and updates a congress event guide', async () => {
    const agent = request.agent(app.getHttpServer());

    await agent.post('/api/auth/register').send({ email, password });
    const orgRes = await agent
      .post('/api/organizations')
      .send({ name: `Event Org ${suffix}` });
    expect(orgRes.status).toBe(201);
    const org = (orgRes.body as { organization: OrganizationPublic })
      .organization;

    const congressRes = await agent
      .post(`/api/organizations/${org.id}/congresses`)
      .send({
        name: `ASCO Demo ${suffix}`,
        location: 'Chicago',
        status: 'active',
      });
    expect(congressRes.status).toBe(201);
    const congress = (congressRes.body as { congress: CongressPublic }).congress;

    const guideGet = await agent.get(
      `/api/organizations/${org.id}/congresses/${congress.id}/guide`,
    );
    expect(guideGet.status).toBe(200);
    const emptyGuide = (guideGet.body as { guide: CongressGuidePublic }).guide;
    expect(emptyGuide.congressId).toBe(congress.id);
    expect(emptyGuide.agendaMarkdown).toBeNull();

    const guidePatch = await agent
      .patch(`/api/organizations/${org.id}/congresses/${congress.id}/guide`)
      .send({
        agendaMarkdown: 'Day 1: Booth opens 9am',
        boothNotes: 'Hall B · 214',
        safetyMarkdown: 'Rally at Gate C',
        floorPlanUrl: 'http://localhost/floor.pdf',
      });
    expect(guidePatch.status).toBe(200);
    const guide = (guidePatch.body as { guide: CongressGuidePublic }).guide;
    expect(guide.agendaMarkdown).toContain('Booth opens');
    expect(guide.boothNotes).toBe('Hall B · 214');
    expect(guide.safetyMarkdown).toBe('Rally at Gate C');
    expect(guide.floorPlanUrl).toBe('http://localhost/floor.pdf');
  });
});
