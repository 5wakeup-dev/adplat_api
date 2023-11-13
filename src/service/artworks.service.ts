import { Injectable } from "@nestjs/common";
import { TABLE_ALIAS } from "src/config/typeorm.config";
import { Artwork, ArtworkDto } from "src/entity/artwork/artwork.entity";
import { ArtworkHierarchical, ArtworkHierarchicalDto } from "src/entity/artwork/artworkHierarchical.entity";
import { BASIC_EXCEPTION } from "src/exception/basic.exception";
import { ArtworkRepository } from "src/repository/artwork/artwork.repository";
import { HttpMethod, equals, isNumberForm } from "src/util/format.util";
import { getRepositories, TransactionHelper, TransactionHelperParam } from "src/util/typeorm.util";
import { Connection, EntityManager } from "typeorm";
import { Manager } from "src/entity/member/manager.entity";
import { isContainRoles, isSameAuth } from "src/util/entity.util";
import { Role } from "src/entity/role/role.entity";
import { User } from "src/entity/member/user.entity";
import { deepClone, splitToObject } from "src/util/index.util";
import { createBranchAndRefresh, findDeepBranch, findDirectBranch } from "src/util/hierarchical.util";
import { SearchAroundArtworkDto, SearchArtworkBranchDto, SearchArtworkDto } from "src/entity/artwork/artwork.interface";
import { ListPageRes } from "src/util/entity/listPage";
import PageInfo from "src/util/entity/PageInfo";
import { Around } from "src/type/index.type";
import { DEFAULT_ROLE } from "src/entity/role/role.interface";


const {
  ARTWORKS,
  ARTWORK_HIERARCHICAL
} = TABLE_ALIAS;
type CreateHierarchicalParam = {
  entityManager: EntityManager;
  self: Artwork;
  // allGroup?: Array<Menu>;
  // directRoot?: Menu;
}
type CreateHierarchical = ( param: CreateHierarchicalParam ) => Promise<ArtworkHierarchicalDto>;

@Injectable()
export class ArtworksService {
  constructor(
    private connection: Connection,
  ){}

  async getArtwork(
    artworkUk: string, auth: User|Manager
  ): Promise<Artwork> {
    if( !artworkUk )
      throw BASIC_EXCEPTION.EMPTY_CONTENT;
    const repos = getRepositories({
      artwork: ArtworkRepository
    }, this.connection.manager);

    const artwork = await repos.artwork.getOne(
      undefined, // ['menu.methods', 'manager'],
      ctx => ctx.searchQuery({uk: artworkUk})
    )
    // const isRoot = isContainRoles(auth, ['root'] as Array<DEFAULT_ROLE>);
    // const isOwner = isSameAuth(auth, artwork?.manager)
    if( !artwork )
      throw BASIC_EXCEPTION.EMPTY_CONTENT;
    // else if( !artwork?.menu ){
    //   if( !isRoot && !isOwner )
    //     throw BASIC_EXCEPTION.NOT_ALLOW_EMPTY_ON_PROCESS;
    // }else{
    //   const getMethodRoles: Array<Role> = artwork.menu.methods?.find( ({key: mtdKey}) => mtdKey === 'GET' as HttpMethod)?.roles;
    //   if( 
    //     getMethodRoles && getMethodRoles.length > 0  // Method:GET 이 BLANK가 아닐 때
    //     && !isContainRoles({roles: getMethodRoles}, auth.roles, {require: true})  // 
    //   )
    //     throw BASIC_EXCEPTION.NOT_ALLOW_AUTH;

    // }
    
    const { manager, menu, ...other} = artwork;

    return { ...other };
  }

