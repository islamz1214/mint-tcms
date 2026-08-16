import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { DataSource } from 'typeorm';

describe('TestRuns (e2e)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;
  let accessToken: string;
  let projectId: number;
  let testCaseId: number;
  let testRunId: number;
  let resultId: number;

  const testUser = {
    name: 'TestRun Tester',
    organizationName: `TestRun Org ${Date.now()}`,
    email: `test-runs-${Date.now()}@example.com`,
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

    const res = await request(app.getHttpServer()).post('/auth/register').send(testUser);
    accessToken = res.body.access_token;

    const project = await request(app.getHttpServer())
      .post('/projects')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'TR Test Project' });
    projectId = project.body.id;

    const tc = await request(app.getHttpServer())
      .post(`/projects/${projectId}/test-cases`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ title: 'Sample test case' });
    testCaseId = tc.body.id;
  });

  afterAll(async () => {
    await dataSource.query('DELETE FROM test_results WHERE test_run_id IN (SELECT id FROM test_runs WHERE project_id = $1)', [projectId]);
    await dataSource.query('DELETE FROM test_runs WHERE project_id = $1', [projectId]);
    await dataSource.query('DELETE FROM test_cases WHERE project_id = $1', [projectId]);
    await dataSource.query('DELETE FROM projects WHERE id = $1', [projectId]);
    await dataSource.query('DELETE FROM users WHERE email LIKE $1', ['%test-runs-%']);
    await app.close();
  });

  describe('POST /projects/:projectId/test-runs', () => {
    it('should create a test run with results', async () => {
      const res = await request(app.getHttpServer())
        .post(`/projects/${projectId}/test-runs`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'Sprint 1 Run', description: 'First test run', testCaseIds: [testCaseId] })
        .expect(201);

      expect(res.body.id).toBeDefined();
      expect(res.body.name).toBe('Sprint 1 Run');
      expect(res.body.status).toBe('pending');
      expect(res.body.results).toHaveLength(1);
      expect(res.body.results[0].status).toBe('pending');
      testRunId = res.body.id;
      resultId = res.body.results[0].id;
    });

    it('should fail without auth token', () => {
      return request(app.getHttpServer())
        .post(`/projects/${projectId}/test-runs`)
        .send({ name: 'Run', testCaseIds: [] })
        .expect(401);
    });

    it('should return 404 for non-existent project', () => {
      return request(app.getHttpServer())
        .post('/projects/99999/test-runs')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'Run', testCaseIds: [] })
        .expect(404);
    });
  });

  describe('GET /projects/:projectId/test-runs', () => {
    it('should return all test runs', async () => {
      const res = await request(app.getHttpServer())
        .get(`/projects/${projectId}/test-runs`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
    });
  });

  describe('GET /projects/:projectId/test-runs/:id', () => {
    it('should return a test run with results', async () => {
      const res = await request(app.getHttpServer())
        .get(`/projects/${projectId}/test-runs/${testRunId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.id).toBe(testRunId);
      expect(res.body.results).toBeDefined();
    });

    it('should return 404 for non-existent test run', () => {
      return request(app.getHttpServer())
        .get(`/projects/${projectId}/test-runs/99999`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });
  });

  describe('PATCH /projects/:projectId/test-runs/:id/results/:resultId', () => {
    it('should mark a result as passed', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/projects/${projectId}/test-runs/${testRunId}/results/${resultId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ status: 'passed', notes: 'Worked as expected' })
        .expect(200);

      expect(res.body.status).toBe('passed');
      expect(res.body.notes).toBe('Worked as expected');
    });

    it('should mark a result as failed', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/projects/${projectId}/test-runs/${testRunId}/results/${resultId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ status: 'failed', notes: 'Button did not respond' })
        .expect(200);

      expect(res.body.status).toBe('failed');
    });

    it('should mark a result as blocked', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/projects/${projectId}/test-runs/${testRunId}/results/${resultId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ status: 'blocked', notes: 'Environment unavailable' })
        .expect(200);

      expect(res.body.status).toBe('blocked');
      expect(res.body.notes).toBe('Environment unavailable');
    });

    it('should fail with invalid status', () => {
      return request(app.getHttpServer())
        .patch(`/projects/${projectId}/test-runs/${testRunId}/results/${resultId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ status: 'broken' })
        .expect(400);
    });
  });

  describe('PATCH /projects/:projectId/test-runs/:id', () => {
    it('should update run status to completed', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/projects/${projectId}/test-runs/${testRunId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ status: 'completed' })
        .expect(200);

      expect(res.body.status).toBe('completed');
    });
  });

  describe('DELETE /projects/:projectId/test-runs/:id', () => {
    it('should delete a test run', async () => {
      const created = await request(app.getHttpServer())
        .post(`/projects/${projectId}/test-runs`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'Run to delete', testCaseIds: [] });

      await request(app.getHttpServer())
        .delete(`/projects/${projectId}/test-runs/${created.body.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      await request(app.getHttpServer())
        .get(`/projects/${projectId}/test-runs/${created.body.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });
  });
});
