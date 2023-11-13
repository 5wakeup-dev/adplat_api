import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { Request } from 'express'

export const LANG = createParamDecorator(
  (_data: any, ctx: ExecutionContext) => getLANG(ctx.switchToHttp().getRequest<Request>())
)

export const getLANG = (req: Request):string => {
  // const req = ctx.switchToHttp().getRequest<Request>();
  const queryLang = req.query[process.env.PARAM_KEY_LANG];
  const lang:string = queryLang
    ? (Array.isArray(queryLang) 
      ? queryLang[0] as string
      : queryLang as string )
    : process.env.DEFAULT_LANG;
  return lang;
}