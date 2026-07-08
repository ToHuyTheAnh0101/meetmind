import { webcrypto } from 'node:crypto';

if (!globalThis.crypto) {
  // @ts-expect-error Node webcrypto type is not assignable to DOM Crypto in this context
  globalThis.crypto = webcrypto;
}

import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { Request } from 'express';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    rawBody: true,
  });

  // Configure JSON body parser to accept both standard JSON and LiveKit webhook payloads
  app.useBodyParser('json', {
    type: ['application/json', 'application/webhook+json'],
  });

  // Enable CORS
  app.enableCors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3001',
    credentials: true,
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`🚀 MeetMind Backend running on http://localhost:${port}`);
}
void bootstrap();
