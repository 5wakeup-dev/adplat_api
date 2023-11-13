import { MailerService } from "@nestjs-modules/mailer";
import { Injectable } from "@nestjs/common";
import * as dayjs from "dayjs";
import { TABLE_ALIAS } from "src/config/typeorm.config";
import { Manager } from "src/entity/member/manager.entity";
import { CountMemberDto, Member } from "src/entity/member/member.interface";
import { MemberBasic } from "src/entity/member/memberBasic.entity";
import { MemberSns } from "src/entity/member/memberSns.entity";
import { User } from "src/entity/member/user.entity";
import { NotificationDto, NotificationReq } from "src/entity/notification/notification.entity";
import { BASIC_EXCEPTION } from "src/exception/basic.exception";
import { MemberBasicRepository } from "src/repository/member/basic.repository";
import { ManagerRepository } from "src/repository/member/manager.repository";
import { MemberSnsRepository } from "src/repository/member/sns.repository";
import { UserRepository } from "src/repository/member/user.repository";
import { NotificationRepository } from "src/repository/notification/notification.repository";
import { isContainRoles, isSameAuth, MEMBER_STATE, NotificationMedia, NotificationState, notificationUtil, ProvidedSnsInfo } from "src/util/entity.util";
import { createUuid, isUndeclared, parseTel, TEL_FORM } from "src/util/format.util";
import { entriesTypeGuard, getPick } from "src/util/index.util";
import { MailerRes } from "src/util/notification.util";
import { aesEnc, oneWayEnc } from "src/util/secret.util";
import { getRepositories, TransactionHelper, TransactionHelperParam } from "src/util/typeorm.util";
import { Connection } from "typeorm";
import { NotificationsService } from "./notifications.service";
import { NotificationError } from "src/entity/notification/notificationError.entity";
import { DEFAULT_ROLE } from "src/entity/role/role.interface";
import { MemberDeviceToken, MemberDeviceTokenDto } from "src/entity/member/memberDeviceToken.entity";
import { MemberDeviceTokenRepository } from "src/repository/member/deviceToken.repository";

const {
  USERS,
  MANAGERS,
  MEMBER_BASICS,
  ATTACHMENTS,
  ENVIRONMENTS
} = TABLE_ALIAS;

@Injectable()
export class MembersService {
  constructor(
    private connection: Connection,
    private notificationsService: NotificationsService,
    private mailerService: MailerService
  ){

  }
  
  @TransactionHelper({ paramIndex: 2})
  async putSns(
    userOrManager: User|Manager, snsInfo: ProvidedSnsInfo,
    { entityManager }: TransactionHelperParam = { connection: this.connection, entityManager: this.connection.manager}
  ): Promise<MemberSns> {
    if( !userOrManager || !snsInfo )
      throw BASIC_EXCEPTION.NOT_ALLOW_EMPTY_ON_PROCESS;
    const repos = getRepositories({
      sns: MemberSnsRepository
    }, entityManager);
    const {type, uk, accessToken, } = snsInfo,
      authType = userOrManager.type,
      authTypeLowerCase = authType.toLowerCase() as 'user'|'manager',
      sns = await repos.sns.getOne(
        ['user', 'manager'],
        ctx => ctx.searchQuery()
        .where(`${ctx.alias}.type = :type AND ${ctx.alias}.uk = :uk`, { type, uk })
      ) 
      || await repos.sns.save({ type, uk, accessToken })
      .then( 
        ({id}) => repos.sns.getOne(
          undefined, 
          ctx => ctx.searchQuery()
          .where(`${ctx.alias}.id = :id`, {id})
        )
      );
    
    if( !['User', 'Manager'].includes(authType) )
      throw BASIC_EXCEPTION.NOT_ALLOW_AUTH;
      
    const snsAuth: User|Manager = sns[authTypeLowerCase];
    if( snsAuth && !isSameAuth(userOrManager, snsAuth) )
      throw BASIC_EXCEPTION.ALREADY_BEAN_COMPLETED;

    sns[authTypeLowerCase] = userOrManager as any;
    await repos.sns.save({
      id: sns.id, 
      accessToken: accessToken !== sns.accessToken ? accessToken : undefined,
      [authTypeLowerCase]: userOrManager
    })

    return sns;
  }

