import { Body, Controller, Delete, Get, Headers, NotFoundException, Param, Patch, Post, Query } from "@nestjs/common";
import { Auth } from "src/decorator/auth.decorator";
import { ClientIp } from "src/decorator/clientIp.decorator";
import { AroundType, HierarchicalBranchType } from "src/entity/comm/comm.interface";
import { Consulting, ConsultingDto, ConsultingReq, ConsultingRes } from "src/entity/consulting/consulting.entity";
import { SearchAroundConsultingDto, SearchConsultingBranchDto, SearchConsultingDto } from "src/entity/consulting/consulting.interface";
import { Manager } from "src/entity/member/manager.entity";
import { MemberBasic } from "src/entity/member/memberBasic.entity";
import { User } from "src/entity/member/user.entity";
import { DEFAULT_ROLE } from "src/entity/role/role.interface";
import { dividePipe } from "src/pipe/divide.pipe";
import { dynamicPipe } from "src/pipe/dynamic.pipe";
import { fitPipe } from "src/pipe/fit.pipe";
import { selectPipe } from "src/pipe/select.pipe";
import { stringPipe } from "src/pipe/string.pipe";
import { AttachmentRepository } from "src/repository/comm/attachment.repository";
import { ConsultingRepository } from "src/repository/consulting/consulting.repository";
import { MenuRepository } from "src/repository/menu/menu.repository";
import { AttachmentsService } from "src/service/attachments.service";
import { ConsultingsService } from "src/service/consultings.service";
import { MenusService } from "src/service/menus.service";
import { NetAddressesService } from "src/service/netAddress.service";
import { Around } from "src/type/index.type";
import { consultingUtil, isContainRoles, isSameAuth } from "src/util/entity.util";
import { ListPageRes } from "src/util/entity/listPage";
import { hideTextExclude, isUndeclared } from "src/util/format.util";
import { entriesTypeGuard, initBoolean, initNumber } from "src/util/index.util";
import { getRepositories, PathString } from "src/util/typeorm.util";
import { Connection } from "typeorm";

const CONSULTING_FIT_PIPE = fitPipe<ConsultingReq>([
  'menu', 'attachments', 'title', 'content','isHidden',
  'properties', 'writer', 'password', 'relation', 'receiverManager'
])
const CONSULTING_SEARCH_NUMBER_PIPE = dynamicPipe<SearchConsultingDto>(({value}) => {
  (['curPage', 'rowPerPage', 'pagePerBlock'] as Array<keyof SearchConsultingDto>)
    .forEach(key => {
      const val = value[key];
      if(val !== undefined) {
        value[key] = initNumber(val) as never;
      }
    })
    return value;
})
const CONSULTING_SEARCH_SELECT_PIPE = selectPipe<SearchConsultingDto>({
  root: (_, val) => val as any === '' ? true : initBoolean(val),
})
const CONSULTING_SERARCH_FIT_PIPE = fitPipe<SearchConsultingDto>([
  'curPage', 'rowPerPage', 'writer', 'productUk', 'blockMember',
  'receiveUk', 'orReceiveUk', 'parentUk', 'searchKey', 'searchVal', 
  'title', 'userUk', 'managerUk', 'orderBy', 'pagePerBlock', 'root'
])
const CONSULTING_BRANCH_TYPE_PIPE = dynamicPipe<HierarchicalBranchType>(({value}) => {
  if(!['deep', 'direct'].includes(value)) {
    throw new NotFoundException(`Not Found '${value}' as branchType`);
  }
  return value;
})
const CONSULTING_BRANCH_FIT_PIPE = fitPipe<SearchConsultingBranchDto>([
  'curPage', 'depth', 'rowPerPage'
])
const CONSULTING_AROUND_TYPE_PIPE = dynamicPipe<AroundType>(({value}) => {
  if(!['all', 'root'].includes(value)) {
    throw new NotFoundException(`Not Found '${value}' as branchType`);
  }
  return value;
})

