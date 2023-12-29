import { Injectable } from "@nestjs/common";
import { TABLE_ALIAS, UK_PREFIX } from "src/config/typeorm.config";
import { Manager, ManagerDto, ManagerReq } from "src/entity/member/manager.entity";
import { DEFAULT_ROLE } from "src/entity/role/role.interface";
import { BASIC_EXCEPTION } from "src/exception/basic.exception";
import { ManagerRepository } from "src/repository/member/manager.repository";
import { getProject } from "src/singleton/project.singleton";
import { AUTH_RELATION_PATH, isContainRoles, isSameAuth, MANAGER_FULL_DETAIL, MEMBER_STATE, ProvidedSnsInfo } from "src/util/entity.util";
import { createUuid, equals, equalsTel, isUndeclared, parseTel, TEL_FORM, UNKNOWN, YYYYMMDDHHmmss } from "src/util/format.util";
import { getRepositories, TransactionHelper, TransactionHelperParam } from "src/util/typeorm.util";
import { Connection } from "typeorm";
import { MembersService } from "./members.service";
import * as dayjs from 'dayjs';
import { oneWayEnc } from "src/util/secret.util";
import { deepClone, filterVariable, getPick } from "src/util/index.util";
import { User } from "src/entity/member/user.entity";
import { MemberSignInDto, SearchManagerDto } from "src/entity/member/member.interface";
import { ListPageRes } from "src/util/entity/listPage";
import PageInfo from "src/util/entity/PageInfo";


const {
  MANAGERS, MEMBER_BASICS
} = TABLE_ALIAS;

@Injectable()
export class ManagersService {
  constructor(
    private connection: Connection,
    private membersService: MembersService,
  ) { }

  @TransactionHelper({ paramIndex: 4, isolationLevel: 'READ UNCOMMITTED' })
  async createManagerAndSns(
    dto: ManagerDto, sns: boolean, snsInfo: ProvidedSnsInfo, auth: User | Manager,
    transaction: TransactionHelperParam = { connection: this.connection, entityManager: this.connection.manager }
  ): Promise<Manager> {

    const created = await this.createManager(dto, auth, transaction);
    if (sns)
      await this.membersService.putSns(created, snsInfo, transaction)
        .then(() =>
          transaction.entityManager.getCustomRepository(ManagerRepository)
            .setProperty(['sns'], [created])
        )

    return created;
  }

