import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import { AppModule } from './../src/app.module';

describe('Defects (e2e)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;
  let accessToken: string;
  let projectId: number;
  let testCaseId: number;
  let testRunId: number;
  let resultId: number;
  let defectId: number;

  const testUser = {
    name: 'Defect Tester',
    organizationName: `Defect Org ${Date.now()}`,
    email: `defects-${Date.now()}@example.com`,
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
      .send({ name: 'Defect Test Project' });
    projectId = project.body.id;

    const testCase = await request(app.getHttpServer())
      .post(`/projects/${projectId}/test-cases`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ title: 'Defect coverage case' });
    testCaseId = testCase.body.id;

    const testRun = await request(app.getHttpServer())
      .post(`/projects/${projectId}/test-runs`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Defect run', testCaseIds: [testCaseId] });
    testRunId = testRun.body.id;
    resultId = testRun.body.results[0].id;

    await request(app.getHttpServer())
      .patch(`/projects/${projectId}/test-runs/${testRunId}/results/${resultId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ status: 'failed', notes: 'Regression found' })
      .expect(200);
  });

  afterAll(async () => {
    await dataSource.query('DELETE FROM defect_test_results WHERE defect_id IN (SELECT id FROM defects WHERE project_id = $1)', [projectId]);
    await dataSource.query('DELETE FROM defects WHERE project_id = $1', [projectId]);
    await dataSource.query('DELETE FROM test_results WHERE test_run_id IN (SELECT id FROM test_runs WHERE project_id = $1)', [projectId]);
    await dataSource.query('DELETE FROM test_runs WHERE project_id = $1', [projectId]);
    await dataSource.query('DELETE FROM test_cases WHERE project_id = $1', [projectId]);
    await dataSource.query('DELETE FROM projects WHERE id = $1', [projectId]);
    await dataSource.query('DELETE FROM users WHERE email LIKE $1', ['%defects-%']);
    await app.close();
  });

  it('creates a defect and links it to a result', async () => {
    const defect = await request(app.getHttpServer())
      .post(`/projects/${projectId}/defects`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ title: 'Login defect', description: 'Login fails under load' })
      .expect(201);

    defectId = defect.body.id;
    expect(defect.body.status).toBe('open');

    const linked = await request(app.getHttpServer())
      .post(`/projects/${projectId}/defects/${defectId}/results/${resultId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({})
      .expect(201);

    expect(linked.body.results).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: resultId })]),
    );

    const run = await request(app.getHttpServer())
      .get(`/projects/${projectId}/test-runs/${testRunId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(run.body.results[0].defects).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: defectId, title: 'Login defect' })]),
    );
  });

  it('unlinks a defect from a result', async () => {
    await request(app.getHttpServer())
      .delete(`/projects/${projectId}/defects/${defectId}/results/${resultId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    const run = await request(app.getHttpServer())
      .get(`/projects/${projectId}/test-runs/${testRunId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(run.body.results[0].defects).toEqual([]);
  });
});