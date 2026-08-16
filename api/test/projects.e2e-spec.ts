import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { DataSource } from 'typeorm';

describe('Projects (e2e)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;
  let accessToken: string;
  let projectId: number;

  const testUser = {
    name: 'Project Tester',
    organizationName: `Project Tester Org ${Date.now()}`,
    email: `test-projects-${Date.now()}@example.com`,
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
  });

  afterAll(async () => {
    await dataSource.query('DELETE FROM projects WHERE name LIKE $1', ['%Test Project%']);
    await dataSource.query('DELETE FROM users WHERE email LIKE $1', ['%test-projects-%']);
    await app.close();
  });

  describe('POST /projects', () => {
    it('should create a project', async () => {
      const res = await request(app.getHttpServer())
        .post('/projects')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'Test Project One', description: 'A test project' })
        .expect(201);

      expect(res.body.id).toBeDefined();
      expect(res.body.name).toBe('Test Project One');
      expect(res.body.description).toBe('A test project');
      projectId = res.body.id;
    });

    it('should fail without auth token', () => {
      return request(app.getHttpServer())
        .post('/projects')
        .send({ name: 'Test Project' })
        .expect(401);
    });

    it('should fail with short name', () => {
      return request(app.getHttpServer())
        .post('/projects')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'A' })
        .expect(400);
    });
  });

  describe('GET /projects', () => {
    it('should return all projects for the user', async () => {
      const res = await request(app.getHttpServer())
        .get('/projects')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
    });

    it('should fail without auth token', () => {
      return request(app.getHttpServer()).get('/projects').expect(401);
    });
  });

  describe('GET /projects/:id', () => {
    it('should return a single project', async () => {
      const res = await request(app.getHttpServer())
        .get(`/projects/${projectId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.id).toBe(projectId);
    });

    it('should return 404 for non-existent project', () => {
      return request(app.getHttpServer())
        .get('/projects/99999')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });
  });

  describe('PATCH /projects/:id', () => {
    it('should update a project', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/projects/${projectId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'Test Project Updated' })
        .expect(200);

      expect(res.body.name).toBe('Test Project Updated');
    });
  });

  describe('DELETE /projects/:id', () => {
    it('should delete a project', async () => {
      // Create a project to delete
      const created = await request(app.getHttpServer())
        .post('/projects')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'Test Project To Delete' });

      await request(app.getHttpServer())
        .delete(`/projects/${created.body.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      // Verify it's gone
      await request(app.getHttpServer())
        .get(`/projects/${created.body.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });
  });
});
