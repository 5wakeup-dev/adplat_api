import { Injectable } from "@nestjs/common";
import { TABLE_ALIAS } from "src/config/typeorm.config";
import { Member } from "src/entity/member/member.interface";
import { Menu, MenuDto } from "src/entity/menu/menu.entity";
import { SearchMenuDto } from "src/entity/menu/menu.interface";
import { MenuFunction } from "src/entity/menu/menuFunction.entity";
import { MenuHierarchical, MenuHierarchicalDto } from "src/entity/menu/menuHierarchical.entity";
import { Role } from "src/entity/role/role.entity";
import { BASIC_EXCEPTION } from "src/exception/basic.exception";
import { MenuRepository } from "src/repository/menu/menu.repository";
import { equals, equalsIgnoreCase } from "src/util/format.util";
import * as hierarchicalUtil from "src/util/hierarchical.util";
import { deepClone, entriesTypeGuard } from "src/util/index.util";
import { getRepositories, TransactionHelper, TransactionHelperParam } from "src/util/typeorm.util";
import { Connection, EntityManager } from "typeorm";

type CreateHierarchicalParam = {
  entityManager: EntityManager;
  self: Menu;
  // allGroup?: Array<Menu>;
  // directRoot?: Menu;
}
const GROUP_KEY = 'GROUP';
const REPLY_KEY = 'REPLY';
// const PASS_KEY = 'PASS';
export const MENUS_FUNCTION = {
  // PASS_GET: `${PASS_KEY}-GET`,
  // PASS_POST: `${PASS_KEY}-POST`,
  // PASS_PATCH: `${PASS_KEY}-PATCH`,
  // PASS_DELETE: `${PASS_KEY}-DELETE`,

  GROUP_GET: `${GROUP_KEY}-GET`,
  GROUP_POST: `${GROUP_KEY}-POST`,
  GROUP_PATCH: `${GROUP_KEY}-PATCH`,
  GROUP_DELETE: `${GROUP_KEY}-DELETE`,

  REPLY_KEY: REPLY_KEY,
  REPLY_GET: `${REPLY_KEY}-GET`,
  REPLY_POST: `${REPLY_KEY}-POST`,
  REPLY_PATCH: `${REPLY_KEY}-PATCH`,
  REPLY_DELETE: `${REPLY_KEY}-DELETE`,
}

type CreateHierarchical = ( param: CreateHierarchicalParam ) => Promise<MenuHierarchicalDto>;

const {
  MENUS,
  MENU_HIERARCHICAL
} = TABLE_ALIAS;

@Injectable()
export class MenusService {
  constructor(
    private connection: Connection
  ){}
  
  async getMenu(
    absoluteKey: string
  ): Promise<Menu> {
    if( !absoluteKey )
      throw BASIC_EXCEPTION.EMPTY_CONTENT;
      
    const menu: Menu = await this.connection.getCustomRepository(MenuRepository)
      .searchQuery()
      .where(`${MENUS}.absoluteKey = :absoluteKey`, {absoluteKey})
      .getOne()

    if( !menu )
      throw BASIC_EXCEPTION.EMPTY_CONTENT;

    return menu;
  }

  async getMenus(
    search: SearchMenuDto = {}
  ): Promise<Array<Menu>> {

    const list: Array<Menu> = await this.connection.getCustomRepository(MenuRepository)
      .searchQuery(search)
      .leftJoin(`${MENUS}.hierarchical`, MENU_HIERARCHICAL)
      .orderBy(`${MENU_HIERARCHICAL}.groupId`, 'DESC')
      .addOrderBy(`${MENU_HIERARCHICAL}.groupOrd`, 'ASC')
      .getMany()

    if( list.length === 0 )
      throw BASIC_EXCEPTION.EMPTY_CONTENT;

    return list;
  }