@Controller('consultings')
export class ConsultingsController {
  constructor(
    private connection: Connection,
    private consultingsService: ConsultingsService,
    private attachmentsService: AttachmentsService,
    private netAddressesService: NetAddressesService,
    private menusService: MenusService
  ) {}

  @Post()
  async postConsulting(
    @Body(CONSULTING_FIT_PIPE) body: ConsultingReq,
    @Auth() auth: Manager|User,
    @ClientIp() ip: string
  ): Promise<ConsultingRes> {
    const repos = getRepositories({
      menu: MenuRepository,
      attachment: AttachmentRepository
    }, this.connection.manager)
    const dto: ConsultingDto = await consultingUtil.reqToDto(
      body,
      {
        menuRepository: repos.menu,
        attachmentsService: this.attachmentsService,
        transaction: {connection: this.connection, entityManager: this.connection.manager}
      }
    )

    return this.consultingsService.createRootConsulting(dto, auth)
      // .then(cst => new ConsultingRes(cst));
      .then(async cst => {
        await this.netAddressesService.saveConsultingWriterAdd(cst, ip)
        return new ConsultingRes(cst);
      })
  }

  @Post(':consulting_uk')
  async postBranchConsulting(
    @Param('consulting_uk') consultingUk: string,
    @Headers('check-password') checkPassword: string,
    @Body(CONSULTING_FIT_PIPE) body: ConsultingReq,
    @Auth() auth: Manager|User,
  ): Promise<ConsultingRes> {
    checkPassword = checkPassword ? decodeURIComponent(checkPassword) : null;

    const repos = getRepositories({
      consulting: ConsultingRepository,
      attachment: AttachmentRepository
    }, this.connection.manager);

    const target = await repos.consulting.getOne(
      ['hierarchical', 'menu'],
      ctx => ctx.searchQuery({uk: consultingUk})
    )

    const dto: ConsultingDto = await consultingUtil.reqToDto(
      body,
      {
        attachmentsService: this.attachmentsService,
        transaction: {connection: this.connection, entityManager: this.connection.manager}
      }
    )

    return this.consultingsService.createBranchConsulting(dto, target, auth, checkPassword)
      // .then(cst => new ConsultingRes(cst));
      .then(async cst => {

        return new ConsultingRes(cst);
      })
  }

  @Patch(':consulting_uk')
  async patchConsulting(
    @Param('consulting_uk') consultingUk: string,
    @Body(CONSULTING_FIT_PIPE) body: ConsultingReq,
    @Headers('check-password') checkPassword: string,
    @Auth() auth: Manager|User,
  ): Promise<ConsultingRes> {
    const repos = getRepositories({
      consulting: ConsultingRepository,
      menu: MenuRepository,
      attachment: AttachmentRepository
    }, this.connection.manager);
    checkPassword = checkPassword ? decodeURIComponent(checkPassword) : null;

    const consulting = await repos.consulting.getOne(
      ['manager', 'user', 'menu.methods'],
      ctx => ctx.searchQuery({uk: consultingUk})
    )

    const dto: ConsultingDto = await consultingUtil.reqToDto(
      body,
      {
        origin: consulting,
        menuRepository: repos.menu,
        attachmentsService: this.attachmentsService,
        transaction: {connection: this.connection, entityManager: this.connection.manager}
      }
    )

    return this.consultingsService.patchConsulting(consulting, dto, auth, checkPassword)
      .then(cst => new ConsultingRes(cst));
  }

