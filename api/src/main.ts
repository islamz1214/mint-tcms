import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { apiReference } from '@scalar/nestjs-api-reference';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3001',
    credentials: true,
  });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));

  const openApiConfig = new DocumentBuilder()
    .setTitle('Mint TCMS API')
    .setDescription('Mint TCMS test management API reference')
    .setVersion('1.0.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Paste access token without the Bearer prefix',
      },
      'bearerAuth',
    )
    .build();

  const openApiDocument = SwaggerModule.createDocument(app, openApiConfig);
  const httpAdapter = app.getHttpAdapter().getInstance();

  httpAdapter.get('/openapi.json', (_req: unknown, res: { json: (body: unknown) => void }) => {
    res.json(openApiDocument);
  });

  app.use(
    '/api-reference',
    apiReference({
      title: 'Mint TCMS API Reference',
      spec: {
        url: '/openapi.json',
      },
    }),
  );

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
