import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { Request } from 'express'
import * as requestIp from 'request-ip';

export const ClientIp = createParamDecorator(
  (_data: any, ctx: ExecutionContext) => 
    requestIp.getClientIp(ctx.switchToHttp().getRequest<Request>())
)
