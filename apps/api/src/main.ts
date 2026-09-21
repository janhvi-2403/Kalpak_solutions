import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { getConfig } from '@kalpak/config';
import { logger } from '@kalpak/logger';

async function bootstrap() {
  const config = getConfig();

  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  // Enable graceful shutdown hooks
  app.enableShutdownHooks();

  // Security Headers via Helmet
  app.use(
    helmet({
      contentSecurityPolicy: process.env.NODE_ENV === 'production' ? undefined : false,
      crossOriginEmbedderPolicy: false,
    })
  );

  // Cookie Parser for HttpOnly session cookies
  app.use(cookieParser());

  // CORS Configuration
  app.enableCors({
    origin: config.CORS_ALLOWED_ORIGINS,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'x-correlation-id',
      'x-tenant-id',
      'x-csrf-token',
    ],
  });

  // Global Prefix
  app.setGlobalPrefix('api/v1');

  // Strict Server-side Input Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Strip non-whitelisted properties
      forbidNonWhitelisted: true, // Reject requests with excess fields
      transform: true, // Auto-transform payloads to DTO instances
      transformOptions: {
        enableImplicitConversion: true,
      },
    })
  );

  // OpenAPI / Swagger Documentation
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Kalpak Solutions SaaS API')
    .setDescription(
      'Production-grade Multi-Tenant API for Service Calls & Ticket Management Platform'
    )
    .setVersion('1.0')
    .addCookieAuth('kalpak_session', {
      type: 'apiKey',
      in: 'cookie',
      name: 'kalpak_session',
      description: 'HttpOnly Session Cookie',
    })
    .addBearerAuth({
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'Token',
      description: 'Session token for headless or mobile API clients',
    })
    .addTag('Health & Readiness', 'Probes for infrastructure monitoring')
    .addTag('Authentication', 'Session management, login, logout, MFA')
    .addTag('Tenants', 'Organization switching and tenant details')
    .addTag('Users & Identity', 'User profiles and tenant member management')
    .addTag('Audit & Compliance', 'Immutable audit trails')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  const port = config.PORT;
  await app.listen(port);
  logger.info(`[Kalpak API] Server successfully listening on port ${port}`);
  logger.info(`[Kalpak API] Swagger OpenAPI documentation available at http://localhost:${port}/api/docs`);
}

bootstrap().catch((err) => {
  logger.fatal({ err }, 'Failed to start Kalpak API application');
  process.exit(1);
});