  @TransactionHelper({ paramIndex: 2, isolationLevel: 'READ UNCOMMITTED' })
  async createManager(
    dto: ManagerDto, auth: User | Manager,
    transaction: TransactionHelperParam = { connection: this.connection, entityManager: this.connection.manager }
  ): Promise<Manager> {
    const prj = getProject();
    const isContainRoot = isContainRoles(dto, ['root'] as Array<DEFAULT_ROLE>);
    const isRoot = isContainRoles(auth, ['root'] as Array<DEFAULT_ROLE>);

    if (!dto)
      throw BASIC_EXCEPTION.NOT_ALLOW_EMPTY_ON_PROCESS;
    else if (isContainRoot && prj.EXIST_ROOT && !isRoot)
      throw BASIC_EXCEPTION.NOT_ALLOW_AUTH;

    const {
      identity,
      // nickname, basic, 
      roles
    } = dto;
    // const roleIsRoot = isContainRoles({roles}, ['root'] as Array<DEFAULT_ROLE>);
    const check = await this.membersService.CountDynamic({
      identity,
      // nickname, 
      // email: roleIsRoot ? undefined : basic.email, 
      isManager: true
    }, auth, false, transaction);

    if (!dto.identity || isUndeclared(check.identity) || check.identity > 0)
      throw BASIC_EXCEPTION.DUPLICATE_IDENTITY;
    // else if( !dto.nickname || isUndeclared(check.nickname) || check.nickname > 0 )
    //   throw BASIC_EXCEPTION.DUPLICATE_NICKNAME;
    // else if(!roleIsRoot && (!dto.basic.email || isUndeclared(check.email) || check.email > 0))
    //   throw BASIC_EXCEPTION.DUPLICATE_EMAIL;
    else if (!dto.password)
      throw BASIC_EXCEPTION.NOT_ALLOW_PASSWORD;
    else if (!isRoot) {
      if (dto?.basic?.tel) {
        const { basic } = dto;
        // if( 
        //   ( basic?.tel && TEL_FORM.test(basic.tel) )
        //   || ( store?.tel && TEL_FORM.test(store.tel) )
        // )
        //   throw BASIC_EXCEPTION.INCORRECT_TEL;
        // else {
        //   const [ basicCertificate, storeCertification ] = await Promise.all([
        //     basic?.tel ? this.iamportService.getCertificate(basic.tel): undefined,
        //     store?.tel ? this.iamportService.getCertificate(store.tel) : undefined
        //   ])
        //   if( basicCertificate )
        //     dto.basic.tel = basicCertificate.phone
        //       || '010-0000-0000';
        //   if( storeCertification )
        //     dto.store.tel = storeCertification.phone
        //       || '010-0000-0000';
        // }

        if (
          (basic?.tel && !TEL_FORM.test(basic.tel))
        ) {
          throw BASIC_EXCEPTION.INCORRECT_TEL;
        }
      }

    }

    if (dto.basic?.tel) {
      dto.basic.tel = parseTel(dto.basic.tel).fullFormat;
      // const secondCheck = await this.membersService.CountDynamic({ tel: dto.basic.tel, isManager: true }, auth, transaction);
      // if(secondCheck.tel > 0) {
      //   throw BASIC_EXCEPTION.DUPLICATE_TEL;
      // }
    }


    dto.uk = createUuid({ prefix: `${UK_PREFIX.MANAGER}-${dayjs().format(YYYYMMDDHHmmss)}`, length: 24 })

    const { entityManager } = transaction;
    const repos = getRepositories({
      manager: ManagerRepository
    }, entityManager);

    return repos.manager.save(dto)
      .then(() =>
        repos.manager.getOne(
          MANAGER_FULL_DETAIL,
          ctx => ctx.searchQuery()
            .where(`${ctx.alias}.id = :id`, { id: dto.id })
        )
      )
  }

  async getManagerWhereCheckAuth(checkAuth: MemberSignInDto | ProvidedSnsInfo): Promise<Manager> {
    if (!checkAuth)
      throw BASIC_EXCEPTION.NOT_ALLOW_EMPTY_ON_PROCESS;

    let manager: Manager = null;

    const repos = getRepositories({
      user: ManagerRepository
    }, this.connection.manager);
    if ('accessToken' in checkAuth) {
      if (!checkAuth.type || !checkAuth.uk)
        throw BASIC_EXCEPTION.NOT_FOUND_AUTH;
      const { type: snsType, uk: snsUk } = checkAuth;
      manager = await repos.user.searchQuery({ snsType, snsUk }).getOne()

    } else {
      if (!checkAuth.identity || !checkAuth.password)
        throw BASIC_EXCEPTION.NOT_FOUND_AUTH;

      const { identity, password } = checkAuth;
      manager = await repos.user.searchQuery({ identity }).getOne()

      if (!manager || manager.password !== oneWayEnc(password))
        throw BASIC_EXCEPTION.NOT_FOUND_AUTH;
    }

    if (!manager)
      throw BASIC_EXCEPTION.NOT_FOUND_AUTH;

    return manager;
  }