  async getListPage(
    search: SearchArtworkDto, auth: User|Manager
  ): Promise<ListPageRes<Artwork>> {
    const repos = getRepositories({
      artwork: ArtworkRepository
    }, this.connection.manager);

    const { curPage, rowPerPage, pagePerBlock } = search;

    // const { column, order } = splitToObject(
    //   search.orderBy, 
    //   ['column', 'order'],
    //   {
    //     limit: [['group', 'view'], ['DESC', 'ASC']],
    //     def: {column: 'group', order: 'DESC'}
    //   }
    // )

    const totalRow = await repos.artwork.searchQuery(search)
    .getCount();
    if( totalRow === 0 )
      throw BASIC_EXCEPTION.EMPTY_CONTENT;
    let queryBuilder = repos.artwork.searchQuery(search);
    const page: PageInfo = new PageInfo({curPage, rowPerPage, totalRow, pagePerBlock});
    // queryBuilder = column === 'view'
    // ? queryBuilder.orderBy(`${ARTWORKS}.view`, order as 'DESC'|'ASC')
    // : queryBuilder.leftJoinAndSelect(`${ARTWORKS}.hierarchical`, ARTWORK_HIERARCHICAL)
    //   .orderBy(`${ARTWORK_HIERARCHICAL}.groupId`, order as 'DESC'|'ASC')
    //   .addOrderBy(`${ARTWORK_HIERARCHICAL}.groupOrd`, 'ASC')

    const list = await queryBuilder
    .skip(page.startRow)
    .take(page.rowPerPage)
    .getMany()

    list.forEach( entity => entity.hierarchical = undefined );

    return { page, list }
  }

  async getAroundArtwork(
    search: SearchAroundArtworkDto,
    artwork: Artwork
  ): Promise<Around<Artwork>> {
    if(!search || !search.id || !search.type)
      throw BASIC_EXCEPTION.NOT_ALLOW_BODY;
    else if(!artwork)
      throw BASIC_EXCEPTION.NOT_ALLOW_EMPTY_ON_PROCESS;

    const repos = getRepositories({
      artwork: ArtworkRepository
    }, this.connection.manager)

    const {groupId, groupOrd} = artwork.hierarchical;
    const {length: nextLength} = await repos.artwork.searchQuery()
      .leftJoin(`${ARTWORKS}.hierarchical`, `${ARTWORK_HIERARCHICAL}`)
      .where(`${ARTWORK_HIERARCHICAL}.groupId = :groupId AND ${ARTWORK_HIERARCHICAL}.groupOrd > :groupOrd`, { groupId, groupOrd })
      .getRawMany()

    const [ prev, next ] = await Promise.all([
      repos.artwork.aroundPrevQuery(artwork, search)
      // .leftJoinAndSelect(`${ARTWORKS}.hierarchical`, ARTWORK_HIERARCHICAL)
      // .orderBy(`${ARTWORK_HIERARCHICAL}.groupId`, 'ASC')
      // .addOrderBy(`${ARTWORK_HIERARCHICAL}.groupOrd`, 'DESC')
      .take(1)
      .getOne(),

      repos.artwork.aroundNextQuery(artwork, search, nextLength)
      // .leftJoinAndSelect(`${ARTWORKS}.hierarchical`, ARTWORK_HIERARCHICAL)
      // .orderBy(`${ARTWORK_HIERARCHICAL}.groupId`, 'DESC')
      // .addOrderBy(`${ARTWORK_HIERARCHICAL}.groupOrd`, 'ASC')
      .take(1)
      .getOne()
    ])


    if( !prev && !next )
      throw BASIC_EXCEPTION.EMPTY_CONTENT;
      
    return { prev: prev, next: next };
  }

