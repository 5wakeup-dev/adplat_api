import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req } from "@nestjs/common";
import * as dayjs from "dayjs";
import { Request } from 'express';
import { TABLE_ALIAS, UK_PREFIX } from "src/config/typeorm.config";
import { Auth, setAuth } from "src/decorator/auth.decorator";
import { setSnsProvided, SnsProvided } from "src/decorator/snsToken.decorator";
import { ConsultingDto } from "src/entity/consulting/consulting.entity";
import { Manager, ManagerDto, ManagerReq, ManagerRes } from "src/entity/member/manager.entity";
import { MemberSignInDto, SearchManagerDto } from "src/entity/member/member.interface";
import { User } from "src/entity/member/user.entity";
import { DEFAULT_ROLE } from "src/entity/role/role.interface";
import { dividePipe } from "src/pipe/divide.pipe";
import { dynamicPipe } from "src/pipe/dynamic.pipe";
import { fitPipe } from "src/pipe/fit.pipe";
import { selectPipe } from "src/pipe/select.pipe";
import { ManagerRepository } from "src/repository/member/manager.repository";
import { MenuRepository } from "src/repository/menu/menu.repository";
import { AttachmentsService } from "src/service/attachments.service";
import { ConsultingsService } from "src/service/consultings.service";
import { ManagersService } from "src/service/managers.service";
import { MembersService } from "src/service/members.service";
import { getProject } from "src/singleton/project.singleton";
import { AUTH_RELATION_PATH, getSnsUnique, isContainRoles, isSameAuth, managerUtil, ProvidedSnsInfo } from "src/util/entity.util";
import { ListPageRes } from "src/util/entity/listPage";
import { createUuid, hideTextExclude, UNKNOWN, YYYYMMDDHHmmss } from "src/util/format.util";
import { initArray, initBoolean, initNumber, otherDelete } from "src/util/index.util";
import { getRepositories, PathString } from "src/util/typeorm.util";
import { Connection } from "typeorm";

const ALLOW_MANAGER_ROLES = ['store', 'root'] as Array<DEFAULT_ROLE>;

const MEMBER_SIGN_FIT_PIPE = fitPipe<MemberSignInDto>(['identity', 'password']);

const BOOLEAN_PIPE = dynamicPipe<any, boolean>(({ value: val }) => {
  return val === '' ? true : initBoolean(val)
})
const MANAGER_FIT_PIPE = fitPipe<ManagerReq>([
  'identity', 'nickname', 'checkPassword', 'password', 'roles', 'state', 'basic',
 
])
const MANAGER_SELECT_PIPE = selectPipe<ManagerReq>({
  basic: (_, val) => otherDelete(
    val,
    [
      'tel', 'email', 'primaryAddress', 'secondaryAddress',
      'name', 'gender', 'birth', 'attachmentProfile',
      'allowNotification', 'memo'
    ]
  )
})

const MANAGER_SEARCH_FIT_PIPE = fitPipe<SearchManagerDto>([
  'curPage', 'rowPerPage', 'pagePerBlock',
  'roles', 'identity', 'nickname', 'snsType', 'snsUk', 'uk', 'state',
  'name', 'isVulnerable', 'tel', 'addressUk', 'parentAddressUk', 'searchAddresses'
])
const MANAGER_SEARCH_NUMBER_PIPE = dynamicPipe<SearchManagerDto>(({ value }) => {
  (['curPage', 'rowPerPage', 'pagePerBlock'] as Array<keyof SearchManagerDto>)
    .forEach(key => {
      const val = value[key];
      if (val !== undefined)
        value[key] = initNumber(val) as never;
    })
  return value;
})
const MANAGER_SEARCH_SELECT_PIPE = selectPipe<SearchManagerDto>({
  roles: (_, val) => Array.isArray(val) ? val : [val],
  state: (_, val) => initArray(val)
})

const {
  ADDRESSES
} = TABLE_ALIAS;

@Controller('/managers')
export class ManagersController {
  constructor(
    private connection: Connection,
    private managersService: ManagersService,
    private membersService: MembersService,
    private attachmentsService: AttachmentsService,
  ) { }