  @TransactionHelper({paramIndex: 1, isolationLevel: 'READ UNCOMMITTED'})
  async createRootMenu(
    dto: MenuDto,
    transaction: TransactionHelperParam = {connection: this.connection, entityManager: this.connection.manager}
  ): Promise<Menu> {
    if( !dto )  
      throw BASIC_EXCEPTION.NOT_ALLOW_EMPTY_ON_PROCESS;

    dto.absoluteKey = dto.key;

    return this.createMenu(
      dto, 
      async ({self, entityManager: em}) => {
        const hierarchicalRepo = em.getRepository(MenuHierarchical);
        const hierarchicalDto: MenuHierarchicalDto = {
          // menu: self,
          groupId: self.id,
          id: self.id,
          groupOrd: 1,
          groupDepth: 0,
          groupParent: null
        }
        const rst = await hierarchicalRepo.save(hierarchicalDto)
        rst.id = self.id
        return rst;
      } , 
      transaction
    )
  }

  @TransactionHelper({paramIndex: 2, isolationLevel: 'READ UNCOMMITTED'})
  async createBranchMenu(
    dto: MenuDto, directRoot: Menu, 
    transaction: TransactionHelperParam = {connection: this.connection, entityManager: this.connection.manager}
  ): Promise<Menu> {  
    if( !dto || !directRoot )  
      throw BASIC_EXCEPTION.NOT_ALLOW_EMPTY_ON_PROCESS;

    dto.absoluteKey = `${directRoot.absoluteKey}.${dto.key}`;

    return this.createMenu(
      dto,
      async ({entityManager: em, self}) => {
        const repos = getRepositories({
          menu: MenuRepository
        }, em)
        const hierarchicalRepo = em.getRepository(MenuHierarchical);

        const allGroup = await repos.menu.findGroup(directRoot)
          .then( rst => rst.map( (menu) => ({...menu.hierarchical, menu})));
        const originAllGroup = deepClone(allGroup);
        const directRootHierarchical = directRoot.hierarchical;
        const hierarchicalDto: MenuHierarchicalDto = hierarchicalUtil.createBranchAndRefresh(allGroup, directRootHierarchical)
        // hierarchicalDto.menu = self;
        hierarchicalDto.id = self.id;
        const refresh = allGroup.filter( h => {
          const find = originAllGroup.find( ({id}) => id === h.id);
          return !find || !equals(find, h)
        } ) 
        // console.log('[!!!!]', refresh, '[!!!!]',allGroup)
        await hierarchicalRepo.save(refresh);
        return hierarchicalDto;
      },
      transaction
    )
  }

  @TransactionHelper({ paramIndex: 2 })
  async patchMenu(
    origin: Menu, dto: MenuDto,
    {entityManager}: TransactionHelperParam = {connection: this.connection, entityManager: this.connection.manager}
  ): Promise<Menu> {
    if( !origin || !dto )
      throw BASIC_EXCEPTION.NOT_ALLOW_EMPTY_ON_PROCESS;

    const repos = getRepositories({
      menu: MenuRepository
    }, entityManager);

    const filterNotUndefinedDto = entriesTypeGuard(dto).filter( ([_, val]) => val !== undefined)
      .reduce( (reduce, [key, val]) => {
        reduce[key] = val;
        return reduce;
      }, {})
    return repos.menu.save(dto)
    .then( updatedEntity => {
      return Object.assign(
        deepClone(origin), 
        filterNotUndefinedDto, 
        updatedEntity.absoluteKey ? {absoluteKey: updatedEntity.absoluteKey} : undefined 
      )
    })
  }

