import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { Request } from 'express'
import { Manager } from "src/entity/member/manager.entity";
import { Member } from "src/entity/member/member.interface";
import { User } from "src/entity/member/user.entity";
import { BASIC_EXCEPTION } from "src/exception/basic.exception";
import { isString } from "src/util/format.util";
import { deepClone, propertiesForEach } from "src/util/index.util";
import { ObjectType } from "typeorm";

export const DistinctionDateType = ':Date';

export const Auth = createParamDecorator(
  (data: ObjectType<Member>, ctx: ExecutionContext): Manager|User => {
    const req = ctx.switchToHttp().getRequest<Request>();
    const { session } = req;
    // console.log(session);
    const member: Manager|User = session[process.env.PARAM_KEY_SESSION_MEMEBER] ;
    if(!session || !member)
      return null;
    const { type } = member;
    if( data && data.name !== type ) 
      throw BASIC_EXCEPTION.NOT_ALLOW_USER_TYPE_ON_PROCESS;

    const cloneMember = deepClone(member);
    propertiesForEach(cloneMember, (key, val, wrapper) => {
      if(isString(val) && val.endsWith(DistinctionDateType)){
        const time = val.substring( 0, val.length - DistinctionDateType.length );
        wrapper[key] = new Date( Number(time) )
      }
    })
    return cloneMember;    
  }
)

export const setAuth = ( req: Request, auth: Manager|User ) => {
  const { session } = req;
  if( !session ) return;

  if( !auth ){
    delete session[process.env.PARAM_KEY_SESSION_MEMEBER]
    
  } else{
    const cloneAuth = deepClone(auth);
    propertiesForEach(cloneAuth, (key, val, wrapper) => {
      if( val instanceof Date ){
        wrapper[key] = `${val.getTime()}${DistinctionDateType}`;
      }
    })
    session[process.env.PARAM_KEY_SESSION_MEMEBER] = cloneAuth

  }
}


