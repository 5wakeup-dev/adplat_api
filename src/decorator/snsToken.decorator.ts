import { ProvidedSnsInfo } from "src/util/entity.util";
import { Request } from 'express'
import { deepClone, propertiesForEach } from "src/util/index.util";
import { DistinctionDateType } from "./auth.decorator";
import { isString, ONE_MINUTE } from "src/util/format.util";
import { BASIC_EXCEPTION } from "src/exception/basic.exception";
import { createParamDecorator, ExecutionContext } from "@nestjs/common";
// import { HttpArgumentsHost } from "@nestjs/common/interfaces";

// export const getReqAndRes = (ctx: ExecutionContext) =>{
//   const http:HttpArgumentsHost = ctx.switchToHttp();
//   const req: Request = http.getRequest<Request>();
//   const res: Response = http.getResponse<Response>();
//   return {req, res}
// }

export const SnsProvided = createParamDecorator(
  (_data: any, ctx: ExecutionContext): ProvidedSnsInfo =>
    getSnsProvided( ctx.switchToHttp().getRequest<Request>() )
)

export const getSnsProvided = (req: Request): ProvidedSnsInfo => {
  const {session} = req;
  if(!session) return undefined;
  const providedInfo: ProvidedSnsInfo = session[process.env.PARAM_KEY_SNS_PROVIDED];
  if(providedInfo){
    if( Date.now() - providedInfo.created > ONE_MINUTE * 10 ){
      delete session[process.env.PARAM_KEY_SNS_PROVIDED];
      throw BASIC_EXCEPTION.SNS_TIME_OUT;
    }

    const providedInfoClone = deepClone(providedInfo)
    propertiesForEach(providedInfo, (key, val, wrapper) => {
      if( isString(val) && val.endsWith(DistinctionDateType) ){
        const time = val.substring( 0, val.length - DistinctionDateType.length );
        wrapper[key] = new Date( Number(time) )
      }
    })
    return providedInfoClone;
  }else
    return undefined;
}
export const setSnsProvided = (req: Request, provided: ProvidedSnsInfo) => {
  const {session} = req;
  if(!session) return;
  if(!provided){
    delete session[process.env.PARAM_KEY_SNS_PROVIDED];
  }else{
    const providedInfoClone: ProvidedSnsInfo = deepClone(provided);
    propertiesForEach(providedInfoClone, (key, val, wrapper) => {
      if( val instanceof Date )
        wrapper[key] = `${val.getTime()}${DistinctionDateType}`;
    })
    session[process.env.PARAM_KEY_SNS_PROVIDED] = providedInfoClone;
  }
}