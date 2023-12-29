import { Injectable } from "@nestjs/common";
import * as dayjs from "dayjs";
import { TABLE_ALIAS, UK_PREFIX } from "src/config/typeorm.config";
import { Manager } from "src/entity/member/manager.entity";
import { MemberSignInDto, SearchUserDto } from "src/entity/member/member.interface";
import { User, UserDto } from "src/entity/member/user.entity";
import { DEFAULT_ROLE } from "src/entity/role/role.interface";
import { BASIC_EXCEPTION } from "src/exception/basic.exception";
import { UserRepository } from "src/repository/member/user.repository";
import { AUTH_RELATION_PATH, isContainRoles, isSameAuth, MEMBER_STATE, ProvidedSnsInfo, USER_FULL_DETAIL } from "src/util/entity.util";
import { ListPageRes } from "src/util/entity/listPage";
import PageInfo from "src/util/entity/PageInfo";
import { createUuid, equalsTel, isUndeclared, parseTel, TEL_FORM, YYYYMMDDHHmmss } from "src/util/format.util";
import { deepClone, filterVariable, getPick } from "src/util/index.util";
import { oneWayEnc } from "src/util/secret.util";
import { getRepositories, TransactionHelper, TransactionHelperParam } from "src/util/typeorm.util";
import { Connection } from "typeorm";
import { MembersService } from "./members.service";

const {
  USERS, MEMBER_BASICS
} = TABLE_ALIAS;


@Injectable()
export class UsersService {
  constructor(
    private connection: Connection,
    private membersService: MembersService

  ){}

  @TransactionHelper({ paramIndex: 4, isolationLevel: 'READ UNCOMMITTED'})
  async createUserAndSns(
    dto: UserDto, sns: boolean, snsInfo: ProvidedSnsInfo, auth: User|Manager,
    transaction: TransactionHelperParam = { connection: this.connection, entityManager: this.connection.manager}
  ): Promise<User> {
    const created = await this.createUser(dto, auth, transaction);
    if(sns)
      await this.membersService.putSns(created, snsInfo, transaction)
      .then( () => 
        transaction.entityManager.getCustomRepository(UserRepository)
        .setProperty([ 'sns' ], [ created ])
      )

    return created;
  } 

  @TransactionHelper({ paramIndex: 2, isolationLevel: 'READ UNCOMMITTED' })
  async createUser(
    dto: UserDto, auth: User|Manager,
    transaction: TransactionHelperParam = { connection: this.connection, entityManager: this.connection.manager}
  ): Promise<User> {
    const isContainRootOrStore = isContainRoles(dto, ['root'] as Array<DEFAULT_ROLE> );
    const isRoot = isContainRoles(auth, ['root'] as Array<DEFAULT_ROLE> );

    if( !dto )
      throw BASIC_EXCEPTION.NOT_ALLOW_EMPTY_ON_PROCESS;
    else if( isContainRootOrStore )
      throw BASIC_EXCEPTION.NOT_ALLOW_AUTH;
      
    const { identity, nickname, basic } = dto;
    const { email } = basic;
    const check = await this.membersService.CountDynamic({
      identity,
      // nickname,
      email
    }, auth, false, transaction);

    if( !dto.identity || isUndeclared(check.identity) || check.identity > 0 )
      throw BASIC_EXCEPTION.DUPLICATE_IDENTITY;
    // else if( !dto.nickname
    //    || isUndeclared(check.nickname) || check.nickname > 0 
    // )
    //   throw BASIC_EXCEPTION.DUPLICATE_NICKNAME;
    // else if(!dto.basic.email || isUndeclared(check.email) || check.email > 0)
    //   throw BASIC_EXCEPTION.DUPLICATE_EMAIL;
    else if( !dto.password )
      throw BASIC_EXCEPTION.NOT_ALLOW_PASSWORD;
    else if( !isRoot ){
      if( dto.basic?.tel ){
        const { tel } = dto.basic;
        // if( TEL_FORM.test(tel) ) {
        //   throw BASIC_EXCEPTION.INCORRECT_TEL;
        // } else {
        //   const iamportCertificate = await this.iamportService.getCertificate(tel);
        //   dto.basic.tel = iamportCertificate.phone
        //     || '010-0000-0000';
        // }
        
        // if(!TEL_FORM.test(tel)) {
        //   throw BASIC_EXCEPTION.INCORRECT_TEL;
        // }
      }

      // const ciCheck = await this.membersService.CountDynamic({connectingInfo: dto.basic?.connectingInfo}, auth, transaction);
      // if(ciCheck.connectingInfo > 0) {
      //   throw BASIC_EXCEPTION.EXIST_MEMBER_INFO;
      // } 
    }

    if( dto?.basic?.tel ) {
      dto.basic.tel = parseTel(dto.basic.tel).fullFormat;
      const secondCheck = await this.membersService.CountDynamic({ tel: dto.basic.tel }, auth, false, transaction);
      if(secondCheck.tel > 0) {
        throw BASIC_EXCEPTION.DUPLICATE_TEL;
      }
    }
    
    dto.uk = createUuid({ prefix: `${UK_PREFIX.USER}-${dayjs().format(YYYYMMDDHHmmss)}`, length: 24})
    const { entityManager } = transaction;
    const repos = getRepositories({
      user: UserRepository
    }, entityManager);

    return repos.user.save(dto)
      .then( () => 
        repos.user.getOne(
          USER_FULL_DETAIL,
          ctx => ctx.searchQuery()
          .where(`${ctx.alias}.id = :id`, {id: dto.id})
        )
      )
  }

