import { Body, Controller, Delete, Get, NotFoundException, Param, Patch, Post, Query } from "@nestjs/common";
import { Auth } from "src/decorator/auth.decorator";
import { ClientIp } from "src/decorator/clientIp.decorator";
import { LANG } from "src/decorator/lang.decorator";
import { Artwork, ArtworkDto, ArtworkReq, ArtworkRes } from "src/entity/artwork/artwork.entity";
import { SearchAroundArtworkDto, SearchArtworkBranchDto, SearchArtworkDto } from "src/entity/artwork/artwork.interface";
import { Manager } from "src/entity/member/manager.entity";
import { User } from "src/entity/member/user.entity";
import { dividePipe } from "src/pipe/divide.pipe";
import { dynamicPipe } from "src/pipe/dynamic.pipe";
import { fitPipe } from "src/pipe/fit.pipe";
import { selectPipe } from "src/pipe/select.pipe";
import { stringPipe } from "src/pipe/string.pipe";
import { ArtworkRepository } from "src/repository/artwork/artwork.repository";
import { AttachmentRepository } from "src/repository/comm/attachment.repository";
import { MenuRepository } from "src/repository/menu/menu.repository";
import { ArtworksService } from "src/service/artworks.service";
import { NetAddressesService } from "src/service/netAddress.service";
import { artworkUtil } from "src/util/entity.util";
import { ListPageRes } from "src/util/entity/listPage";
import { entriesTypeGuard, getRange, initArray, initBoolean, initNumber, splitToObject } from "src/util/index.util";
import { getRepositories, PathString } from "src/util/typeorm.util";
import { Connection } from "typeorm";
import * as dayjs from 'dayjs';
import { isNumberForm } from "src/util/format.util";
import { MenusService } from "src/service/menus.service";
import { Around } from "src/type/index.type";
import { AroundType, HierarchicalBranchType } from "src/entity/comm/comm.interface";
import { KeywordsService } from "src/service/keywords.service";
import { AttachmentsService } from "src/service/attachments.service";

const ARTWORK_AROUND_TYPE_PIPE = dynamicPipe<AroundType>( ({value}) => {
  if( !['all', 'root'].includes(value) )
    throw new NotFoundException(`Not Found '${value}' as branchType`);
  return value;
})

const ARTWORK_BRANCH_TYPE_PIPE = dynamicPipe<HierarchicalBranchType>( ({value}) => {
  if( !['deep', 'direct'] .includes(value) )
    throw new NotFoundException(`Not Found '${value}' as branchType`);
  return value;
})

const ARTWORK_BRANCH_PIT_PIPE = fitPipe<SearchArtworkBranchDto>([
  'curPage', 'depth', 'rowPerPage'
])
// const ARTWORK_AROUND_FIT_PIPE = fitPipe<SearchAroundArtworkDto>([
  
// ])
const ARTWORK_FIT_PIPE = fitPipe<ArtworkReq>([
  'menu', 'i18ns', 'attachments', 'title', 'content', 'ord',
  'properties', 'state', 'keywords', 'i18nKeywords', 'labels', 'ranges',
  'region'
])
const ARTWORK_SEARCH_NUMBER_PIPE = dynamicPipe<SearchArtworkDto>(({value}) => {
  ( ['curPage', 'rowPerPage', 'pagePerBlock'] as Array<keyof SearchArtworkDto> )
  .forEach( key => {
    const val = value[key];
    if( val !== undefined )
      value[key] = initNumber(val) as never;
  })
  return value;
} )

const ARTWORK_SEARCH_SELECT_PIPE = selectPipe<SearchArtworkDto>({
  root: ( _, val ) => val as any === '' ? true : initBoolean(val),
  range: ( _, val ) => getRange<Date>(val as string, v => isNumberForm(v) ? dayjs( initNumber(v) ).toDate() : undefined),
  orderBy: (_, val) => {
    const {column, order} = splitToObject(
      val, 
      ['column', 'order'],
      {
        limit: [['id', 'view','end',"price",'ord', 'reg_date', 'state'], ['DESC', 'ASC']],
        def: {column: 'reg_date', order: 'DESC'}
      }
    );
    return `${column}-${order}`
  },  
  secondOrderBy: (_, val) => {
    const {column, order} = splitToObject(
      val, 
      ['column', 'order'],
      {
        limit: [['end'], ['DESC', 'ASC']],
        def: {column: 'end', order: 'DESC'}
      }
    );
    return `${column}-${order}`
  },  
  state: ( _, val ) => {
    const arr = initArray<number>(val, (v) => isNumberForm(v))
    return !arr || arr.length === 0 ? null : arr;
  },
  uks: (_, val) => initArray<string>(val, v => !!v),
  rangeLatitude: (_, val) => getRange<number>(val as string, v => isNumberForm(v) ? initNumber(v) : undefined),
  rangeLongitude: (_, val) => getRange<number>(val as string, v => isNumberForm(v) ? initNumber(v) : undefined),
})