  async postSignIn(checkAuth: MemberSignInDto | ProvidedSnsInfo): Promise<Manager> {
    const manager = await this.getManagerWhereCheckAuth(checkAuth);
    const repos = getRepositories({
      manager: ManagerRepository
    }, this.connection.manager);

    await repos.manager.setProperty(AUTH_RELATION_PATH, [manager])
    const isStore = isContainRoles(manager, ['store'] as Array<DEFAULT_ROLE>);

    const { state } = manager;
    if (state === MEMBER_STATE.WAITING_REMOVE)
      throw BASIC_EXCEPTION.AUTH_STATE_IS_WAITING_REMOVE;
    if (state < MEMBER_STATE.PREPARATION)
      throw BASIC_EXCEPTION.AUTH_STATE_IS_SUSPENED;
    else if (state === MEMBER_STATE.PREPARATION)
      throw BASIC_EXCEPTION.AUTH_STATE_IS_DORMANCY;
    else if (!isContainRoles(manager, ['root', 'store'] as Array<DEFAULT_ROLE>))
      throw BASIC_EXCEPTION.NOT_ALLOW_AUTH;
    // if (isStore) {
    //   const { store } = manager
    //   if (store && store.state !== 0)
    //     throw BASIC_EXCEPTION.STORE_WAITING_ALLOW;
    //   else if (store && store.state !== -1)
    //     throw BASIC_EXCEPTION.STORE_NOT_ALLOW
    // }

    return manager
  }