  @Get(':consulting_uk')
  async getConsulting(
    @Param('consulting_uk') consultingUk: string,
    @Headers('check-password') checkPassword: string,
    @Auth() auth: Manager|User,
    @Query(
      'detail', dividePipe()
    ) details: Array<PathString<Consulting>>,
    @ClientIp() ip: string
  ): Promise<ConsultingRes> {
    checkPassword = checkPassword ? decodeURIComponent(checkPassword) : null;

    return this.consultingsService.getConsulting(consultingUk, auth, checkPassword)
      .then(async cst => {
        await this.netAddressesService.addConsultingViewAndCount(cst, ip)
        await this.connection.getCustomRepository(ConsultingRepository)
            .setProperty({details, data: {auth}}, [cst]);

        const isRoot = isContainRoles(auth, ['root'] as Array<DEFAULT_ROLE>);
        if(!cst.user&&!cst.manager&&cst.saves?.length>0){
          cst.writer= cst.writer + `(${cst.saves[0].netAddress.ip||""})`
        }
        if (!isRoot && !isSameAuth(cst.manager, auth) && !isSameAuth(cst.user, auth)) {
          if (cst.manager) {
            cst.manager.identity = hideTextExclude({
              text: cst.manager.identity,
              padChar: "*",
              excludeLength: cst.manager.identity.length - 2
            });
          } else if (cst.user) {
            cst.user.identity = hideTextExclude({
              text: cst.user.identity,
              padChar: "*",
              excludeLength: cst.user.identity.length - 2
            });
          }
        }
        return new ConsultingRes(cst)
      });
  }



  
  @Get('/check/:consulting_uk')
  async getCheckPassword(
    @Param('consulting_uk') consultingUk: string,
    @Auth() auth: Manager|User,
    @Headers('check-password') checkPassword: string
  ): Promise<boolean> {
    checkPassword = checkPassword ? decodeURIComponent(checkPassword) : null;

    return this.consultingsService.getCheckConsulting(consultingUk, checkPassword,auth)
      
  }

  @Get(':menu_absolute_key/page')
  async getConsultingListPage(
    @Param('menu_absolute_key') menuAbsoluteKey: string,
    @Query('menuBranchType', stringPipe(['deep', 'direct'])) menuBranchType: 'deep'|'direct'|undefined,
    @Query('menuMetaKey') menuMetaKey: string,
    @Query('menuMetaVal') menuMetaVal: string,
    @Auth() auth: Manager|User,
    @Query(
      CONSULTING_SEARCH_NUMBER_PIPE,
      CONSULTING_SERARCH_FIT_PIPE,
      CONSULTING_SEARCH_SELECT_PIPE
    ) search: SearchConsultingDto,
    @Query(
      'detail', dividePipe()
    ) details: Array<PathString<Consulting>>
  ): Promise<ListPageRes<ConsultingRes>> {
    search.menuIds = (await this.menusService.getMenus({
      absoluteKey: menuAbsoluteKey, branchType: menuBranchType,
      self: true, metaKey: menuMetaKey, metaVal: menuMetaVal
    })).map(({id}) => id);

    search.root = !isUndeclared(search.root);
    search.blockMember = !isUndeclared(search.blockMember);

    if(search.receiveUk?.toLowerCase() === 'null') {
      search.receiveUk = null;
    }
    if(search.orReceiveUk?.toLowerCase() === 'null') {
      search.orReceiveUk = null;
    }

    return this.consultingsService.getListPage(search, auth)
      .then(async ({page, list}) => {
        await this.connection.manager
          .getCustomRepository(ConsultingRepository)
          .setProperty({details, data: {auth}}, list);
          
        const isRoot = isContainRoles(auth, ['root'] as Array<DEFAULT_ROLE>);
        for(const cst of list) {
          if (!isRoot && !isSameAuth(cst.manager, auth) && !isSameAuth(cst.user, auth)) {
            if (cst.manager) {
              if (cst.manager?.basic) {
                cst.manager.basic = {
                  name: hideTextExclude({
                    text: cst.manager.basic.name,
                    padChar: "*",
                    excludeLength: cst.manager.basic.name.length - 2
                  })
                } as MemberBasic
              }
              cst.manager.identity = hideTextExclude({
                text: cst.manager.identity,
                padChar: "*",
                excludeLength: cst.manager.identity.length - 2
              });
            } else if (cst.user) {
              if (cst.user?.basic) {
                cst.user.basic = {
                  name: hideTextExclude({
                    text: cst.user.basic.name,
                    padChar: "*",
                    excludeLength: cst.user.basic.name.length - 2
                  })
                } as MemberBasic
              }
              cst.user.identity = hideTextExclude({
                text: cst.user.identity,
                padChar: "*",
                excludeLength: cst.user.identity.length - 2
              });
            }
          }
        }

        return {
          page,
          list: list.map(cst => new ConsultingRes(cst))
        }
      });
  }

