import { Body, Controller, Delete, Get, NotFoundException, Param, Patch, Post, Query } from "@nestjs/common";
import { LANG } from "src/decorator/lang.decorator";
import { HierarchicalBranchType } from "src/entity/comm/comm.interface";
import { Menu, MenuDto, MenuReq, MenuRes } from "src/entity/menu/menu.entity";
import { SearchMenuDto } from "src/entity/menu/menu.interface";
import { dividePipe } from "src/pipe/divide.pipe";
import { dynamicPipe } from "src/pipe/dynamic.pipe";
import { fitPipe } from "src/pipe/fit.pipe";
import { selectPipe } from "src/pipe/select.pipe";
import { MenuRepository } from "src/repository/menu/menu.repository";
import { MenusService } from "src/service/menus.service";
import { getProject } from "src/singleton/project.singleton";
import { menuUtil } from "src/util/entity.util";
import { initBoolean } from "src/util/index.util";
import { getRepositories, PathString } from "src/util/typeorm.util";
import { Connection } from "typeorm";

const MENU_FIT_PIPE = fitPipe<MenuReq>([
  'key', 'methods', 'functions', 
  'i18ns', 'metadatas', 'properties', 'title'
])
// const MENU_SELECT_PIPE = ( _: HttpMethod ) => selectPipe<MenuReq>({
//   // methods: (key, val, wrap) => {
//   //   if( !val )
//   //     return undefined;
//   //   wrap[key] = entriesTypeGuard(val).filter( ([_, roles]) => Array.isArray(roles))
//   //     .reduce( 
//   //       (record, [key, val]) => {
//   //         record[key] = val;
//   //         return record;
//   //       }
//   //     , {} as RecordRoles)
//   // },

// })
const MENU_BRANCH_TYPE_PIPE = dynamicPipe<HierarchicalBranchType>( ({value}) => {
  if( !['deep', 'direct'].includes(value) )
    throw new NotFoundException(`Not Found '${value}' as branchType`);
  return value;
})
// stringPipe(['direct', 'deep'], {default: 'direct'});
const MENU_SEARCH_FIT_PIPE = fitPipe<SearchMenuDto>([
  'metaKey', 'metaVal', 'self'
]);

const MENU_SEARCH_SELECT_PIPE = selectPipe<SearchMenuDto>({
  // branchType: (_, val) => initStringTypeGuard<MenuBranchType>(val, ['deep', 'direct'], {default: 'direct'}),
  branchType: (_, val) => {
    if( !['deep', 'direct'].includes(val) )
      throw new NotFoundException(`Not Found '${val}' as branchType`);
  },
  self: (_, val) => val as any === '' ? true : initBoolean(val)
});
const MENU_FULL_DETAIL: Array<PathString<Menu>> = [
  'hierarchical', 'i18ns', 'metadatas', 'methods', 'properties', 'functions'
];



@Controller('menus')
export class MenusController {
  constructor(
    private menusService: MenusService,
    private connection: Connection
  ){ }

  @Post()
  async postMenu(
    @Body(
      MENU_FIT_PIPE,
      // MENU_SELECT_PIPE('POST')
    ) body: MenuReq,
    @LANG() lang: string
  ): Promise<MenuRes> {
    // const repos = getRepositories({
    //   role: Role
    // }, this.connection.manager);

    // const roles = await repos.role.find();
    const prj = getProject();
    const dto = menuUtil.reqToDto(body, {dataBaseRoles: prj.ROLES, lang});

    return this.menusService.createRootMenu(dto)
    .then( mnu => new MenuRes(mnu));
  }

