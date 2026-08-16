import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { DataSource } from 'typeorm';

describe('Auth (e2e)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();

    dataSource = moduleFixture.get(DataSource);
  });

  afterAll(async () => {
    // Clean up test data
    await dataSource.query('DELETE FROM users WHERE email LIKE $1', ['%test-%']);
    await app.close();
  });

  const testUser = {
    name: 'Test User',
    organizationName: `Test User Org ${Date.now()}`,
    email: `test-${Date.now()}@example.com`,
    password: 'password123',
  };

  let accessToken: string;

  describe('POST /auth/register', () => {
    it('should register a new user and return a token', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send(testUser)
        .expect(201);

      expect(res.body.access_token).toBeDefined();
      expect(res.body.user.email).toBe(testUser.email);
      expect(res.body.user.role).toBe('test_manager');
      expect(res.body.user.password).toBeUndefined(); // password not exposed
      accessToken = res.body.access_token;
    });

    it('should fail with invalid email', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({ ...testUser, email: 'not-an-email' })
        .expect(400);
    });

    it('should fail with short password', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({ ...testUser, email: 'another@example.com', password: '123' })
        .expect(400);
    });
  });

  describe('POST /auth/login', () => {
    it('should login and return a token', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: testUser.email, password: testUser.password })
        .expect(201);

      expect(res.body.access_token).toBeDefined();
      expect(res.body.user.email).toBe(testUser.email);
      expect(res.body.user.role).toBe('test_manager');
    });

    it('should fail with wrong password', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: testUser.email, password: 'wrongpassword' })
        .expect(401);
    });

    it('should fail with non-existent email', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'nobody@example.com', password: 'password123' })
        .expect(401);
    });
  });

  describe('Protected routes', () => {
    it('should access protected route with valid token', () => {
      return request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
    });

    it('should reject request without token', () => {
      return request(app.getHttpServer())
        .get('/users')
        .expect(401);
    });
  });
});
