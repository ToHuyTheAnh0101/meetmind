import { webcrypto } from 'node:crypto';

if (!globalThis.crypto) {
  // @ts-expect-error Node webcrypto type is not assignable to DOM Crypto in this context
  globalThis.crypto = webcrypto;
}

import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { json, Request } from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: true });

  // Parse LiveKit webhook content-type application/webhook+json and preserve rawBody
  app.use(
    '/meetings/webhooks/livekit',
    json({
      type: 'application/webhook+json',
      verify: (req: Request & { rawBody?: Buffer }, res, buf) => {
        req.rawBody = buf;
      },
    }),
  );

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
