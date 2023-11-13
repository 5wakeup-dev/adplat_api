import { ArgumentsHost, Catch, ExceptionFilter, Provider } from "@nestjs/common";
import { MustBeEntityError, QueryFailedError, Repository } from "typeorm";
import { Request, Response } from "express";
import { basicResponse } from "./basic-exception.filter";
import { BASIC_EXCEPTION } from "src/exception/basic.exception";
import { APP_FILTER } from "@nestjs/core";
import { InjectRepository } from "@nestjs/typeorm";
import { ErrorEntity } from "src/entity/error/error.entity";
import * as requestIp from 'request-ip';

@Catch(MustBeEntityError)
export class CatchMustBeEntityErrorFilter implements ExceptionFilter {
  constructor(
    @InjectRepository(ErrorEntity)
    private errorRepository: Repository<ErrorEntity>
    // private errorsSupporter: ErrorsRepository
  ){}
  catch( exception: MustBeEntityError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();
    // const code = exception.;
    
    this.errorRepository.save({
      app: process.env.npm_package_name,
      version: process.env.npm_package_version,
      phase: process.env.NODE_ENV,
      header: JSON.stringify(req.headers),
      body: JSON.stringify(req.body),
      host: requestIp.getClientIp(req),
      url: `[${req.method}] ${req.url}`,
      member: JSON.stringify(req.session) ,
      message: `${exception.stack || exception.message}`

    })
    basicResponse(req, res, 400, BASIC_EXCEPTION.NOT_ALLOW_BODY.code, BASIC_EXCEPTION.NOT_ALLOW_BODY.message)

  }

}

export const catchMustBeEntityErrorFilter: Provider = {
  provide: APP_FILTER,
  useClass: CatchMustBeEntityErrorFilter
}

@Catch(QueryFailedError)
export class CatchQueryFiledErrorFilter implements ExceptionFilter{
  constructor(
    // private errorsSupporter: ErrorsRepository
  ){}

  catch(exception: QueryFailedError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();
    
    // this.errorsSupporter.errors.save({
    //   app: process.env.npm_package_name,
    //   version: process.env.npm_package_version,
    //   phase: process.env.NODE_ENV,
    //   header: JSON.stringify(req.headers),
    //   body: JSON.stringify(req.body),
    //   host: requestIp.getClientIp(req),
    //   url: `[${req.method}] ${req.url}`,
    //   member: JSON.stringify(req.session) ,
    //   message: `${exception.stack || exception.message}`
    // })
    basicResponse(req, res, 400, BASIC_EXCEPTION.NOT_ALLOW_BODY.code, exception.message)
  }

  // getMessage(exc: QueryFailedError): string{
  //   if(exc.message.startsWith('ER_DUP_ENTRY'))
  //     return 
  // }

}


export const catchQueryFiledErrorFilter: Provider = {
  provide: APP_FILTER,
  useClass: CatchQueryFiledErrorFilter
}
