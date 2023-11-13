import {
  ArgumentsHost,
  Catch,
  HttpException,
  Injectable,
  Provider,
} from '@nestjs/common';
import {Response, Request} from 'express';
import { APP_FILTER, BaseExceptionFilter } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { ErrorEntity } from 'src/entity/error/error.entity';
import { Repository } from 'typeorm';
import * as requestIp from 'request-ip';
import * as dayjs from 'dayjs';

@Catch()
@Injectable()
export class AllExceptionFilter extends BaseExceptionFilter{
  constructor(
    @InjectRepository(ErrorEntity)
    private errorRepository: Repository<ErrorEntity>
    // private errorsSupporter: ErrorsRepository
  ){
    super();
  }
  catch(exception: HttpException | Error, host: ArgumentsHost) {
    // super.catch(exception, host);
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();
    const code = exception instanceof HttpException 
                  ? exception.getStatus() 
                  : 500
    res.status(code).json({
      code: code,
      message: exception.message,
      timestamp: dayjs().format('YYYY-MM-DD HH:mm:ss.SSS'),
      path: req.url,
      method: req.method
    })
    
    if(code === 500){
      this.errorRepository.save({
        app: process.env.npm_package_name,
        version: process.env.npm_package_version,
        phase: process.env.NODE_ENV,
        header: JSON.stringify(req.headers),
        body: JSON.stringify(req.body),
        host: requestIp.getClientIp(req),
        url: `[${req.method}] ${req.url}`,
        member: JSON.stringify(req.session) ,
        message: `${exception.stack}`
      })
      console.error( exception.stack );
    }
  }
}


export const allExceptionFilter: Provider = {
  provide: APP_FILTER,
  useClass: AllExceptionFilter
}
// @Catch(HttpException)
// export class HttpExceptionFilter implements ExceptionFilter<HttpException> {
//   catch(exception: HttpException, host: ArgumentsHost) {
//     console.log('내 예외처리')
//     const ctx = host.switchToHttp();
//     const response = ctx.getResponse();
//     const request = ctx.getRequest();
//     const statusCode = exception.getStatus();
//     exception.
//     response.status(statusCode).json({
//       statusCode,
//       timestamp: new Date().toISOString(),
//       path: request.url,
//     });
//   }
// }