  async getUserWhereCheckAuth( checkAuth: MemberSignInDto|ProvidedSnsInfo ): Promise<User> {
    if( !checkAuth )
      throw BASIC_EXCEPTION.NOT_ALLOW_EMPTY_ON_PROCESS;

    let user: User = null;

    const repos = getRepositories({
      user: UserRepository
    }, this.connection.manager);
    if( 'accessToken' in checkAuth ){
      if( !checkAuth.type || !checkAuth.uk )
        throw BASIC_EXCEPTION.NOT_FOUND_AUTH;
      const { type: snsType, uk: snsUk } = checkAuth;
      user = await repos.user.searchQuery({ snsType, snsUk }).getOne()

    }else{
      if( !checkAuth.identity || !checkAuth.password )
        throw BASIC_EXCEPTION.NOT_FOUND_AUTH;

      const { identity, password } = checkAuth;
      user = await repos.user.searchQuery({ identity }).getOne()
      
      if( !user || user.password !== oneWayEnc(password) )
        throw BASIC_EXCEPTION.NOT_FOUND_AUTH;
    }

    if( !user )
      throw BASIC_EXCEPTION.NOT_FOUND_AUTH;

    return user;
  }

  async postSignIn( checkAuth: MemberSignInDto|ProvidedSnsInfo ): Promise<User> {
    
    const user = await this.getUserWhereCheckAuth( checkAuth )
    const repos = getRepositories({
      user: UserRepository
    }, this.connection.manager);

    await repos.user.setProperty([...AUTH_RELATION_PATH,'store',"basic"], [user])
    const isStore = isContainRoles(user, ['store'] as Array<DEFAULT_ROLE>);


    const { state } = user;
    if( state === MEMBER_STATE.WAITING_REMOVE)
      throw BASIC_EXCEPTION.AUTH_STATE_IS_WAITING_REMOVE;
    else if( state < MEMBER_STATE.PREPARATION)
      throw BASIC_EXCEPTION.AUTH_STATE_IS_SUSPENED;
    else if( state === MEMBER_STATE.PREPARATION )
      throw BASIC_EXCEPTION.AUTH_STATE_IS_DORMANCY;
    else if( !isContainRoles(user, ['member'] as Array<DEFAULT_ROLE>) )
      throw BASIC_EXCEPTION.NOT_ALLOW_AUTH;
    
    return user
  }