  @TransactionHelper({ paramIndex: 1 })
  async deleteMenu(
    menu: Menu,
    {entityManager}: TransactionHelperParam = {connection: this.connection, entityManager: this.connection.manager}
  ): Promise<Array<Menu>> {

    if( !menu?.hierarchical )
      throw BASIC_EXCEPTION.NOT_ALLOW_EMPTY_ON_PROCESS;

    const repos = getRepositories({
      menu: MenuRepository,
      hierarchical: MenuHierarchical
    }, entityManager)
    
    const allGroups: Array<Menu> = await repos.menu
      .searchQuery({groupId: menu.hierarchical.groupId})
      .leftJoinAndSelect(`${MENUS}.hierarchical`, MENU_HIERARCHICAL)
      .orderBy(`${MENU_HIERARCHICAL}.groupId`, 'DESC')
      .addOrderBy(`${MENU_HIERARCHICAL}.groupOrd`, 'ASC')
      .getMany();

    const absoluteKeyRegExp = new RegExp(`^${menu.absoluteKey}|${menu.absoluteKey}\..+`);
    const {
      deepBranch, elseMenus
    } = allGroups.reduce( 
      (result, m) => {
        if( absoluteKeyRegExp.test(m.absoluteKey) )
          result.deepBranch.push(m)
        else
          result.elseMenus.push(m)
        return result;
      }
    , {deepBranch: [] as Array<Menu>, elseMenus: [] as Array<Menu>});

    const cloneDeepBranch = deepClone(deepBranch);
    // deepBranch.reverse();
    return repos.menu.remove( deepBranch ) 
      .then( async () => {
        elseMenus.forEach( ({hierarchical: h}, i) => h.groupOrd = i + 1);
        await repos.hierarchical.save(
          elseMenus.map( ({hierarchical}) => hierarchical)
        );
        return cloneDeepBranch;
      })
    
  }


  @TransactionHelper({paramIndex: 2})
  private async createMenu(
    dto: MenuDto, createHierarchical: CreateHierarchical,
    { entityManager }: TransactionHelperParam = {connection: this.connection, entityManager: this.connection.manager}
  ): Promise<Menu>{
    if( !dto )  
      throw BASIC_EXCEPTION.NOT_ALLOW_EMPTY_ON_PROCESS;
   
    // console.log(dto);
    // dto.absoluteKey = dto.key;
    const repos = getRepositories({
      menu: MenuRepository,
      hierarchical: MenuHierarchical
    }, entityManager);

    const created = await repos.menu.save(dto);
    // const hierarchicals: Array<MenuHierarchicalDto> = [];
    dto.hierarchical = await createHierarchical({self: created, entityManager});
    
    return created;
  }

  

  allowMenu(
    member: Member, menu: Menu, method: string,  
    opts: CompareOptions = {}
  ): boolean {
    const {require = false} = opts

    if(!menu) 
      return false;
    else if(!menu.methods || menu.methods.length === 0) 
      return !require;
    
    method = method.toLowerCase();
    const findMethod = menu.methods.find(holdMethod => holdMethod.key.toLowerCase() === method );
    if(!findMethod || !findMethod.roles || findMethod.roles.length === 0) 
      return !require;
    else if(!member || !member.roles || member.roles.length === 0)
      return false;

    const holderRoles: Array<Role> = member.roles;
    return this.allowRole(holderRoles, findMethod.roles.map(role => role.key), opts);
  }
  allowRole(
    holderRoles: Array<Role>, 
    compares: Array<string>, 
    {compare = 'or', require = false}: CompareOptions = {}
  ):boolean {
    // console.log(holderRoles, compares);
    if(!compares || compares.length === 0) return !require;
    else if(!holderRoles || holderRoles.length === 0) return false;

    if(compare === 'and')
      return !compares.some(compKey => !holderRoles.some(targetRole => targetRole.key.toLowerCase() === compKey.toLowerCase()))
    else
      return holderRoles.some(targetRole => compares.some(comRole => comRole.toLowerCase() === targetRole.key.toLowerCase()))
  }

  
  existFunction(menu: Menu, key: string): boolean {
    if(!menu || !menu.functions || menu.functions.length === 0)
      return false;
    return menu.functions.some(func => equalsIgnoreCase(func.key, key));
  }

  allowFunction(
    member: Member, menu: Menu, key: string,
    opts: CompareOptions = {}
  ): boolean {
    const {require = false} = opts

    if(!menu)
      return false;
    else if(!menu.functions || menu.functions.length === 0) 
      return !require;
      
    const findFunc:MenuFunction = menu.functions.find(func => equalsIgnoreCase(func.key, key));
    if(!findFunc || !findFunc.roles || findFunc.roles.length === 0)
      return !require;
    else if(!member || !member.roles || member.roles.length === 0)
      return false;

    const holderRoles: Array<Role> = member.roles;
    return this.allowRole(holderRoles, findFunc.roles.map(role => role.key), opts);
  }
}
type CompareOptions = {
  compare?: 'or'|'and',
  require?: boolean
}
