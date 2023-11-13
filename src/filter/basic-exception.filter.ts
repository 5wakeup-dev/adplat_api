import { ArgumentsHost, Catch, ExceptionFilter, Provider } from "@nestjs/common";
import { Request, Response } from "express";
import { BasicException } from "src/exception/basic.exception";
import * as requestIp from 'request-ip';
import { APP_FILTER } from "@nestjs/core";
import { InjectRepository } from "@nestjs/typeorm";
import { ErrorEntity } from "src/entity/error/error.entity";
import { Repository } from "typeorm";

@Catch(BasicException)
export class BasicExceptionFilter implements ExceptionFilter {
  constructor(
    @InjectRepository(ErrorEntity)
    private errorRepository: Repository<ErrorEntity>
    // private errorsSupporter: ErrorsRepository
  ){}
  catch(exception: BasicException, host: ArgumentsHost) {
    // super.catch(exception, host);
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();
    const code = exception.code;

    if(exception.options.saveLog)
      this.errorRepository.save({
        app: process.env.npm_package_name,
        version: process.env.npm_package_version,
        phase: process.env.NODE_ENV,
        header: JSON.stringify(req.headers),
        body: JSON.stringify(req.body),
        host: requestIp.getClientIp(req),
        url: `[${req.method}] ${req.url}`,
        member: JSON.stringify(req.session) ,
        message: exception.options.logMessage || exception.message
      })
    

    basicResponse(req, res, code, code, exception.message);

    // console.log('???');
    // res.status
    // res.status(code < 500 ? code : 400).json({
    //   code,
    //   message: exception.message,
    //   timestamp: new Date().toISOString(),
    //   path: req.url,
    //   method: req.method
    // })
  }
}

export const basicExceptionFilter: Provider = {
  provide: APP_FILTER,
  useClass: BasicExceptionFilter
}

export const basicResponse = (req: Request, res: Response, status: number, code: number, message: string) => {
  if(status === 204)
    res.sendStatus(status);
  else
    res.status(199 < status && status < 501 ? status : 400).json({
      code,
      message,
      timestamp: new Date().toISOString(),
      path: req.url,
      method: req.method
    })
}