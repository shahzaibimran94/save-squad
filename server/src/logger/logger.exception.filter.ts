import {
    ExceptionFilter,
    Catch,
    ArgumentsHost,
    HttpException,
    HttpStatus,
  } from '@nestjs/common';
  import { Request, Response } from 'express';
import { LoggingService } from './logger.service';
  
  @Catch()
  export class AllExceptionsFilter implements ExceptionFilter {
    constructor(private readonly loggingService: LoggingService) {}
  
    async catch(exception: unknown, host: ArgumentsHost) {
      const ctx = host.switchToHttp();
      const response = ctx.getResponse<Response>();
      const request = ctx.getRequest<Request>();
  
      const status =
        exception instanceof HttpException
          ? exception.getStatus()
          : HttpStatus.INTERNAL_SERVER_ERROR;
  
      const errorResponse = {
        statusCode: status,
        timestamp: new Date().toISOString(),
        path: request.url,
        method: request.method,
        message:
          exception instanceof HttpException
            ? exception.getResponse()
            : 'Internal server error',
      };

      const errorData = {
        ...errorResponse,
        message: typeof errorResponse.message === 'object'
          ? JSON.stringify(errorResponse.message) // Convert object to string
          : errorResponse.message,
        stack: exception instanceof Error ? exception.stack : null,
      };
  
      // Log the error asynchronously
      await this.loggingService.logError(errorData);
  
      // Send response to client
      response.status(status).json(errorResponse.message);
    }
  }
  