import { Request } from 'express';
import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req } from "@nestjs/common";
import { Auth, setAuth } from "src/decorator/auth.decorator";
import { setSnsProvided, SnsProvided } from "src/decorator/snsToken.decorator";
import { Manager } from "src/entity/member/manager.entity";
import { User, UserDto, UserReq, UserRes } from "src/entity/member/user.entity";
import { dynamicPipe } from "src/pipe/dynamic.pipe";
import { fitPipe } from "src/pipe/fit.pipe";
import { selectPipe } from "src/pipe/select.pipe";
import { AttachmentsService } from "src/service/attachments.service";
import { UsersService } from "src/service/users.service";
import { getProject } from "src/singleton/project.singleton";
import { AUTH_RELATION_PATH, getSnsUnique, isContainRoles, isSameAuth, ProvidedSnsInfo, userUtil } from "src/util/entity.util";
import { initArray, initBoolean, initNumber, otherDelete } from "src/util/index.util";
import { Connection } from "typeorm";
import { MembersService } from 'src/service/members.service';
import { DEFAULT_ROLE } from 'src/entity/role/role.interface';
import { getRepositories, PathString } from 'src/util/typeorm.util';
import { UserRepository } from 'src/repository/member/user.repository';
import { MemberSignInDto, SearchUserDto } from 'src/entity/member/member.interface';
import { dividePipe } from 'src/pipe/divide.pipe';
import { ListPageRes } from 'src/util/entity/listPage';
import { hideTextExclude } from 'src/util/format.util';

const ALLOW_USER_ROLES = ['store', 'member'] as Array<DEFAULT_ROLE>;

const MEMBER_SIGN_FIT_PIPE = fitPipe<MemberSignInDto>(['identity', 'password'])
const BOOLEAN_PIPE = dynamicPipe<any, boolean>(({ value: val }) => {
  return val === '' ? true : initBoolean(val)
})
const USER_FIT_PIPE = fitPipe<UserReq>([
  'identity', 'nickname', 'checkPassword', 'password', 'roles', 'state', 'basic', 'histories', 'store'
])

const USER_SELECT_PIPE = selectPipe<UserReq>({
  basic: (_, val) => otherDelete(
    val,
    [
      'tel', 'email', 'primaryAddress', 'secondaryAddress',
      'name', 'gender', 'birth', 'attachmentProfile',
      'allowNotification', 'memo'
    ]
  ),
  store: (_, val) => otherDelete(
    val,
    [
      'business', 'businessNumber', 'ceo','attachment','rejectMemo',
      'address1', 'address2', 'tel', 'email','applyDate',
      'storeMemo', 'state', 'url'
    ]
  )
})
const USER_SEARCH_FIT_PIPE = fitPipe<SearchUserDto>([
  'curPage', 'rowPerPage', 'pagePerBlock','onlyStore','storeState',
  'roles', 'identity', 'nickname', 'snsType', 'snsUk', 'uk', 'state',
  'name', 'isVulnerable', 'tel'
])
const USER_SEARCH_NUMBER_PIPE = dynamicPipe<SearchUserDto>(({ value }) => {
  (['curPage', 'rowPerPage', 'pagePerBlock'] as Array<keyof SearchUserDto>)
    .forEach(key => {
      const val = value[key];
      if (val !== undefined)
        value[key] = initNumber(val) as never;
    })
  return value;
})
const USER_SEARCH_SELECT_PIPE = selectPipe<SearchUserDto>({
  roles: (_, val) => Array.isArray(val) ? val : [val],
  state: (_, val) => initArray(val),
  storeState: (_, val) => initArray(val),
  onlyStore: (_, val) => val as any === '' ? true : initBoolean(val),

})

@Controller('/users')
export class UsersController {
  constructor(
    private connection: Connection,
    private usersService: UsersService,
    private membersService: MembersService,
    private attachmentsService: AttachmentsService,
  ) { }