const ARTWORK_SEARCH_FIT_PIPE = fitPipe<SearchArtworkDto>([
  'curPage', 'rowPerPage', 'pagePerBlock', 'orderBy','secondOrderBy',
  'title', 'content', 'managerUk', 'range',  'parentUk', 'writer', 'root', 
  'state', 'keyword', 'uks', 'ingEvent', 'endEvent',
  'rangeLatitude', 'rangeLongitude',"propsKey","propsVal"
])

@Controller('/artworks')
export class ArtworksController {
  constructor(
    private connection: Connection,
    private artworksService: ArtworksService,
    private attachmentsService: AttachmentsService,
    private netAddressesService: NetAddressesService,
    private keywordsService: KeywordsService,
    private menusService: MenusService
  ){}

  @Post()
  async postArtwork(
    @Body( ARTWORK_FIT_PIPE ) body: ArtworkReq,
    @Auth( Manager ) auth: Manager,
    @LANG() lang: string
  ): Promise<ArtworkRes> {

    const repos = getRepositories({
      menu: MenuRepository,
      attachment: AttachmentRepository
    }, this.connection.manager);

    const dto: ArtworkDto = await artworkUtil.reqToDto(
      body, auth,
      {
        lang, 
        menuRepository: repos.menu, 
        attachmentsService: this.attachmentsService,
        keywordsService: this.keywordsService
      }
    )

    return this.artworksService.createRootArtwork(dto, auth)
    .then( art => new ArtworkRes(art));
  }

  @Get('/:artwork_uk')
  async getArtwork(
    @Param('artwork_uk') artworkUk: string,
    @Auth() auth: User|Manager,
    @Query( 
      'detail', dividePipe()
    ) details: Array<PathString<Artwork>>,
    @LANG() lang: string,
    @ClientIp() ip: string
  ): Promise<ArtworkRes> {

    return this.artworksService.getArtwork(artworkUk, auth)
    .then( async art => {

      await Promise.all([
        this.connection.getCustomRepository(ArtworkRepository)
        .setProperty({details, data: {lang, auth}}, [art]),

        this.netAddressesService.addViewAndCount(art, ip)
      ])
      return new ArtworkRes(art)
    });
  }

  @Get('/move/:artwork_uk')
  async moveArtwork(
    @Param('artwork_uk') artworkUk: string,
    @Auth() auth: User|Manager,
    @Query( 
      'detail', dividePipe()
    ) details: Array<PathString<Artwork>>,
    @LANG() lang: string,
    @ClientIp() ip: string
  ): Promise<ArtworkRes> {

    return this.artworksService.getArtwork(artworkUk, auth)
    .then( async art => {

      await Promise.all([
        this.connection.getCustomRepository(ArtworkRepository)
        .setProperty({details, data: {lang, auth}}, [art]),
        this.netAddressesService.addMoveAndCount(art, ip)
      ])
      return new ArtworkRes(art)
    });
  }

  @Get('/:menu_absolute_key/page')
  async getArtworkListPage(
    @Param('menu_absolute_key') menuAbsoluteKey: string,
    @Query('menuBranchType', stringPipe(['deep', 'direct'])) menuBranchType: 'deep'|'direct'|undefined,
    @Query('menuMetaKey') menuMetaKey: string,
    @Query('menuMetaVal') menuMetaVal: string,
    @Auth() auth: User|Manager,
    @Query(
      ARTWORK_SEARCH_NUMBER_PIPE,
      ARTWORK_SEARCH_FIT_PIPE,
      ARTWORK_SEARCH_SELECT_PIPE
    ) search: SearchArtworkDto,
    @Query( 
      'detail', dividePipe()
    ) details: Array<PathString<Artwork>>,
    @LANG() lang: string

  ): Promise<ListPageRes<ArtworkRes>> {
    
    search.menuIds = (await this.menusService.getMenus({
      absoluteKey: menuAbsoluteKey, branchType: menuBranchType,
      self: true, metaKey: menuMetaKey, metaVal: menuMetaVal
    })).map( ({id}) => id );

    return this.artworksService.getListPage(search, auth)
    .then( async ({page, list}) => {
      
      await this.connection.getCustomRepository(ArtworkRepository)
      .setProperty({details, data: {lang, auth}}, list)
      return {
        page,
        list: list.map( art => new ArtworkRes(art) )
      }
    });
  }

