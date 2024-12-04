import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { LoggingService } from './logger/logger.service';
import { AllExceptionsFilter } from './logger/logger.exception.filter';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const loggingService = app.get(LoggingService);

  app.useGlobalFilters(new AllExceptionsFilter(loggingService));

  app.useGlobalPipes(
    new ValidationPipe({}),
  );

  app.set('trust proxy', 1);
  
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