  async getListPageAsBranch( 
    search: SearchArtworkBranchDto, auth: User|Manager 
  ): Promise<ListPageRes<Artwork>> {
    if(!search || !search.uk || !search.branchType)
      throw BASIC_EXCEPTION.NOT_ALLOW_EMPTY_ON_PROCESS;

    const repos = getRepositories({
      artwork: ArtworkRepository
    }, this.connection.manager)

    const {curPage, rowPerPage, uk, branchType, depth } = search;

    const target: Artwork = await repos.artwork.getOne(
      ['hierarchical'],
      ctx => ctx.searchQuery({uk})
    );
    if( !target )
      throw BASIC_EXCEPTION.EMPTY_CONTENT;

    const allGroupArtworks = await repos.artwork.findGroup(target);
    if( !(allGroupArtworks.length > 1) )
      throw BASIC_EXCEPTION.EMPTY_CONTENT;

    const allGroup = allGroupArtworks.map( ({hierarchical}) => hierarchical)
    let branch: Array<ArtworkHierarchical> = branchType === 'deep'
    ? findDeepBranch(allGroup, target.hierarchical)
    : findDirectBranch(allGroup, target.hierarchical);

    if( !branch || branch.length === 0 )
      throw BASIC_EXCEPTION.EMPTY_CONTENT;

    if( isNumberForm(depth) )
      branch = branch.filter( ({groupDepth}) => groupDepth === search.depth )
    
    if( branch.length === 0 )
      throw BASIC_EXCEPTION.EMPTY_CONTENT;

    if( curPage ){
      const page: PageInfo = new PageInfo({curPage, rowPerPage, totalRow: branch.length});
      const list = branch.slice(page.startRow, page.endRow)
        .map( ({id: hrcId}) => allGroupArtworks.find( ({id: artId}) => artId === hrcId))
      return { page, list }
    }else
      return {
        page: null, 
        list: branch.map( 
          ({id: hrcId}) => 
            allGroupArtworks.find( ({id: artId}) => artId === hrcId)
        )
      }
    
  }
  @TransactionHelper({ paramIndex: 2 })
  async createRootArtwork(
    dto: ArtworkDto, auth: Manager,
    transaction: TransactionHelperParam = {connection: this.connection, entityManager: this.connection.manager}
  ): Promise<Artwork> {
    if( !dto?.menu )
      throw BASIC_EXCEPTION.NOT_ALLOW_EMPTY_ON_PROCESS;
    else if( !auth  )
      throw BASIC_EXCEPTION.NOT_ALLOW_AUTH;
    
    const postMethodRoles: Array<Role> = dto.menu.methods?.find( ({key: mtdKey}) => mtdKey === 'POST' as HttpMethod)?.roles;
    if( 
      postMethodRoles && postMethodRoles.length > 0  // Method:POST 가 BLANK가 아닐 때
      && !isContainRoles({roles: postMethodRoles}, auth.roles, {require: true})  // 
    )
      throw BASIC_EXCEPTION.NOT_ALLOW_AUTH;
    // if( isContainRoles(dto.menu.methods?.find( ({key: mtdKey}) => mtdKey === HttpMethod.), ) )
    //   throw 
    
    // dto.uk = createUuid({ prefix: `${UK_PREFIX.ARTWORK}-${dayjs().format(YYYYMMDDHHmmss)}`, length: 24})
    // dto.writer = auth.nickname;
    // dto.manager = auth;

    return this.createArtwork(
      dto, 
      async ({ self, entityManager: em }) => {
        const hierarchicalRepo = em.getRepository(ArtworkHierarchical);
        const hierarchicalDto: ArtworkHierarchicalDto = {
          groupId: self.id,
          id: self.id,
          groupOrd: 1,
          groupDepth: 0,
          groupParent: null
        }

        const rst = await hierarchicalRepo.save(hierarchicalDto)
        rst.id = self.id;
        return rst;
      },
      transaction
    )
  }

  @TransactionHelper({ paramIndex: 3})
  async createBranchArtwork(
    dto: ArtworkDto, target: Artwork, auth: Manager,
    transaction: TransactionHelperParam = {connection: this.connection, entityManager: this.connection.manager}
  ): Promise<Artwork> {

    if( !target || !dto )
      throw BASIC_EXCEPTION.NOT_ALLOW_EMPTY_ON_PROCESS;
    else if( !auth )
      throw BASIC_EXCEPTION.NOT_ALLOW_AUTH;

    // dto.uk = createUuid({ prefix: `${UK_PREFIX.ARTWORK}-${dayjs().format(YYYYMMDDHHmmss)}`, length: 24})
    // dto.writer = auth.nickname;
    // dto.manager = auth;
    dto.menu = target.menu;

    return this.createArtwork(
      dto, 
      async ({entityManager: em, self}) => {
        const repos = getRepositories({
          artwork: ArtworkRepository,
          hierarchical: ArtworkHierarchical
        }, em);
        const allGroupMenu = await repos.artwork.findGroup(target);
        const allGroup = allGroupMenu.map( ({hierarchical}) => hierarchical);
        const cloneAllGroup = deepClone(allGroup);
        const hierarchicalDto: ArtworkHierarchicalDto = createBranchAndRefresh(allGroup, target.hierarchical)
        hierarchicalDto.id = self.id;
        const refresh = allGroup.filter( h => {
          const find = cloneAllGroup.find( ({id}) => id === h.id);
          return !find || !equals(find, h)
        }) 

        return repos.hierarchical.save(refresh)
          .then( () => hierarchicalDto)
        // return repos.hierarchical.;
      }, transaction
    )
  }

