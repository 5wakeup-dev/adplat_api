import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req } from "@nestjs/common";
import { Auth, setAuth } from "src/decorator/auth.decorator";
import { setSnsProvided, SnsProvided } from "src/decorator/snsToken.decorator";
import { Manager, ManagerRes } from "src/entity/member/manager.entity";
import { CountMemberDto, COUNT_MEMBER_KEYS, MemberSignInDto, WithdrawalMemberDto } from "src/entity/member/member.interface";
import { User, UserRes } from "src/entity/member/user.entity";
import { dynamicPipe } from "src/pipe/dynamic.pipe";
import { fitPipe } from "src/pipe/fit.pipe";
import { MembersService } from "src/service/members.service";
import { isSameAuth, NotificationState, ProvidedSnsInfo } from "src/util/entity.util";
import { initBoolean } from "src/util/index.util";
import { Connection } from "typeorm";
import { Request } from 'express'
import { ManagersService } from "src/service/managers.service";
import { UsersService } from "src/service/users.service";
import { hideTextExclude, isUndeclared } from "src/util/format.util";
import { getRepositories } from "src/util/typeorm.util";
import { UserRepository } from "src/repository/member/user.repository";
import { ManagerRepository } from "src/repository/member/manager.repository";
import { MemberBasicRes } from "src/entity/member/memberBasic.entity";
import { MemberDeviceTokenDto, MemberDeviceTokenReq, MemberDeviceTokenRes } from "src/entity/member/memberDeviceToken.entity";
import { UK_PREFIX } from "src/config/typeorm.config";
import { EnvironmentRepository } from "src/repository/comm/environment.repository";
import { AttachmentRepository } from "src/repository/comm/attachment.repository";
const MEMBER_SIGN_FIT_PIPE = fitPipe<MemberSignInDto>(['identity', 'password']);
const BOOLEAN_PIPE = dynamicPipe<any, boolean>( ({value: val}) => {
  return val === '' ? true : initBoolean(val)
})

const MEMBER_FIT_PIPE = fitPipe<CountMemberDto>( COUNT_MEMBER_KEYS )

const sendTempPasswordSuccess = '임시비밀번호가 이메일로 발송되었습니다.';
const sendTempPasswordFail = '임시비밀번호 발급에 실패하셨습니다.';

const DEVICE_TOKEN_FIT_PIPE = fitPipe<MemberDeviceTokenReq>([
  'device', 'token'
])


@Controller('/members')
export class MembersController {
  constructor(
    private connection: Connection,
    private membersService: MembersService,
    private managersService: ManagersService,
    private usersService: UsersService
  ){}

  @Get('/count/dynamic')
  async countDynamic(
    @Query( MEMBER_FIT_PIPE ) countMember: CountMemberDto,
    @Auth() auth: User|Manager
  ): Promise< Partial<Record<keyof CountMemberDto, number> >> {
    const isPatch = !isUndeclared(countMember.isPatch) ? true : false;
    return this.membersService.CountDynamic(countMember, auth, isPatch);
  }

  @Post('/sign/in')
  async signIn(
    @Body(
      MEMBER_SIGN_FIT_PIPE
    ) dto: MemberSignInDto,
    @Query('sns', BOOLEAN_PIPE) sns: boolean,
    @SnsProvided() snsInfo: ProvidedSnsInfo,
    @Req() req: Request
  ): Promise<ManagerRes|UserRes> {
    const checkAuth: MemberSignInDto|ProvidedSnsInfo = sns 
    ? snsInfo
    : dto
    
    let managerOrUser: Manager|User = null;
    try {
      managerOrUser = await this.managersService.postSignIn(checkAuth);
    } catch (error) {
      managerOrUser = await this.usersService.postSignIn(checkAuth);
    }

    setAuth(req, managerOrUser);
    setSnsProvided(req, null);
    return managerOrUser.type === 'Manager' 
    ? new ManagerRes(managerOrUser)
    : new UserRes(managerOrUser) ;
  }

  @Get()
  async getMemberSelf(
    @Auth() auth: User|Manager
  ): Promise<UserRes|ManagerRes> {
    const repos = getRepositories({
      user: UserRepository,
      manager: ManagerRepository
    }, this.connection.manager);
    
    if(auth?.type === 'Manager') {
      await repos.manager.setProperty({details: ['basic'], data: {auth}}, [auth]);

      return new ManagerRes(this.membersService.checkAuth(auth, 'Manager'));
    } else {
      await repos.user.setProperty({details: ['basic'], data: {auth}}, [auth]);

      return new UserRes(this.membersService.checkAuth(auth, 'User'))
    }
  }

  @Delete('/sign/out')
  async signOut(
    @Req() req: Request,
    @Auth() auth: Manager|User
  ): Promise<number> {
    setSnsProvided(req, null);
    if( auth ){
      setAuth(req, null);
      return 1;
    }else
      return 0
  }

  // @Post('/sign/in')
  // async dynamicSignIn(

  //   @Query('sns', BOOLEAN_PIPE) sns: boolean
  // ): Promise<UserRes|ManagerRes> {

  // }

  @Get('find/id')
  async findId(
    @Query('email') email: string,
    @Query('name') name: string,
    @Query('role') role: string
  ): Promise<string> {
    return this.membersService.findId(email, name, role)
      .then(identity => {
        // if(identity.startsWith('GOOGLE')) {
        //   return '구글 계정으로 가입한 사용자입니다.';
        // } else if(identity.startsWith('KAKAO')) {
        //   return '카카오 계정으로 가입한 사용자입니다.';
        // } else if(identity.startsWith('NAVER')) {
        //   return '네이버 계정으로 가입한 사용자입니다.';
        // } else {
        //   return hideTextExclude({
        //     text: identity,
        //     padChar: "*",
        //     excludeLength: identity.length - 2
        //   });
        // }
        return hideTextExclude({
          text: identity,
          padChar: "*",
          excludeLength: identity.length - 2
        });
      });
  }

  @Get('find/password')
  async findPassword(
    @Query('identity') identity: string,
    @Query('email') email: string,
    @Query('name') name: string
  ): Promise<string> {
    const { SENDED } = NotificationState;
    return this.membersService.findPassword(identity, email, name)
      .then(result => {
        if(result === SENDED) {
          return sendTempPasswordSuccess;
        }
      })
  }


  /**
   * 회원탈퇴용(state => -2 로 변경).
   * 추후 cron이용하여 탈퇴(삭제) 처리 예정.
   */
  @Patch('deleteState/:member_uk')
  async updateToDeleteState(
    @Param('member_uk') memberUk: string,
    @Body() body: WithdrawalMemberDto,
    @Req() req: Request,
    @Auth() auth: Manager | User
  ): Promise<ManagerRes | UserRes> {

    return this.membersService.updateToDeleteState(memberUk, body.withdrawalReason, auth)
      .then(async result => {
        if(isSameAuth(result, auth)) {
          setAuth(req, null);
        }
        setSnsProvided(req, null);
        if(result.type === 'Manager') {
          return new ManagerRes(result);
        } else {
          return new UserRes(result);
        }
      })
  }

  @Post('device/token')
  async createDeviceToken(
    @Body(DEVICE_TOKEN_FIT_PIPE) body: MemberDeviceTokenReq,
    @Auth() auth: Manager | User
  ): Promise<MemberDeviceTokenRes> {
    const dto: MemberDeviceTokenDto = {...body};

    return this.membersService.createDeviceToken(dto, auth)
      .then(dt => new MemberDeviceTokenRes(dt));
  }

}