  @TransactionHelper({ paramIndex: 4 })
  async patchManager(
    origin: Manager, dto: ManagerDto,
    checkAuth: MemberSignInDto | ProvidedSnsInfo, auth: Manager,
    { entityManager }: TransactionHelperParam = { connection: this.connection, entityManager: this.connection.manager }
  ): Promise<Manager> {

    const isRoot = isContainRoles(auth, ['root'] as Array<DEFAULT_ROLE>);
    const isOwner = isSameAuth(origin, auth);

    if (!origin)
      throw BASIC_EXCEPTION.NOT_FOUND_AUTH;
    else if (!dto)
      throw BASIC_EXCEPTION.NOT_ALLOW_EMPTY_ON_PROCESS
    else if (!auth || (!isOwner && !isRoot) || (!isRoot && origin.state === MEMBER_STATE.WAITING_REMOVE))
      throw BASIC_EXCEPTION.NOT_ALLOW_AUTH;
    if (!isRoot) {
      const {
        password: variablePassword, roles: variableRoles, state: variableState,
        nickname: variableNickname, identity: variableIdentity
      } = filterVariable(
        getPick(origin, ['password', 'state', 'roles', 'nickname', 'identity']),
        { ...getPick(dto, ['roles', 'state', 'nickname', 'identity']), password: dto.password ? oneWayEnc(dto.password) : undefined }
      )
      if (variablePassword) {// 패스워드를 변경하려 하면
        try { await this.getManagerWhereCheckAuth(checkAuth); }
        catch (error) {
          if (!checkAuth)
            throw BASIC_EXCEPTION.NOT_ALLOW_AUTH;
          else if ('accessToken' in checkAuth)
            throw BASIC_EXCEPTION.NOT_FOUND_SNS;
          else
            throw BASIC_EXCEPTION.CHECK_PASSWORD;
        }
      }

      if (variableRoles || (variableState && !isOwner)) //권한을 변경하거나 상태(state)를 변경하면  
        throw BASIC_EXCEPTION.NOT_ALLOW_AUTH;
      else if (variableIdentity && origin.histories?.some(his => his.identity))
        throw BASIC_EXCEPTION.EXCEEDED_NUMBER_OF_MODIFY_IDENTITY
      // else if( variableNickname && origin.histories?.some( his => his.nickname ) )
      //   throw BASIC_EXCEPTION.EXCEEDED_NUMBER_OF_MODIFY_NICKNAME
      else if (dto?.basic?.tel) {
        const { basic } = dto;
        if (equalsTel(origin.basic?.tel, basic?.tel)) {
          // if( 
          //   ( basic?.tel && TEL_FORM.test( basic?.tel ) ) 
          //   || (store?.tel && TEL_FORM.test( store?.tel )) 
          // )
          //   throw BASIC_EXCEPTION.INCORRECT_TEL;
          // else{
          //   const [ basicCertificate, storeCertification ] = await Promise.all([
          //     basic?.tel ? this.iamportService.getCertificate(basic.tel): undefined,
          //     store?.tel ? this.iamportService.getCertificate(store.tel) : undefined
          //   ])
          //   if( basicCertificate )
          //     dto.basic.tel = basicCertificate.phone;
          //   if( storeCertification )
          //     dto.store.tel = storeCertification.phone;
          // }

          // if(basic?.connectingInfo) {
          //   throw BASIC_EXCEPTION.MODIFIY_ONLY_CERTIFICATE;
          // }

          if ((basic?.tel && !TEL_FORM.test(basic.tel))) {
            throw BASIC_EXCEPTION.INCORRECT_TEL;
          }
        }
      }


      const repos = getRepositories({
        manager: ManagerRepository
      }, entityManager);

      const roleIntersection = ['prv', 'edu', 'etc'].filter(rl => origin.roles?.map(r => r.key).includes(rl));

      if (dto.basic?.tel && !equals(origin.basic?.email, dto.basic?.email)) {
        const roleAndTelManager = await repos.manager
          .emailRoleTelCheckQuery({ role: roleIntersection[0], tel: parseTel(dto.basic?.tel).fullFormat })
          .getOne();
        if (roleAndTelManager) {
          throw BASIC_EXCEPTION.DUPLICATE_TEL;
        }
      }

      if (dto.basic?.email && !equals(origin.basic?.email, dto.basic?.email)) {
        const roleAndEmailManager = await repos.manager
          .emailRoleTelCheckQuery({ role: roleIntersection[0], email: dto.basic?.email })
          .getOne();
        if (roleAndEmailManager) {
          throw BASIC_EXCEPTION.DUPLICATE_EMAIL;
        }
      }
    }

    if (dto.basic?.tel)
      dto.basic.tel = parseTel(dto.basic.tel).fullFormat;


    // if(dto.basic?.tel && dto.basic.tel !== origin.basic?.tel) {
    //   const telCheck = await this.membersService.CountDynamic({tel: dto.basic.tel, isManager: true}, origin, { connection: this.connection, entityManager });
    //   if(telCheck.tel > 0) {
    //     throw BASIC_EXCEPTION.DUPLICATE_TEL;
    //   }
    // }
    // if(dto.basic?.email && dto.basic.email !== origin.basic?.email) {
    //   const emailCheck = await this.membersService.CountDynamic({email: dto.basic.email, isManager: true}, origin, { connection: this.connection, entityManager });
    //   if(emailCheck.email > 0) {
    //     throw BASIC_EXCEPTION.DUPLICATE_EMAIL;
    //   }
    // }
    if (dto.identity && dto.identity !== origin.identity) {
      const identityCheck = await this.membersService.CountDynamic({ identity: dto.identity, isManager: true }, origin, true, { connection: this.connection, entityManager });
      if (identityCheck.identity > 0) {
        throw BASIC_EXCEPTION.DUPLICATE_IDENTITY;
      }
    }
    // if(dto.nickname && dto.nickname !== origin.nickname) {
    //   const nicknameCheck = await this.membersService.CountDynamic({nickname: dto.nickname, isManager: true}, origin, { connection: this.connection, entityManager });
    //   if(nicknameCheck.nickname > 0) {
    //     throw BASIC_EXCEPTION.DUPLICATE_NICKNAME;
    //   }
    // }

    const cloneDto = deepClone(dto),
      cloneOrigin = deepClone(origin),
      variables = filterVariable(origin as Partial<ManagerDto>, cloneDto);

    const repos = getRepositories({
      manager: ManagerRepository,
    }, entityManager);
    return repos.manager.save(dto).then(
      () => Object.assign(
        cloneOrigin,
        dto,
        variables
      )
    )
  }

  @TransactionHelper({ paramIndex: 3 })
  async deleteManager(
    origin: Manager, checkAuth: MemberSignInDto | ProvidedSnsInfo, auth: Manager,
    { entityManager }: TransactionHelperParam = { connection: this.connection, entityManager: this.connection.manager }
  ): Promise<Manager> {

    const isRoot = isContainRoles(auth, ['root'] as Array<DEFAULT_ROLE>);
    if (!origin)
      throw BASIC_EXCEPTION.NOT_ALLOW_EMPTY_ON_PROCESS;
    if (!isRoot) {
      if (!isSameAuth(origin, auth))
        throw BASIC_EXCEPTION.NOT_ALLOW_AUTH

      await this.getManagerWhereCheckAuth(checkAuth)
    }

    const cloneUser = deepClone(origin);

    return entityManager.getCustomRepository(ManagerRepository)
      .remove(origin)
      .then(() => cloneUser);
  }

