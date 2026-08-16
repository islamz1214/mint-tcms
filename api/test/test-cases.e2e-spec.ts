import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { DataSource } from 'typeorm';

describe('TestCases (e2e)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;
  let accessToken: string;
  let projectId: number;
  let testCaseId: number;

  const testUser = {
    name: 'TestCase Tester',
    organizationName: `TestCase Org ${Date.now()}`,
    email: `test-cases-${Date.now()}@example.com`,
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

    // Register and get token
    const res = await request(app.getHttpServer())
      .post('/auth/register')
      .send(testUser);
    accessToken = res.body.access_token;

    // Create a project to use
    const project = await request(app.getHttpServer())
      .post('/projects')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'TC Test Project' });
    projectId = project.body.id;
  });

  afterAll(async () => {
    await dataSource.query('DELETE FROM test_cases WHERE project_id = $1', [projectId]);
    await dataSource.query('DELETE FROM projects WHERE id = $1', [projectId]);
    await dataSource.query('DELETE FROM users WHERE email LIKE $1', ['%test-cases-%']);
    await app.close();
  });

  describe('POST /projects/:projectId/test-cases', () => {
    it('should create a test case', async () => {
      const res = await request(app.getHttpServer())
        .post(`/projects/${projectId}/test-cases`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          title: 'Login with valid credentials',
          description: 'Test that a user can log in',
          steps: '1. Go to login\n2. Enter credentials\n3. Click submit',
          expectedResult: 'User is redirected to dashboard',
          priority: 'high',
        })
        .expect(201);

      expect(res.body.id).toBeDefined();
      expect(res.body.title).toBe('Login with valid credentials');
      expect(res.body.status).toBe('draft');
      expect(res.body.priority).toBe('high');
      testCaseId = res.body.id;
    });

    it('should fail without auth token', () => {
      return request(app.getHttpServer())
        .post(`/projects/${projectId}/test-cases`)
        .send({ title: 'Some test' })
        .expect(401);
    });

    it('should fail with short title', () => {
      return request(app.getHttpServer())
        .post(`/projects/${projectId}/test-cases`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ title: 'AB' })
        .expect(400);
    });

    it('should fail with invalid priority', () => {
      return request(app.getHttpServer())
        .post(`/projects/${projectId}/test-cases`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ title: 'Valid title', priority: 'critical' })
        .expect(400);
    });

    it('should return 404 for non-existent project', () => {
      return request(app.getHttpServer())
        .post('/projects/99999/test-cases')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ title: 'Some test case' })
        .expect(404);
    });
  });

  describe('GET /projects/:projectId/test-cases', () => {
    it('should return all test cases for a project', async () => {
      const res = await request(app.getHttpServer())
        .get(`/projects/${projectId}/test-cases`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
    });

    it('should fail without auth token', () => {
      return request(app.getHttpServer())
        .get(`/projects/${projectId}/test-cases`)
        .expect(401);
    });
  });

  describe('GET /projects/:projectId/test-cases/:id', () => {
    it('should return a single test case', async () => {
      const res = await request(app.getHttpServer())
        .get(`/projects/${projectId}/test-cases/${testCaseId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.id).toBe(testCaseId);
    });

    it('should return 404 for non-existent test case', () => {
      return request(app.getHttpServer())
        .get(`/projects/${projectId}/test-cases/99999`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });
  });

  describe('PATCH /projects/:projectId/test-cases/:id', () => {
    it('should update a test case', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/projects/${projectId}/test-cases/${testCaseId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ title: 'Updated title', status: 'active' })
        .expect(200);

      expect(res.body.title).toBe('Updated title');
      expect(res.body.status).toBe('active');
    });
  });

  describe('DELETE /projects/:projectId/test-cases/:id', () => {
    it('should delete a test case', async () => {
      const created = await request(app.getHttpServer())
        .post(`/projects/${projectId}/test-cases`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ title: 'Test case to delete' });

      await request(app.getHttpServer())
        .delete(`/projects/${projectId}/test-cases/${created.body.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      await request(app.getHttpServer())
        .get(`/projects/${projectId}/test-cases/${created.body.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });
  });
});