  @Post()
  async postManager(
    @Body(
      MANAGER_FIT_PIPE, MANAGER_SELECT_PIPE
    ) body: ManagerReq,
    @Req() req: Request,
    @Auth() auth: User | Manager,
    @Query('sns', BOOLEAN_PIPE) sns: boolean,
    @SnsProvided() snsInfo: ProvidedSnsInfo
  ): Promise<ManagerRes> {
    const prj = getProject();
    const isRoot = isContainRoles(auth, ['root'] as Array<DEFAULT_ROLE>);

    if(auth && !isRoot) {
      setSnsProvided(req, null);
      setAuth(req, null);
      auth = null;
    }
    

    const dto: ManagerDto = await managerUtil.reqToDto(
      body,
      {
        dataBaseRoles: prj.ROLES.filter(({ key }) => ALLOW_MANAGER_ROLES.includes(key as any)),
        attachmentsService: this.attachmentsService,
        transaction: { connection: this.connection, entityManager: this.connection.manager }
      }
    )

    if (sns && (!dto.identity || !dto.password)) {
      const unique = getSnsUnique(snsInfo);
      ['identity', 'password'].forEach(key => {
        if (!dto[key])
          dto[key] = unique;
      })
    }


    return this.managersService.createManagerAndSns(
      dto, sns, snsInfo, auth
    )
      .then(async mng => new ManagerRes(mng)
      );
  }

  @Post('/sign/in')
  signIn(
    @Body(
      MEMBER_SIGN_FIT_PIPE
    ) dto: MemberSignInDto,
    @Query('sns', BOOLEAN_PIPE) sns: boolean,
    @SnsProvided() snsInfo: ProvidedSnsInfo,
    @Req() req: Request
  ): Promise<ManagerRes> {
    const checkAuth: MemberSignInDto | ProvidedSnsInfo = sns
      ? snsInfo
      : dto

    return this.managersService.postSignIn(checkAuth)
      .then(mng => {
        setAuth(req, mng);
        setSnsProvided(req, null);
        return new ManagerRes(mng);
      })
  }

  @Delete('/sign/out')
  async signOut(
    @Req() req: Request,
    @Auth(Manager) auth
  ): Promise<number> {
    setSnsProvided(req, null);
    if (auth) {
      setAuth(req, null);
      return 1;
    } else
      return 0
  }

  @Get()
  async getManagerSelf(
    @Auth(Manager) auth: Manager
  ): Promise<ManagerRes> {

    return new ManagerRes(this.membersService.checkAuth(auth, 'Manager'));
  }

  @Get('/page')
  async getManagerListPage(
    @Query(
      MANAGER_SEARCH_FIT_PIPE,
      MANAGER_SEARCH_NUMBER_PIPE,
      MANAGER_SEARCH_SELECT_PIPE
    ) search: SearchManagerDto,
    @Auth(Manager) auth: Manager,
    @Query(
      'detail', dividePipe()
    ) details: Array<PathString<Manager>>
  ): Promise<ListPageRes<ManagerRes>> {

 

    return this.managersService.getManagerListPage(search, auth)
      .then(async ({ page, list }) => {

        await this.connection.getCustomRepository(ManagerRepository)
          .setProperty(
            { details, data: { auth } },
            list
          );

        return {
          page,
          list: list.map(mng => new ManagerRes(mng))
        }
      })
  }

  @Get('/:manager_uk')
  async getManager(
    @Param('manager_uk') managerUk: string,
    @Auth() auth: User | Manager,
    @Query(
      'detail', dividePipe()
    ) details: Array<PathString<Manager>>,
  ): Promise<ManagerRes> {
    const repos = getRepositories({
      manager: ManagerRepository
    }, this.connection.manager);
    const origin: Manager = await repos.manager.searchQuery({ uk: managerUk })
      .getOne();
    return this.managersService.getManager(origin)
      .then(async mng =>
        repos.manager.setProperty(
          { details, data: { auth } },
          [mng]
        ).then(() => new ManagerRes(mng))
      )
  }