  async getManagerListPage(
    search: SearchManagerDto, auth: Manager
  ): Promise<ListPageRes<Manager>> {

    const isRoot = isContainRoles(auth, ['root'] as Array<DEFAULT_ROLE>);
    if (!auth || !isRoot)
      throw BASIC_EXCEPTION.NOT_ALLOW_AUTH;

    const { curPage, rowPerPage, pagePerBlock } = search;
    const repos = getRepositories({
      manager: ManagerRepository
    }, this.connection.manager);
    const totalRow = await repos.manager.searchQuery(search)
      .getCount()
    if (totalRow === 0)
      throw BASIC_EXCEPTION.EMPTY_CONTENT;
    const page: PageInfo = new PageInfo({ curPage, rowPerPage, totalRow, pagePerBlock });
    const list = await repos.manager.getMany(
      undefined,
      ctx => ctx.searchQuery(search)
        .skip(page.startRow)
        .take(page.rowPerPage)
        .orderBy(`${ctx.alias}.id`, 'DESC')
    )

    return { page, list };
  }

  async getManager(
    origin: Manager
  ): Promise<Manager> {
    if (!origin)
      throw BASIC_EXCEPTION.EMPTY_CONTENT;
    // else if( !auth )
    //   throw BASIC_EXCEPTION.NOT_ALLOW_AUTH;
    // const isRoot = isContainRoles(auth, ['root'] as Array<DEFAULT_ROLE> ),
    //   isOwner = isSameAuth(origin, auth);
    // if( !isRoot && !isOwner )
    //   throw BASIC_EXCEPTION.NOT_ALLOW_AUTH;

    return origin;
  }

  @TransactionHelper({ paramIndex: 2 })
  async getManagerWithStoreListPage(
    search: SearchManagerDto, auth: Manager | User,
    transaction: TransactionHelperParam = { connection: this.connection, entityManager: this.connection.manager }
  ): Promise<ListPageRes<Manager>> {
    const { curPage, rowPerPage, pagePerBlock } = search;

    const repos = getRepositories({
      manager: ManagerRepository
    }, transaction.entityManager);

    if (!search.roles || search.roles.length === 0) {
      search.roles = ['store', 'prv', 'edu', 'etc'];
    }

    search.state = [MEMBER_STATE.NORMAL];

    const totalRow = await repos.manager
      .searchQuery(search)
      .leftJoin(`${MANAGERS}.basic`, `${MEMBER_BASICS}`)
      .andWhere(`${MEMBER_BASICS}.connectingInfo IS NOT NULL`)
      .getCount();
    if (totalRow === 0) {
      throw BASIC_EXCEPTION.EMPTY_CONTENT;
    }

    const page: PageInfo = new PageInfo({ curPage, rowPerPage, totalRow, pagePerBlock });

    const list = await repos.manager
      .searchQuery(search)
      .leftJoin(`${MANAGERS}.basic`, `${MEMBER_BASICS}`)
      .andWhere(`${MEMBER_BASICS}.connectingInfo IS NOT NULL`)
      .skip(page.startRow)
      .take(page.rowPerPage)
      .orderBy(`${MANAGERS}.id`, 'DESC')
      .getMany();

    return { page, list };
  }

  async readNewestRootUk(): Promise<string> {
    const repos = getRepositories({
      manager: ManagerRepository
    }, this.connection.manager);

    const newestRoot: Manager = await repos.manager.getOne(
      ['roles'],
      ctx => ctx.searchQuery({ roles: ['root'] })
        .orderBy(`${ctx.alias}.id`, 'DESC')
        .take(1)
    );

    return newestRoot.uk || UNKNOWN;
  }
}