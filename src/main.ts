import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: ['http://localhost:3000', 'http://localhost:4000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Swagger 설정
  const config = new DocumentBuilder()
    .setTitle('오픈뱅킹 API')
    .setDescription(
      '오픈뱅킹 API 문서입니다. Supabase 인증 토큰이 필요한 엔드포인트는 우측 상단의 Authorize 버튼을 클릭하여 토큰을 입력하세요.',
    )
    .setVersion('1.0')
    .addServer('http://localhost:4000', 'Local Development Server')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Authorization',
        description: 'Supabase JWT 토큰을 입력하세요',
        in: 'header',
      },
      'supabase-auth',
    )
    .addTag('OpenBank', '오픈뱅킹 API')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document);

  await app.listen(process.env.PORT ?? 4000);
  console.log(`Application is running on: http://localhost:${process.env.PORT ?? 4000}`);
  console.log(`Swagger UI: http://localhost:${process.env.PORT ?? 4000}/api-docs`);
}
bootstrap();