  @Get('store/page')
  async getManagerWithStoreListPage(
    @Query(
      MANAGER_SEARCH_FIT_PIPE,
      MANAGER_SEARCH_NUMBER_PIPE,
      MANAGER_SEARCH_SELECT_PIPE
    ) search: SearchManagerDto,
    @Auth() auth: Manager | User,
    @Query(
      'detail', dividePipe()
    ) details: Array<PathString<Manager>>
  ): Promise<ListPageRes<ManagerRes>> {
    
    return this.managersService.getManagerWithStoreListPage(search, auth)
      .then(async ({ page, list }) => {
        await this.connection.manager.getCustomRepository(ManagerRepository)
          .setProperty({ details, data: { auth } }, list);

        for (const item of list) {
          if (item.basic) {
            item.basic.connectingInfo = undefined;
          }
          item.identity = hideTextExclude({
            text: item.identity,
            padChar: "*",
            excludeLength: item.identity.length - 2
          });
        }

        return {
          page,
          list: list.map(mng => new ManagerRes(mng))
        }
      })
  }


  @Patch(['', '/:manager_uk'])
  async patchManager(
    @Param('manager_uk') managerUk: string | undefined,
    @Body(
      MANAGER_FIT_PIPE,
      MANAGER_SELECT_PIPE
    ) body: ManagerReq,
    @Query('sns', BOOLEAN_PIPE) sns: boolean,
    @SnsProvided() snsInfo: ProvidedSnsInfo,
    @Req() req: Request,
    @Auth(Manager) auth: Manager
  ): Promise<ManagerRes> {

    const transaction = { connection: this.connection, entityManager: this.connection.manager }
    const repos = getRepositories({
      manager: ManagerRepository
    }, transaction.entityManager);
    const prj = getProject();

    const origin: Manager = await repos.manager
      .getOne(
        ['basic', 'histories'],
        ctx => managerUk
          ? ctx.searchQuery({ uk: managerUk })
          : ctx.searchQuery()
            .where(`${ctx.alias}.id = :id`, { id: auth?.id || 'NULL' })
      )
      ;
    const dto: ManagerDto = await managerUtil.reqToDto(
      body,
      {
        origin,
        dataBaseRoles: prj.ROLES.filter(({ key }) => ALLOW_MANAGER_ROLES.includes(key as any)),
        attachmentsService: this.attachmentsService,
        transaction: { connection: this.connection, entityManager: this.connection.manager }
      }
    );
    const checkAuth = sns
      ? snsInfo
      : { identity: origin?.identity, password: body.checkPassword }

    return this.managersService.patchManager(origin, dto, checkAuth, auth, transaction)
      .then(async mng => {
        if (isSameAuth(mng, auth))
          await repos.manager.getOne(
            AUTH_RELATION_PATH,
            ctx => ctx.searchQuery()
              .where(`${ctx.alias}.id = :id`, { id: mng.id })
          ).then(refresh => setAuth(req, refresh))

        setSnsProvided(req, null);

        return new ManagerRes(mng)
      })
  }

  @Delete(['', '/:manager_uk'])
  async deleteUser(
    @Param('manager_uk') managerUk: string | undefined,
    @Body(
      MEMBER_SIGN_FIT_PIPE
    ) body: MemberSignInDto,
    @Query('sns', BOOLEAN_PIPE) sns: boolean,
    @SnsProvided() snsInfo: ProvidedSnsInfo,
    @Req() req: Request,
    @Auth(Manager) auth: Manager
  ): Promise<number> {

    const checkAuth = sns ? snsInfo : body;
    const repos = getRepositories({
      manager: ManagerRepository
    }, this.connection.manager);

    const origin: Manager = await repos.manager
      .getOne(
        undefined,
        ctx => managerUk
          ? ctx.searchQuery({ uk: managerUk })
          : ctx.searchQuery()
            .where(`${ctx.alias}.id = :id`, { id: auth?.id || 'NULL' })
      )
      ;

    return this.managersService.deleteManager(
      origin, checkAuth, auth
    ).then(usr => {
      if (isSameAuth(usr, auth))
        setAuth(req, null)

      setSnsProvided(req, null);

      return 1;
    })
  }

  @Get('find/newestRoot')
  async readNewestRootUk(): Promise<string> {
    return this.managersService.readNewestRootUk();
  }

}