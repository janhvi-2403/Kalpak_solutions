import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { json, urlencoded } from 'express';
import { AppModule } from './app.module';
import { getConfig } from '@kalpak/config';
import { logger } from '@kalpak/logger';

async function bootstrap() {
  const config = getConfig();

  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
    rawBody: true,
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

  // Body Parser Limits for Webhook Attachments (25MB)
  app.use(json({ limit: '25mb' }));
  app.use(urlencoded({ limit: '25mb', extended: true }));

  // CORS Configuration supporting Multi-Tenant Subdomains
  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void
    ) => {
      if (!origin) {
        return callback(null, true);
      }
      if (config.CORS_ALLOWED_ORIGINS.includes(origin)) {
        return callback(null, true);
      }
      // Allow localhost and lvh.me subdomains (e.g. http://acme.localhost:3000)
      if (/^https?:\/\/([a-z0-9-]+)\.(localhost|lvh\.me)(:\d+)?$/i.test(origin)) {
        return callback(null, true);
      }
      // Allow production/staging base domain subdomains (e.g. https://acme.kalpak.com)
      if (config.APP_BASE_DOMAIN && config.APP_BASE_DOMAIN !== 'localhost') {
        const escapedDomain = config.APP_BASE_DOMAIN.replace(/\./g, '\\.');
        const subdomainRegex = new RegExp(`^https?:\\/\\/([a-z0-9-]+\\.)*${escapedDomain}(:\\d+)?$`, 'i');
        if (subdomainRegex.test(origin)) {
          return callback(null, true);
        }
      }
      return callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'x-correlation-id',
      'x-tenant-id',
      'x-tenant-slug',
      'x-csrf-token',
      'x-razorpay-signature',
      'x-razorpay-event-id',
      'x-mailgun-signature',
      'x-mailgun-timestamp',
      'x-mailgun-token',
      'svix-id',
      'svix-timestamp',
      'svix-signature',
      'x-webhook-signature',
      'x-webhook-secret',
    ],
  });

  // Global Prefix (exclude webhooks and health endpoints for direct root-level access)
  app.setGlobalPrefix('api/v1', {
    exclude: [
      'health',
      'api/health',
      'webhooks/razorpay',
      'webhooks/email/inbound',
      'api/webhooks/email/inbound',
      'api/v1/webhooks/email/inbound',
      'webhooks/cloudmailin',
      'api/webhooks/cloudmailin',
      'api/v1/webhooks/cloudmailin',
    ],
  });

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