  @TransactionHelper({ paramIndex: 5 })
  async patchUser(
    origin: User, dto: UserDto, 
    checkAuth: MemberSignInDto|ProvidedSnsInfo, auth: User|Manager,
    { entityManager }: TransactionHelperParam = { connection: this.connection, entityManager: this.connection.manager}
  ): Promise<User> {

    const isRoot = isContainRoles(auth, ['root'] as Array<DEFAULT_ROLE> );
    const isOwner = isSameAuth(origin, auth);

    if( !origin )
      throw BASIC_EXCEPTION.NOT_FOUND_AUTH;
    else if( !dto )
      throw BASIC_EXCEPTION.NOT_ALLOW_EMPTY_ON_PROCESS
    else if( !auth || (!isOwner && !isRoot) || (!isRoot && origin.state === MEMBER_STATE.WAITING_REMOVE) )
      throw BASIC_EXCEPTION.NOT_ALLOW_AUTH;
    if( !isRoot ){
      const {
        password: variablePassword, roles: variableRoles, state: variableState,
        nickname: variableNickname, identity: variableIdentity
      } = filterVariable(
        getPick(origin, ['password', 'state', 'roles', 'nickname', 'identity']), 
        {
          ...getPick(dto, ['roles', 'state', 'nickname', 'identity']), 
          password: dto.password ? oneWayEnc(dto.password) : undefined
        }
      )
      // const variableTel = dto?.basic?.tel ? equalsTel(origin?.basic?.tel, dto?.basic?.tel) : ;
      if( variablePassword ) {// 패스워드를 변경하려 하면
        try { await this.getUserWhereCheckAuth(checkAuth); } 
        catch (error) { 
          if( !checkAuth )
            throw BASIC_EXCEPTION.NOT_ALLOW_AUTH;
          else if( 'accessToken' in checkAuth )
            throw BASIC_EXCEPTION.NOT_FOUND_SNS;
          else
            throw BASIC_EXCEPTION.CHECK_PASSWORD; 
        }
      }
      else if( variableRoles || variableState ) //권한을 변경하거나 상태(state)를 변경하면  
        throw BASIC_EXCEPTION.NOT_ALLOW_AUTH;
      else if( variableIdentity && origin.histories?.some( his => his.identity ) )
        throw BASIC_EXCEPTION.EXCEEDED_NUMBER_OF_MODIFY_IDENTITY
      // else if( variableNickname && origin.histories?.some( his => his.nickname ) )
      //   throw BASIC_EXCEPTION.EXCEEDED_NUMBER_OF_MODIFY_NICKNAME
      else if( dto?.basic?.tel ){
        if( !equalsTel(origin?.basic?.tel, dto.basic.tel) ){
          // if( TEL_FORM.test(dto.basic.tel) )
          //   throw BASIC_EXCEPTION.INCORRECT_TEL;
          // else{
          //   const iamportCertificate = await this.iamportService.getCertificate(dto.basic.tel);
          //   dto.basic.tel = iamportCertificate.phone;
          // }

          // if(dto.basic?.connectingInfo) {
          //   throw BASIC_EXCEPTION.MODIFIY_ONLY_CERTIFICATE;
          // }

          if(!TEL_FORM.test(dto.basic.tel)) {
            throw BASIC_EXCEPTION.INCORRECT_TEL;
          }
        }
      }
    }

    if (dto.store && isOwner && !origin?.store) dto.store.state = 0
    if( dto.basic?.tel )
      dto.basic.tel = parseTel(dto.basic.tel).fullFormat;
    
    if(dto.basic?.tel && dto.basic.tel !== origin.basic?.tel) {
      const telCheck = await this.membersService.CountDynamic({tel: dto.basic.tel}, origin, true, { connection: this.connection, entityManager });
      if(telCheck.tel > 0) {
        throw BASIC_EXCEPTION.DUPLICATE_TEL;
      }
    }
    // if(dto.basic?.email && dto.basic.email !== origin.basic?.email) {
    //   const emailCheck = await this.membersService.CountDynamic({email: dto.basic.email}, origin, true, { connection: this.connection, entityManager });
    //   if(emailCheck.email > 0) {
    //     throw BASIC_EXCEPTION.DUPLICATE_EMAIL;
    //   }
    // }
    if(dto.identity && dto.identity !== origin.identity) {
      const identityCheck = await this.membersService.CountDynamic({identity: dto.identity}, origin, true, { connection: this.connection, entityManager });
      if(identityCheck.identity > 0) {
        throw BASIC_EXCEPTION.DUPLICATE_IDENTITY;
      }
    }
    // if(dto.nickname && dto.nickname !== origin.nickname) {
    //   const nicknameCheck = await this.membersService.CountDynamic({nickname: dto.nickname}, origin, { connection: this.connection, entityManager });
    //   if(nicknameCheck.nickname > 0) {
    //     throw BASIC_EXCEPTION.DUPLICATE_NICKNAME;
    //   }
    // }

    const cloneDto = deepClone(dto),
      cloneOrigin = deepClone(origin),
      variables = filterVariable(origin as Partial<UserDto>, cloneDto);

    const repos = getRepositories({
      user: UserRepository
    }, entityManager);

    return repos.user.save(dto).then( 
      () => Object.assign(
        cloneOrigin,
        dto,
        variables
      )
    )
  }