  @Post('/:absolute_key')
  async postBranchMenu(
    @Param('absolute_key') absoluteKey: string,
    @Body(
      MENU_FIT_PIPE,
      // MENU_SELECT_PIPE('POST')
    ) body: MenuReq,
    @LANG() lang: string
  ): Promise<MenuRes> {

    const repos = getRepositories({
      // role: Role,
      menu: MenuRepository
    }, this.connection.manager);
    const prj = getProject();

    const [ /*roles,*/ directRoot ] = await Promise.all([
      // repos.role.find(),
      repos.menu.getOne(
        MENU_FULL_DETAIL,
        ctx => ctx.searchQuery({absoluteKey})
          // .where(`${ctx.alias}.absoluteKey = :absoluteKey`, {absoluteKey})
      )
    ]) 

    if( directRoot ){
      const { 
        methods: rootMethods,
        functions: rootFunctions,
        properties: rootProperties
      } = new MenuRes(directRoot);

      if( body.methods === undefined )
        body.methods = rootMethods;
      if( body.functions === undefined )
        body.functions = rootFunctions;
      if( body.properties === undefined )
        body.properties = rootProperties;
    }
    // console.log(body);
    const dto = menuUtil.reqToDto(body, {dataBaseRoles: prj.ROLES, lang});

    return this.menusService.createBranchMenu(dto, directRoot)
    .then( mnu => new MenuRes(mnu));
  }

  @Get('/:absolute_key')
  async getMenu(
    @Param('absolute_key') absoluteKey: string,
    @Query(
      'detail', dividePipe()
    ) details: Array<PathString<Menu>>,
    @LANG() lang: string
  ): Promise<MenuRes> {
    return this.menusService.getMenu(absoluteKey)
    .then( async m => 
      this.connection.getCustomRepository(MenuRepository)
      .setProperty({details, data: {lang}}, [m])
      .then( _ => new MenuRes(m))
    );
  }

  @Get('/:absolute_key/:branch_type')
  async getMenus(

    @Param('absolute_key') absoluteKey: string,
    @Param(
      'branch_type',
      MENU_BRANCH_TYPE_PIPE
    ) branchType: HierarchicalBranchType|undefined,
    @Query(
      MENU_SEARCH_FIT_PIPE,
      MENU_SEARCH_SELECT_PIPE
    ) search: SearchMenuDto,
    @Query( 
      'detail', dividePipe()
    ) details: Array<PathString<Menu>>,
    @LANG() lang: string
  ): Promise<Array<MenuRes>> {

    search.absoluteKey = absoluteKey;
    search.branchType = branchType;

    return this.menusService.getMenus(search)
    .then( menus => 
      this.connection.getCustomRepository(MenuRepository)
      .setProperty({details, data: {lang}}, menus)
      .then( () => menus)
     )
    .then( menus => menus.map( m => new MenuRes(m) ) );
  }

  @Patch('/:absolute_key')
  async patchMenu(
    @Param('absolute_key') absoluteKey: string,
    @Body(
      MENU_FIT_PIPE,
      // MENU_SELECT_PIPE('PATCH')
    ) body: MenuReq
  ): Promise<MenuRes> {
    const repos = getRepositories({
      // role: Role,
      menu: MenuRepository
    }, this.connection.manager);
    const prj = getProject();

    const [ menu /*, roles */ ] = await Promise.all([
      repos.menu
      .getOne(
        MENU_FULL_DETAIL,
        ctx => ctx.searchQuery()
        .where(`${ctx.alias}.absoluteKey = :absoluteKey`, {absoluteKey})
      ),
      // repos.role.find()
    ])

    const dto: MenuDto = menuUtil.reqToDto(body, {origin: menu, dataBaseRoles: prj.ROLES})
    // console.log(dto.i18ns);

    // const {i18ns, metadatas, methods, hierarchical, functions, ...other} = dto;
    // console.log('menu', other);
    // console.log('hierarchical', hierarchical )
    // i18ns?.forEach( i18n => console.log('i18n', i18n))
    // metadatas?.forEach( metadata => console.log('metadata', metadata))
    // methods?.forEach( method => console.log('method', method))
    // functions?.forEach( func => console.log('function', func))

    return this.menusService.patchMenu(menu, dto)
    .then( m => new MenuRes(m) );
  }

  @Delete('/:absolute_key')
  async deleteMenu(
    @Param('absolute_key') absoluteKey: string,
  ): Promise<number> {

    const repos = getRepositories({
      menu: MenuRepository
    }, this.connection.manager);

    const menu: Menu = await repos.menu.getOne(
      ['hierarchical'],
      ctx => ctx.searchQuery({absoluteKey})
    );

    return this.menusService.deleteMenu( menu )
    .then( deleteBranches => deleteBranches.length )

  }
}