import { type ArgumentsHost, Catch, type ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { type Request, type Response } from 'express';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('Exception');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    const statusCode = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? (exception.getResponse() as string | { message: string | string[] }).toString !== Object.prototype.toString
          ? (exception.getResponse() as string)
          : ((exception.getResponse() as { message: string | string[] }).message ?? 'Something went wrong')
        : 'Internal server error';

    this.logger.error(`${request.method} ${request.url} ${statusCode} - ${JSON.stringify(message)}`, exception instanceof Error ? exception.stack : undefined);

    response.status(statusCode).json({
      statusCode,
      message,
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }
}
