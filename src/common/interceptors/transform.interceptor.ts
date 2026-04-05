import { type CallHandler, type ExecutionContext, HttpStatus, Injectable, type NestInterceptor } from '@nestjs/common';
import { type Observable, map } from 'rxjs';

export interface ResponseFormat<T> {
  statusCode: number;
  data: T;
  timestamp: string;
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, ResponseFormat<T> | null> {
  intercept(context: ExecutionContext, next: CallHandler<T>): Observable<ResponseFormat<T> | null> {
    const statusCode = context.switchToHttp().getResponse<{ statusCode: number }>().statusCode;

    return next.handle().pipe(
      map((data) => {
        if (statusCode === (HttpStatus.NO_CONTENT as number)) {
          return null;
        }

        return {
          statusCode,
          data,
          timestamp: new Date().toISOString(),
        };
      }),
    );
  }
}