  @Post()
  async postUser(
    @Body(
      USER_FIT_PIPE, USER_SELECT_PIPE
    ) body: UserReq,
    @Req() req: Request,
    @Auth() auth: User | Manager,
    @Query('sns', BOOLEAN_PIPE) sns: boolean,
    @SnsProvided() snsInfo: ProvidedSnsInfo
  ): Promise<UserRes> {
    const prj = getProject();

    if (auth && !isContainRoles(auth, ['root'] as Array<DEFAULT_ROLE>)) {
      setSnsProvided(req, null);
      setAuth(req, null);
      auth = null;
    }

    const dto: UserDto = await userUtil.reqToDto(
      body,
      {
        dataBaseRoles: prj.ROLES.filter(({ key }) => ALLOW_USER_ROLES.includes(key as any)),
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
      dto.nickname = snsInfo.nickname || "회원";
      dto.basic.name = snsInfo.name || "회원";
      dto.basic.email = snsInfo.email;
      // dto.basic.tel = snsInfo.tel
      dto.basic.gender = snsInfo.gender === "male" ? 1 : 2;
    }

    return this.usersService.createUserAndSns(
      dto, sns, snsInfo, auth
    ).then(u => {
      setAuth(req, u);
      setSnsProvided(req, null);
      return new UserRes(u)
    });
  }

  @Post('/sign/in')
  signIn(
    @Body(
      MEMBER_SIGN_FIT_PIPE
    ) body: MemberSignInDto,
    @Query('sns', BOOLEAN_PIPE) sns: boolean,
    @SnsProvided() snsInfo: ProvidedSnsInfo,
    @Req() req: Request
  ): Promise<UserRes> {
    const checkAuth: MemberSignInDto | ProvidedSnsInfo = sns
      ? snsInfo
      : body

    return this.usersService.postSignIn(checkAuth)
      .then(usr => {
        setAuth(req, usr);
        // setSnsProvided(req, null);
        return new UserRes(usr);
      })
  }

  @Delete('/sign/out')
  async signOut(
    @Req() req: Request,
    @Auth(User) auth
  ): Promise<number> {
    setSnsProvided(req, null);
    if (auth) {
      setAuth(req, null);
      return 1;
    } else
      return 0
  }

  @Get()
  async getUserSelf(
    @Auth(User) auth: User,
  ): Promise<UserRes> {

    return new UserRes(this.membersService.checkAuth(auth, 'User'));
  }

  @Get('/page')
  async getUserListPage(
    @Query(
      USER_SEARCH_FIT_PIPE,
      USER_SEARCH_NUMBER_PIPE,
      USER_SEARCH_SELECT_PIPE
    ) search: SearchUserDto,
    @Auth(Manager) auth: Manager,
    @Query(
      'detail', dividePipe()
    ) details: Array<PathString<User>>
  ): Promise<ListPageRes<UserRes>> {

    return this.usersService.getUserListPage(search, auth)
      .then(async ({ page, list }) => {

        await this.connection.getCustomRepository(UserRepository)
          .setProperty(
            { details, data: { auth } },
            list
          );

        return {
          page,
          list: list.map(mng => new UserRes(mng))
        }
      })
  }

  @Get('/:user_uk')
  async getManager(
    @Param('user_uk') userUk: string,
    @Auth() auth: User | Manager,
    @Query(
      'detail', dividePipe()
    ) details: Array<PathString<User>>,
  ): Promise<UserRes> {
    const repos = getRepositories({
      user: UserRepository
    }, this.connection.manager);
    const origin: User = await repos.user.searchQuery({ uk: userUk })
      .getOne();
    return this.usersService.getUser(origin)
      .then(async mng =>
        repos.user.setProperty(
          { details, data: { auth } },
          [mng]
        ).then(() => new UserRes(mng))
      )
  }

  @Patch(['', '/:user_uk'])
  async patchUser(
    @Param('user_uk') userUk: string | undefined,
    @Body(
      USER_FIT_PIPE,
      USER_SELECT_PIPE
    ) body: UserReq,
    @Query('sns', BOOLEAN_PIPE) sns: boolean,
    @SnsProvided() snsInfo: ProvidedSnsInfo,
    @Req() req: Request,
    @Auth() auth: User | Manager
  ): Promise<UserRes> {

    // const transaction = {connection: this.connection, entityManager: this.connection.manager}
    const repos = getRepositories({
      user: UserRepository
    }, this.connection.manager);
    const prj = getProject();

    const origin: User = await repos.user
      .getOne(
        ['basic', 'store.attachment', 'histories'],
        ctx => userUk
          ? ctx.searchQuery({ uk: userUk })
          : ctx.searchQuery()
            .where(`${ctx.alias}.id = :id`, { id: auth?.id || 'NULL' })
      );
    const checkAuth = sns
      ? snsInfo
      : { identity: origin?.identity, password: body.checkPassword }


    const dto: UserDto = await userUtil.reqToDto(
      body,
      {
        origin,
        dataBaseRoles: prj.ROLES.filter(({ key }) => ALLOW_USER_ROLES.includes(key as any)),
        attachmentsService: this.attachmentsService,
        transaction: { connection: this.connection, entityManager: this.connection.manager }
      }
    );

    return this.usersService.patchUser(origin, dto, checkAuth, auth)
      .then(async usr => {
        if (isSameAuth(usr, auth))
          await repos.user.getOne(
            AUTH_RELATION_PATH,
            ctx => ctx.searchQuery()
              .where(`${ctx.alias}.id = :id`, { id: usr.id })
          ).then(refresh => setAuth(req, refresh))

        setSnsProvided(req, null);

        return new UserRes(usr)
      })
  }

  @Delete(['', '/:user_uk'])
  async deleteUser(
    @Param('user_uk') userUk: string | undefined,
    @Body(
      MEMBER_SIGN_FIT_PIPE
    ) body: MemberSignInDto,
    @Query('sns', BOOLEAN_PIPE) sns: boolean,
    @SnsProvided() snsInfo: ProvidedSnsInfo,
    @Req() req: Request,
    @Auth() auth: User | Manager
  ): Promise<number> {
    
    const checkAuth = sns ? snsInfo : body;
    const repos = getRepositories({
      user: UserRepository
    }, this.connection.manager);
    const origin: User = await repos.user
      .getOne(
        undefined,
        ctx => userUk
          ? ctx.searchQuery({ uk: userUk })
          : ctx.searchQuery()
            .where(`${ctx.alias}.id = :id`, { id: auth?.type === 'User' ? auth?.id : 'NULL' })
      )
      ;

    return this.usersService.deleteUser(
      origin, checkAuth, auth
    ).then(usr => {
      if (isSameAuth(usr, auth))
        setAuth(req, null)

      setSnsProvided(req, null);

      return 1;
    })
  }

  @Get('find/id')
  async findId(
    @Query("userEmail") userEmail: string,
    @Query("userTel") userTel: string
  ): Promise<string> {
    return this.usersService.findId(userEmail, userTel)
      .then(identity => {
        return hideTextExclude({
          text: identity,
          padChar: "*",
          excludeLength: identity.length - 2
        });
      })
  }
}