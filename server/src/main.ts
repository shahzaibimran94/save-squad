import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { LoggingService } from './modules/logger/logger.service';
import { AllExceptionsFilter } from './modules/logger/logger.exception.filter';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const loggingService = app.get(LoggingService);

  app.useGlobalFilters(new AllExceptionsFilter(loggingService));

  app.useGlobalPipes(
    new ValidationPipe({}),
  );

  app.set('trust proxy', 1);

  // Configure Swagger
  const config = new DocumentBuilder()
    .setTitle('Save Squad REST APIs')                 // API title
    .setDescription('APIs designed to manage customer payments, enabling secure and efficient processing of transactions, including payment method management.')  // API description
    .setVersion('1.0')                  // Version
    // .addTag('example')                  // Optional tag for grouping
    .build();

  // Create Swagger document
  const document = SwaggerModule.createDocument(app, config);

  // Setup Swagger UI
  SwaggerModule.setup('api-docs', app, document); // Swagger UI will be available at /api-docs
  
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