  @TransactionHelper({ paramIndex: 3, isolationLevel: 'READ UNCOMMITTED' })
  async CountDynamic(
    search: CountMemberDto, auth: User|Manager, isPatch: boolean = false,
    { entityManager }: TransactionHelperParam = { connection: this.connection, entityManager: this.connection.manager}
  ): Promise< Partial<Record<keyof CountMemberDto, number>> > {
    const repos = getRepositories({
      manager: ManagerRepository,
      user: UserRepository,
      sns: MemberSnsRepository
    }, entityManager)

    if(search.tel && !TEL_FORM.test(search.tel)) {
      search.tel = parseTel(search.tel).fullFormat;
    }

    // ci의 경우 manager는 role과 합쳐서 판단해야함. 단독으로 판별 불가.

    let mQuery = repos.manager.dynamicQuery(search),
      uQuery = repos.user.dynamicQuery(search);

    const [ managers, users ] = await Promise.all([
      mQuery.getMany(),
      uQuery.getMany()
    ]);
    let managerFilter = managers,
      userFilter = users
    
    if( auth && isPatch ){
      const { type } = auth;
      // const uniqueSns: Array<string> = await repos.sns.getMany(
      //   undefined,
      //   ctx => ctx.searchQuery()
      //   .where(`${ctx.alias}.${type.toLowerCase()} = :authId`, {authId: auth.id})
      // ).then( result => result.map( s => getSnsUnique(s) ));

      if( type === 'User' )
        userFilter = userFilter.filter( ({id}) => id !== auth.id )
      else if( type === 'Manager' )
        managerFilter = managerFilter.filter( ({id}) => id !== auth.id )
    }
    
    if(search.isManager) {
      return entriesTypeGuard(search).reduce((result, [key, val]) => {
        if( ['identity', 'nickname'].includes(key) ) {
          result[key] = managerFilter.filter(mng => mng[key] === val).length
            + userFilter.filter(usr => usr[key] === val).length;
        } else if( key === 'role' ) {
          result[key] = managerFilter.filter(mng =>  mng.roles?.some(({key: rKey}) => rKey === val)).length
        } else if(key === 'email') {
          result[key] = managerFilter.filter(mng => mng.basic?.email === val).length
        } else if(key === 'tel') {
          result[key] = managerFilter.filter(mng => mng.basic?.tel === val).length
        } else if(key === 'connectingInfo') {
          result[key] = managerFilter.filter(mng => mng.basic?.connectingInfo === val).length;
        }
  
        return result;
      }, {})
    } 

    return entriesTypeGuard(search).reduce((result, [key, val]) => {
      if( ['identity', 'nickname'].includes(key) ) {
        result[key] = 
          managerFilter.filter(mng => mng[key] === val).length
          +
          userFilter.filter(usr => usr[key] === val).length;
      } else if( key === 'role' ) {
        result[key] = 
          // managerFilter.filter(mng =>  mng.roles?.some(({key: rKey}) => rKey === val)).length
          // +
          userFilter.filter( usr =>  usr.roles?.some(({key: rKey}) => rKey === val)).length;
      } else if(key === 'email') {
        result[key] = 
          // managerFilter.filter(mng => mng.basic?.email === val).length
          // +
          userFilter.filter(usr => usr.basic?.email === val).length;
      } else if(key === 'tel') {
        result[key] = 
          // managerFilter.filter(mng => mng.basic?.tel === val).length
          // +
          userFilter.filter(usr => usr.basic?.tel === val).length;
      }

      return result;
    }, {})
  }

  checkAuth<T extends Member>( auth: T, type?: T['type'] ): T {
    if( !auth )
      throw BASIC_EXCEPTION.NOT_FOUND_AUTH;
    else if( type && auth.type !== type )
      throw BASIC_EXCEPTION.NOT_ALLOW_AUTH;

    return auth;
  }

  @TransactionHelper({ paramIndex: 3 })
  async findId(
    email: string, name: string, role: string,
    transaction: TransactionHelperParam = {connection: this.connection, entityManager: this.connection.manager}
    ): Promise<string> {
    if(!email || !name || !role || !['prv', 'edu', 'etc', 'member'].includes(role)) {
      throw BASIC_EXCEPTION.NOT_ALLOW_BODY;
    }

    const repos = getRepositories({
      user: UserRepository,
      manager: ManagerRepository
    }, transaction.entityManager);

    if(role === 'member') { // user 찾기
      const user = await repos.user.getOne(
        undefined,
        ctx => ctx.searchQuery({roles: [role]})
          .leftJoin(`${ctx.alias}.basic`, `${MEMBER_BASICS}`)
          .andWhere(`${MEMBER_BASICS}.email = :email`, {email})
          .andWhere(`${MEMBER_BASICS}.name = :name`, {name})
      );

      if(!user) {
        throw BASIC_EXCEPTION.NOT_FOUND_AUTH;
      }

      return user.identity;
    } else { // ['prv', 'edu', 'etc'].includes(role) === true. manager 찾기.
      const manager = await repos.manager.getOne(
        undefined,
        ctx => ctx.searchQuery({roles: [role]})
          .leftJoin(`${ctx.alias}.basic`, `${MEMBER_BASICS}`)
          .andWhere(`${MEMBER_BASICS}.email = :email`, {email})
          .andWhere(`${MEMBER_BASICS}.name = :name`, {name})
      );

      if(!manager) {
        throw BASIC_EXCEPTION.NOT_FOUND_AUTH;
      }

      return manager.identity;
    }
  }