  @Get('/:menu_absolute_key/around/:artwork_uk/:type')
  async getAroundArtwork(
    @Param('menu_absolute_key') menuAbsoluteKey: string,
    @Query(
      'menuBranchType', stringPipe<HierarchicalBranchType>(['deep', 'direct'])
    ) menuBranchType: 'deep'|'direct'|undefined,
    @Query('menuMetaKey') menuMetaKey: string,
    @Query('menuMetaVal') menuMetaVal: string,

    @Param('artwork_uk') artworkUk: string,
    @Auth() auth: User|Manager,
    @Param( 'type', ARTWORK_AROUND_TYPE_PIPE ) type: AroundType,
    @Query( 'detail', dividePipe() ) details: Array<PathString<Artwork>>,
    @LANG() lang: string
  ): Promise<Around<ArtworkRes>> {

    const repos = getRepositories({
      artwork: ArtworkRepository
    }, this.connection.manager)

    const [ menuIds, artwork ] = await Promise.all([

      this.menusService.getMenus({
        absoluteKey: menuAbsoluteKey, branchType: menuBranchType,
        self: true, metaKey: menuMetaKey, metaVal: menuMetaVal
      }).then( menus => menus.map( ({id}) => id) ),

      repos.artwork.getOne(
        ['hierarchical'],
        ctx => ctx.searchQuery({uk: artworkUk})
      ),
    ])

    const search: SearchAroundArtworkDto = { menuIds, id: artwork?.id, type }

    return this.artworksService.getAroundArtwork(search, artwork)
    .then( async around => {
      const entries = entriesTypeGuard(around)
      .filter( ([,val]) => val);

      await repos.artwork.setProperty(
        {details, data: {lang, auth}},
        entries.map( ([, val]) => val )
      )

      return entries.reduce( (record, [key, val]) => {
        record[key] = new ArtworkRes(val);
        return record;
      }, {} as Around<ArtworkRes>);
    });
  }

  @Get('/branch/:artwork_uk/:branch_type')
  getArtworksBranch(
    @Param('artwork_uk') artworkUk: string,
    @Param('branch_type', ARTWORK_BRANCH_TYPE_PIPE) branchType: HierarchicalBranchType,
    @Query(
      ARTWORK_SEARCH_NUMBER_PIPE,
      ARTWORK_BRANCH_PIT_PIPE
    ) search: SearchArtworkBranchDto,
    
    @Auth() auth: User|Manager,
    @LANG() lang: string,
    @Query( 'detail', dividePipe() ) details: Array<PathString<Artwork>>,
  ): Promise<ListPageRes<ArtworkRes>> {
    search.uk = artworkUk;
    search.branchType = branchType;

    return this.artworksService.getListPageAsBranch(search, auth)
    .then( async ({page, list}) => 
      this.connection.getCustomRepository(ArtworkRepository)
      .setProperty({details, data: {lang, auth}}, list)
      .then( () => ({
        page, list: list.map( art => new ArtworkRes(art) )
      }))
    );
  } 

  @Patch('/:artwork_uk')
  async patchArtwork(
    @Param('artwork_uk') artworkUk: string,
    @Body( ARTWORK_FIT_PIPE ) body: ArtworkReq,
    @Auth( Manager ) auth: Manager,
    @LANG() lang: string
  ): Promise<ArtworkRes> {

    const repos = getRepositories({
      artwork: ArtworkRepository,
      menu: MenuRepository,
      attachment: AttachmentRepository
    }, this.connection.manager);

    const artwork = await repos.artwork
      .getOne(
        ['manager', 'menu.methods', 'i18ns', 'i18nKeywords', 'ranges'], 
        ctx => ctx.searchQuery({uk: artworkUk})
      )
    // console.log('[!!!!] AUTH', auth);

    const dto: ArtworkDto = await artworkUtil.reqToDto(
      body, auth,
      {
        origin: artwork, lang, 
        menuRepository: repos.menu,
        attachmentsService: this.attachmentsService,
        keywordsService: this.keywordsService
      }
    )
    
    return this.artworksService.patchArtwork(artwork, dto, auth)
    .then( art => new ArtworkRes(art) );
  }

  @Post('/:artwork_uk')
  async postBranchArtwork(
    @Param('artwork_uk') artworkUk: string,
    @Body( ARTWORK_FIT_PIPE ) body: ArtworkReq,
    @Auth( Manager ) auth: Manager,
    @LANG() lang: string
  ): Promise<ArtworkRes> {
    const repos = getRepositories({
      artwork: ArtworkRepository,
      attachment: AttachmentRepository
    }, this.connection.manager);

    const target = await repos.artwork
      .getOne(
        ['hierarchical', 'menu'],
        ctx => ctx.searchQuery({uk: artworkUk})
      )

    const dto: ArtworkDto = await artworkUtil.reqToDto(
      body, auth,
      { 
        attachmentsService: this.attachmentsService, 
        keywordsService: this.keywordsService,
        lang 
      }
    )

    return this.artworksService.createBranchArtwork(dto, target, auth)
    .then( art => new ArtworkRes(art) )
  }

  @Delete(':artwork_uk')
  async deleteArtwork(
    @Param('artwork_uk') artworkUk: string,
    @Auth( Manager ) auth: Manager,
  ): Promise<number> {
    const repos = getRepositories({
      artwork: ArtworkRepository
    }, this.connection.manager);

    const artwork: Artwork = await repos.artwork.getOne(
      ['hierarchical', 'manager'],
      ctx => ctx.searchQuery({uk: artworkUk})
    );

    return this.artworksService.deleteArtwork(artwork, auth)
      .then(deleteArtworks => deleteArtworks.length);
  }
}