  @TransactionHelper({ paramIndex: 3})
  async patchArtwork(
    origin: Artwork, dto: ArtworkDto, auth: Manager,
    {entityManager}: TransactionHelperParam = {connection: this.connection, entityManager: this.connection.manager}
  ): Promise<Artwork> {

    if( !origin || !dto )
      throw BASIC_EXCEPTION.NOT_ALLOW_EMPTY_ON_PROCESS;
    
    const isOwner = isSameAuth(origin?.manager, auth);
    // isRoot = isContainRoles(auth, ['root'] as Array<DEFAULT_ROLE> )
      // , 
      // reqMenu = dto.menu
    if( !isOwner ) // 본인 것이 아니면
      throw BASIC_EXCEPTION.NOT_ALLOW_AUTH;
    // else if( reqMenu ){
    //   const reqPatchMethodRoles = reqMenu.methods.find( ({key: mtdKey}) => mtdKey === 'PATCH' as HttpMethod)?.roles
    //   if(
    //     reqPatchMethodRoles && reqPatchMethodRoles.length > 0
    //     && !isContainRoles({roles: reqPatchMethodRoles}, auth.roles, {require: true})
    //   )
    //     throw BASIC_EXCEPTION.NOT_ALLOW_AUTH;
    // }

    const repos = getRepositories({
      artwork: ArtworkRepository
    }, entityManager)
      
    const cloneOrigin = deepClone(origin);
    return repos.artwork.save(dto)
    .then( entity => 
      Object.assign(
        cloneOrigin,
        entity
      )
    )
  }

  @TransactionHelper({paramIndex: 2})
  private async createArtwork(
    dto: ArtworkDto, createHierarchical: CreateHierarchical,
    { entityManager }: TransactionHelperParam = {connection: this.connection, entityManager: this.connection.manager}
  ): Promise<Artwork> {
    if( !dto )  
      throw BASIC_EXCEPTION.NOT_ALLOW_EMPTY_ON_PROCESS;

    const repos = getRepositories({
      artwork: ArtworkRepository
    }, entityManager);

    const created = await repos.artwork.save(dto);
    dto.hierarchical = await createHierarchical({self: created, entityManager})

    return created;
  }

  @TransactionHelper({ paramIndex: 2 })
  async deleteArtwork(
    artwork: Artwork, auth: Manager,
    {entityManager}: TransactionHelperParam = {connection: this.connection, entityManager: this.connection.manager}
  ): Promise<Array<Artwork>> {
    if(!artwork?.hierarchical) {
      throw BASIC_EXCEPTION.NOT_ALLOW_EMPTY_ON_PROCESS;
    }
    const isRoot = isContainRoles(auth, ['root'] as Array<DEFAULT_ROLE>);
    const isOwner = isSameAuth(artwork.manager, auth);
    if(!isRoot && !isOwner) {
      throw BASIC_EXCEPTION.NOT_ALLOW_AUTH;
    }

    const repos = getRepositories({
      artwork: ArtworkRepository,
      hierarchical: ArtworkHierarchical
    }, entityManager);

    const allGroups: Array<Artwork> = await repos.artwork
      .findGroup(artwork);
    const {
      deepBranch, elseArtworks
    } = allGroups.reduce(
      (result, a) => {
        if(a.id === artwork.id || a.hierarchical.groupParent === artwork.id) {
          result.deepBranch.push(a)
        } else {
          result.elseArtworks.push(a)
        }
        return result;
      }, {deepBranch: [] as Array<Artwork>, elseArtworks: [] as Array<Artwork>}
    );

    const cloneDeepBranch = deepClone(deepBranch);
console.log("???")
    return repos.artwork.remove(deepBranch)
      .then(async () => {
        elseArtworks.forEach(({hierarchical: h}, i) => h.groupOrd = i + 1);
        await repos.hierarchical.save(
          elseArtworks.map(({hierarchical}) => hierarchical)
        );
        return cloneDeepBranch;
      })
  }
}