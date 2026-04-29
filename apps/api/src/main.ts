import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import {
  PrismaExceptionFilter,
  PrismaValidationFilter,
} from './common/filters/prisma-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const port = configService.get<number>('app.port', 3001);

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Global exception filters for Prisma errors
  app.useGlobalFilters(
    new PrismaExceptionFilter(),
    new PrismaValidationFilter(),
  );

  // CORS — accepts comma-separated list. Vercel preview deploys (*.vercel.app)
  // are allowed automatically.
  const corsConfig = configService.get<string>(
    'app.corsOrigin',
    'http://localhost:3000,http://127.0.0.1:3000',
  );
  const corsList = corsConfig.split(',').map((s) => s.trim()).filter(Boolean);
  app.enableCors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      if (corsList.includes(origin)) return cb(null, true);
      if (/\.vercel\.app$/.test(new URL(origin).hostname)) return cb(null, true);
      return cb(new Error(`CORS blocked: ${origin}`));
    },
    credentials: true,
  });

  // API prefix
  app.setGlobalPrefix('api/v1');

  // Swagger
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Capillaris API')
    .setDescription('Capillaris Medical CRM - REST API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  // Bind to 0.0.0.0 so the container is reachable from outside (Railway, etc.)
  await app.listen(port, '0.0.0.0');
  console.log(`Capillaris API running on port ${port}`);
  console.log(`Swagger docs at /api/docs`);
}

bootstrap();