  @TransactionHelper({ paramIndex: 3 })
  async deleteUser(
    origin: User, checkAuth: MemberSignInDto|ProvidedSnsInfo, auth: User|Manager,
    { entityManager }: TransactionHelperParam = { connection: this.connection, entityManager: this.connection.manager}
  ): Promise<User> {

    const isRoot = isContainRoles(auth, ['root'] as Array<DEFAULT_ROLE> );
    if( !origin )
      throw BASIC_EXCEPTION.NOT_ALLOW_EMPTY_ON_PROCESS;
    if( !isRoot ){
      if( !isSameAuth(origin, auth) )
        throw BASIC_EXCEPTION.NOT_ALLOW_AUTH

      await this.getUserWhereCheckAuth(checkAuth)
    }

    const cloneUser = deepClone(origin);
    
    return entityManager.getCustomRepository(UserRepository)
    .remove(origin)
    .then( () => cloneUser );
  }

  async getUserListPage(
    search: SearchUserDto, auth: User|Manager
  ): Promise<ListPageRes<User>> {
    const isRoot = isContainRoles(auth, ['root'] as Array<DEFAULT_ROLE> );
    if( !auth || !isRoot )
      throw BASIC_EXCEPTION.NOT_ALLOW_AUTH;
    
    const { curPage, rowPerPage, pagePerBlock } = search;
    const repos = getRepositories({
      user: UserRepository
    }, this.connection.manager);
    const totalRow = await repos.user.searchQuery(search)
    .getCount()
    if( totalRow === 0 )
      throw BASIC_EXCEPTION.EMPTY_CONTENT;
    const page: PageInfo = new PageInfo({curPage, rowPerPage, totalRow, pagePerBlock});
    const list = await repos.user.getMany(
      undefined,
      ctx => ctx.searchQuery(search)
      .skip(page.startRow)
      .take(page.rowPerPage)
      .orderBy(`${ctx.alias}.id`, 'DESC')
    )

    return { page, list };
  }

  async getUser(
    origin: User
  ): Promise<User> {
    if( !origin )
      throw BASIC_EXCEPTION.EMPTY_CONTENT;
    // else if( !auth )
    //   throw BASIC_EXCEPTION.NOT_ALLOW_AUTH;
    // const isRoot = isContainRoles(auth, ['root'] as Array<DEFAULT_ROLE> ),
    //   isOwner = isSameAuth(origin, auth);
    // if( !isRoot && !isOwner )
    //   throw BASIC_EXCEPTION.NOT_ALLOW_AUTH;
    
    return origin;
  }

  async findId(
    userEmail: string, userTel: string
  ): Promise<string> {
    if(!userEmail || !userTel) {
      throw BASIC_EXCEPTION.NOT_ALLOW_BODY;
    }


    const tel = userTel;

    const repos = getRepositories({
      user: UserRepository
    }, this.connection.manager);

    const user = await repos.user.searchQuery()
      .leftJoin(`${USERS}.basic`, `${MEMBER_BASICS}`)
      .where(`${MEMBER_BASICS}.tel = :tel`, {tel: parseTel(tel).fullFormat})
      .andWhere(`${MEMBER_BASICS}.email = :userEmail`, {userEmail})
      .getOne();

    if(!user) {
      throw BASIC_EXCEPTION.NOT_FOUND_AUTH;
    }

    return user.identity;
  }
}