  @Get('branch/:consulting_uk/:branch_type')
  getConsultingBranch(
    @Param('consulting_uk') consultingUk: string,
    @Param('branch_type', CONSULTING_BRANCH_TYPE_PIPE) branchType: HierarchicalBranchType,
    @Query(
      CONSULTING_SEARCH_NUMBER_PIPE,
      CONSULTING_BRANCH_FIT_PIPE
    ) search: SearchConsultingBranchDto,
    @Auth() auth: Manager|User,
    @Query('detail', dividePipe()) details: Array<PathString<Consulting>>
  ): Promise<ListPageRes<ConsultingRes>> {
    search.uk = consultingUk;
    search.branchType = branchType;

    return this.consultingsService.getListPageAsBranch(search, auth)
      .then(async ({page, list}) => 
        await this.connection.manager.getCustomRepository(ConsultingRepository)
          .setProperty({details, data: {auth}}, list)
          .then(() => ({
            page,
            list: list.map(cst => new ConsultingRes(cst))
          }))
      );
  }

  @Get(':menu_absolute_key/around/:consulting_uk/:type')
  async getAroundConsulting(
    @Param('menu_absolute_key') menuAbsoluteKey: string,
    @Query(
      'menuBranchType', stringPipe<HierarchicalBranchType>(['deep', 'direct'])
    ) menuBranchType: 'deep'|'direct'|undefined,
    @Query('menuMetaKey') menuMetaKey: string,
    @Query('menuMetaVal') menuMetaVal: string,
    @Param('consulting_uk') consultingUk: string,
    @Auth() auth: Manager|User,
    @Param('type',CONSULTING_AROUND_TYPE_PIPE) type: string,
    @Query('detail', dividePipe()) details: Array<PathString<Consulting>>
  ): Promise<Around<ConsultingRes>> {
    const repos = getRepositories({
      consulting: ConsultingRepository
    }, this.connection.manager);

    const [menuIds, consulting] = await Promise.all([
      this.menusService.getMenus({
        absoluteKey: menuAbsoluteKey, branchType: menuBranchType,
        self: true, metaKey: menuMetaKey, metaVal: menuMetaVal
      }).then(menus => menus.map(({id}) => id)),

      repos.consulting.getOne(
        ['hierarchical'],
        ctx => ctx.searchQuery({uk: consultingUk})
      )
    ])

    const search: SearchAroundConsultingDto = {menuIds, id: consulting?.id, type};

    return this.consultingsService.getAroundConsulting(search, consulting)
      .then(async around => {
        const entries = entriesTypeGuard(around)
          .filter(([, val]) => val);

        await repos.consulting.setProperty(
          {details, data: {auth}},
          entries.map(([, val]) => val)
        );

        return entries.reduce((record, [key, val]) => {
          record[key] = new ConsultingRes(val);
          return record;
        }, {} as Around<ConsultingRes>);
      });
  }

  @Delete(':consulting_uk')
  async deleteConsulting(
    @Param('consulting_uk') consultingUk: string,
    @Headers('check-password') checkPassword: string,
    @Auth() auth: Manager|User
  ): Promise<number> {
    checkPassword = checkPassword ? decodeURIComponent(checkPassword) : null;

    const repos = getRepositories({
      consulting: ConsultingRepository
    }, this.connection.manager);

    const consulting: Consulting = await repos.consulting.getOne(
      ['hierarchical', 'manager', 'user'],
      ctx => ctx.searchQuery({uk: consultingUk})
    );

    return this.consultingsService.deleteConsulting(consulting, auth, checkPassword)
      .then(deleteConsultings => deleteConsultings.length);
  }
}