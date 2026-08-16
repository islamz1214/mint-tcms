import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import { AppModule } from './../src/app.module';

describe('TestSuites (e2e)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;
  let accessToken: string;
  let projectId: number;
  let rootSuiteId: number;
  let childSuiteId: number;

  const testUser = {
    name: 'TestSuite Tester',
    organizationName: `TestSuite Org ${Date.now()}`,
    email: `test-suites-${Date.now()}@example.com`,
    password: 'password123',
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();

    dataSource = moduleFixture.get(DataSource);

    const authRes = await request(app.getHttpServer())
      .post('/auth/register')
      .send(testUser)
      .expect(201);
    accessToken = authRes.body.access_token;

    const projectRes = await request(app.getHttpServer())
      .post('/projects')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'TS Test Project', description: 'Project for test suite e2e tests' })
      .expect(201);
    projectId = projectRes.body.id;
  });

  afterAll(async () => {
    await dataSource.query('DELETE FROM projects WHERE id = $1', [projectId]);
    await dataSource.query('DELETE FROM users WHERE email LIKE $1', ['%test-suites-%']);
    await app.close();
  });

  describe('POST /projects/:projectId/test-suites', () => {
    it('should create a root suite', async () => {
      const res = await request(app.getHttpServer())
        .post(`/projects/${projectId}/test-suites`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Authentication',
          description: 'Authentication related tests',
        })
        .expect(201);

      expect(res.body.id).toBeDefined();
      expect(res.body.name).toBe('Authentication');
      expect(res.body.parentId).toBeNull();
      rootSuiteId = res.body.id;
    });

    it('should create a child suite', async () => {
      const res = await request(app.getHttpServer())
        .post(`/projects/${projectId}/test-suites`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Login',
          description: 'Login test coverage',
          parentId: rootSuiteId,
        })
        .expect(201);

      expect(res.body.id).toBeDefined();
      expect(res.body.parentId).toBe(rootSuiteId);
      childSuiteId = res.body.id;
    });

    it('should fail without auth token', () => {
      return request(app.getHttpServer())
        .post(`/projects/${projectId}/test-suites`)
        .send({ name: 'Unauthorized Suite' })
        .expect(401);
    });

    it('should fail with short name', () => {
      return request(app.getHttpServer())
        .post(`/projects/${projectId}/test-suites`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'A' })
        .expect(400);
    });

    it('should fail when parent suite is outside the project', async () => {
      const otherProjectRes = await request(app.getHttpServer())
        .post('/projects')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'TS Other Project' })
        .expect(201);

      const otherSuiteRes = await request(app.getHttpServer())
        .post(`/projects/${otherProjectRes.body.id}/test-suites`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'Other Root Suite' })
        .expect(201);

      await request(app.getHttpServer())
        .post(`/projects/${projectId}/test-suites`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'Cross Project Child', parentId: otherSuiteRes.body.id })
        .expect(400);

      await request(app.getHttpServer())
        .delete(`/projects/${otherProjectRes.body.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
    });
  });

  describe('GET /projects/:projectId/test-suites', () => {
    it('should return all suites for the project', async () => {
      const res = await request(app.getHttpServer())
        .get(`/projects/${projectId}/test-suites`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.some((suite: { id: number }) => suite.id === rootSuiteId)).toBe(true);
      expect(res.body.some((suite: { id: number }) => suite.id === childSuiteId)).toBe(true);
    });
  });

  describe('GET /projects/:projectId/test-suites/tree', () => {
    it('should return the suite hierarchy', async () => {
      const res = await request(app.getHttpServer())
        .get(`/projects/${projectId}/test-suites/tree`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(Array.isArray(res.body.suites)).toBe(true);
      expect(Array.isArray(res.body.unassignedCases)).toBe(true);

      const rootSuite = res.body.suites.find((suite: { id: number }) => suite.id === rootSuiteId);
      expect(rootSuite).toBeDefined();
      expect(Array.isArray(rootSuite.children)).toBe(true);
      expect(rootSuite.children).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ id: childSuiteId, name: 'Login' }),
        ]),
      );
    });
  });

  describe('GET /projects/:projectId/test-suites/:id', () => {
    it('should return a single suite', async () => {
      const res = await request(app.getHttpServer())
        .get(`/projects/${projectId}/test-suites/${rootSuiteId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.id).toBe(rootSuiteId);
      expect(res.body.name).toBe('Authentication');
    });

    it('should return 404 for a missing suite', () => {
      return request(app.getHttpServer())
        .get(`/projects/${projectId}/test-suites/99999`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });
  });

  describe('PATCH /projects/:projectId/test-suites/:id', () => {
    it('should update a suite', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/projects/${projectId}/test-suites/${childSuiteId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'Login Flow', description: 'Updated description' })
        .expect(200);

      expect(res.body.id).toBe(childSuiteId);
      expect(res.body.name).toBe('Login Flow');
      expect(res.body.description).toBe('Updated description');
    });

    it('should reject circular nesting', () => {
      return request(app.getHttpServer())
        .patch(`/projects/${projectId}/test-suites/${rootSuiteId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ parentId: childSuiteId })
        .expect(400);
    });
  });

  describe('DELETE /projects/:projectId/test-suites/:id', () => {
    it('should delete a suite', async () => {
      const deleteSuiteRes = await request(app.getHttpServer())
        .post(`/projects/${projectId}/test-suites`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'Temporary Suite' })
        .expect(201);

      await request(app.getHttpServer())
        .delete(`/projects/${projectId}/test-suites/${deleteSuiteRes.body.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      await request(app.getHttpServer())
        .get(`/projects/${projectId}/test-suites/${deleteSuiteRes.body.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });
  });
});