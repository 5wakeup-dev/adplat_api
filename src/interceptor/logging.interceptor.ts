import { CallHandler, ExecutionContext, NestInterceptor, Provider } from "@nestjs/common";
import { APP_INTERCEPTOR } from "@nestjs/core";
import * as dayjs from "dayjs";
import { Request} from 'express';
import { Observable, throwError } from "rxjs";
import { catchError, tap } from "rxjs/operators";
import { toQuery } from "src/util/index.util";

// @Injectable()
export class LogginInterceptor implements NestInterceptor {

  intercept(
    context: ExecutionContext, 
    next: CallHandler<any>
  ): Observable<any> | Promise<Observable<any>> {
    // throw new Error("Method not implemented.");
    const now = dayjs();
    const req = context.switchToHttp().getRequest<Request>();
    // const path = `[${req.method}] ${req.url}`
    const { detail, ...other } = req.query;
    const path = `[${req.method}] ${req.path}${Object.keys(other).length > 0 ? `?${toQuery(other)}` : ''}`
    // console.log(`path: ${req.path}`)
    // console.log(`baseUrl: ${req.baseUrl}`)
    // console.log(`query:`,req.query)
    console.log(`${path}: START...${now.format()}`);
    if(`${process.env.NODE_ENV}` === 'dev')
      console.log(`BODY:`, req.body)
    // console.log(`LOGGIN : Start LogginInterceptor...`);
    // const route:IRoute = req.route;
    // console.log(route);
    const handler = next.handle()
    const elapsedMilliseconds = () => Date.now() - now.toDate().getTime();
      // console.log(`[${req.method}] ${req.url} - ERROR...${Date.now() - now.toDate().getTime()}ms`)
    
    return handler
      .pipe(
        catchError(err => {
          // if(err instanceof BasicException && err.code >= 60000 && err.code < 70000)
          //   console.error(err.stack); 
          // endLoggin();
          const errMsg = err?.message ? ` [${err.message}] ` : '';
          console.log(`${path}:${errMsg}ERROR...${elapsedMilliseconds()}ms`)
          return throwError( () => err )
        }),
        tap(() =>           
          console.log(`${path}: COMPLETE...${elapsedMilliseconds()}ms`)

          // console.log(`[${req.method}] ${req.url} - COMPLETED...${Date.now() - now}ms`)
        )
      );
  }

}

export const loggingInterceptorProvider: Provider = {
  provide: APP_INTERCEPTOR,
  useClass: LogginInterceptor
}