  @TransactionHelper({ paramIndex: 3, isolationLevel: 'READ UNCOMMITTED' })
  async findPassword(
    identity: string, email: string, name: string,
    transaction: TransactionHelperParam = {connection: this.connection, entityManager: this.connection.manager}
    ): Promise<number> {
    if(!identity || !email || !name) {
      throw BASIC_EXCEPTION.NOT_ALLOW_BODY;
    }

    const repos = getRepositories({
      user: UserRepository,
      manager: ManagerRepository,
      notification: NotificationRepository,
      error: NotificationError
    }, transaction.entityManager);

    const [user, manager] = await Promise.all([
      repos.user.getOne(
        ['basic'],
        ctx => ctx.searchQuery({identity})
          .leftJoin(`${ctx.alias}.basic`, `${MEMBER_BASICS}`)
          .andWhere(`${MEMBER_BASICS}.email = :email`, {email})
          .andWhere(`${MEMBER_BASICS}.name = :name`, {name})
      ),
      repos.manager.getOne(
        ['basic'],
        ctx => ctx.searchQuery({identity})
          .leftJoin(`${ctx.alias}.basic`, `${MEMBER_BASICS}`)
          .andWhere(`${MEMBER_BASICS}.email = :email`, {email})
          .andWhere(`${MEMBER_BASICS}.name = :name`, {name})
      )
    ]);

    if((!manager && !user) || (manager && !manager.basic?.email) || (user && !user.basic?.email)) {
      throw BASIC_EXCEPTION.NOT_FOUND_AUTH;
    }

    const newestRoot: Manager = await repos.manager
      .searchQuery({roles: ['root']})
      .orderBy(`${MANAGERS}.id`, 'DESC')
      .take(1)
      .getOne();

    const tempPassword: string = createUuid({ length: 6 });
    const targetEmail = manager ? manager.basic.email : user.basic.email;

    const tempPasswordReq: NotificationReq = {
      creator: "SYSTEM",
      type: "AUTH-PASSWORD",
      media: 'EMAIL' as NotificationMedia,
      method: "SYSTEM",
      key: targetEmail,
      templateId: "findInfo/password",
      templateData: {
        domain: process.env.FRONT_DOMAIN,
        password: tempPassword
      },
      receiverUser: user?.uk || undefined,
      receiverManager: manager?.uk || undefined,
      receiverName: user ? user.basic.name : manager.basic.name,
      title: "[레슨하자] 임시 비밀번호 발급",
      state: 0
    };
    const tempPasswordDto: NotificationDto = await notificationUtil.reqToDto(
      tempPasswordReq, newestRoot,
      {
        entityManager: transaction.entityManager
      }
    );

    const tempPasswordNoti = await this.notificationsService.postNotification(tempPasswordDto, newestRoot);

    const notification = await repos.notification.getOne(
      undefined,
      ctx => ctx.searchQuery({uk: tempPasswordNoti.uk})
    );

    const { FAIL, PREPARATION, SENDED } = NotificationState;
    let resultState = PREPARATION;

    await this.mailerService
      .sendMail({
        to: targetEmail,
        subject: "[레슨하자] 임시 비밀번호 발급",
        template: 'findInfo/password',
        context: {
          domain: process.env.FRONT_DOMAIN,
          password: tempPassword
        }
      })
      .then(async (res: MailerRes) => {
        if(user) {
          await repos.user.save({...user, password: tempPassword});
        } else {
          await repos.manager.save({...manager, password: tempPassword});
        }
        notification.sended_uk = res.messageId;
        notification.state = SENDED;
        await repos.notification.save(getPick(notification, ['id', 'sended_uk', 'state']));
  
        resultState = SENDED;
      })
      .catch(async (err) => {
        notification.state = FAIL;
        const logMessage = `MailerServiceError: FAILED_SEND_MAIL: [code: ${err.code}, responseCode: ${err.responseCode}, command: ${err.command}]\r\n${err.stack}`;
        await repos.notification.save(getPick(notification, ['id', 'state']))
        await repos.error.save({
          notification,
          errorTitle: 'MailerServiceError: FAILED_SEND_MAIL',
          error: logMessage
        })
  
        resultState = FAIL;
      })

    if(resultState !== SENDED) {
      throw BASIC_EXCEPTION.SEND_TEMPPASSWORD_FAIL;
    }

    return resultState;
  }

  async updateToDeleteState(
    memberUk: string, withdrawalReason: string, auth: Manager | User,
  ): Promise<Manager | User> {
    if(!memberUk) {
      throw BASIC_EXCEPTION.NOT_ALLOW_EMPTY_ON_PROCESS;
    } else if(!auth) {
      throw BASIC_EXCEPTION.NOT_FOUND_AUTH;
    }

    const isRoot = isContainRoles(auth, ['root'] as Array<DEFAULT_ROLE>);
    if(!isRoot && auth.uk !== memberUk) {
      throw BASIC_EXCEPTION.NOT_ALLOW_AUTH;
    }

    const repos = getRepositories({
      manager: ManagerRepository,
      user: UserRepository,
      rawBasic: MemberBasic,
      rawManager: Manager,
      rawUser: User
    }, this.connection.manager);

    const [manager, user] = await Promise.all([
      repos.manager.getOne(
        ['basic'],
        ctx => ctx.searchQuery({uk: memberUk})
      ),
      repos.user.getOne(
        ['basic'],
        ctx => ctx.searchQuery({uk: memberUk})
      )
    ]);

    const deleteState = -2;
    if(!manager && !user) {
      throw BASIC_EXCEPTION.NOT_FOUND_AUTH;
    } else if(manager && !user) {
      if(manager.state === MEMBER_STATE.WAITING_REMOVE) {
        throw BASIC_EXCEPTION.ALREADY_BEAN_COMPLETED;
      }
      if(manager.basic) {
        await repos.rawBasic.save({id: manager.basic?.id,connectingInfo:manager.basic.connectingInfo?"0":undefined, withdrawalReason});
      }
      return repos.rawManager.save({id: manager.id, state: deleteState})
        .then(() => Object.assign(
          manager, {state: deleteState}
        ));
    } else {
      if(user.state === MEMBER_STATE.WAITING_REMOVE) {
        throw BASIC_EXCEPTION.ALREADY_BEAN_COMPLETED;
      }
      if(user.basic) {
        await repos.rawBasic.save({id: user.basic?.id,connectingInfo:user.basic.connectingInfo?"0":undefined, withdrawalReason});
      }
      return repos.rawUser.save({id: user.id, state: -2})
        .then(() => Object.assign(
          user, {state: deleteState}
        ));
    }
  }

  @TransactionHelper({ paramIndex: 2 })
  async createDeviceToken(
    memberDeviceTokenDto: MemberDeviceTokenDto, auth: Manager | User,
    transaction: TransactionHelperParam = { connection: this.connection, entityManager: this.connection.manager}
  ): Promise<MemberDeviceToken> {
    if(!memberDeviceTokenDto) {
      throw BASIC_EXCEPTION.NOT_ALLOW_EMPTY_ON_PROCESS;
    } else if(!auth) {
      throw BASIC_EXCEPTION.NOT_FOUND_AUTH;
    }

    if(auth.type === 'Manager') {
      memberDeviceTokenDto.manager = auth;
    } else {
      memberDeviceTokenDto.user = auth;
    }

    const repos = getRepositories({
      deviceToken: MemberDeviceTokenRepository
    }, transaction.entityManager);

    const record: MemberDeviceToken = await repos.deviceToken.getOne(
      undefined,
      ctx => ctx.searchQuery({memberUk: auth.uk})
    );

    if(record) {
      await repos.deviceToken.save({id: record.id, device: memberDeviceTokenDto.device || record.token, token: memberDeviceTokenDto.token || record.token});

      return repos.deviceToken.getOne(
        ['manager', 'user'],
        ctx => ctx.searchQuery()
          .where(`${ctx.alias}.id = :id`, {id: record.id})
      );
    } else {
      const result = await repos.deviceToken.save(memberDeviceTokenDto);

      return repos.deviceToken.getOne(
        ['manager', 'user'],
        ctx => ctx.searchQuery()
          .where(`${ctx.alias}.id = :id`, {id: result.id})
      );
    }
  }

}