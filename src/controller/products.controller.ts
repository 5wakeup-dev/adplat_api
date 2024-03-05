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
import { ProductUtil, artworkUtil } from "src/util/entity.util";
import { ListPageRes } from "src/util/entity/listPage";
import { getRange, initArray, initBoolean, initNumber, splitToObject } from "src/util/index.util";
import { getRepositories, PathString } from "src/util/typeorm.util";
import { Connection } from "typeorm";
import * as dayjs from 'dayjs';
import { isNumberForm } from "src/util/format.util";
import { MenusService } from "src/service/menus.service";
import { AttachmentsService } from "src/service/attachments.service";
import { Product, ProductDto, ProductReq, ProductRes } from "src/entity/product/product.entity";
import { SearchProductDto } from "src/entity/product/product.interface";
import { MemberBasic } from "src/entity/member/memberBasic.entity";
import { ProductsService } from "src/service/products.service";
import { ProductRepository } from "src/repository/product/product.repository";

const PRODUCT_FIT_PIPE = fitPipe<ProductReq>([
  'menu', 'attachments', 'title', 'content', 'ord', 'company',
  'state', "address", "days", "endDate", "link", "logo", "price", "startDate", "themes"
])
const SEARCH_NUMBER_PIPE = dynamicPipe<SearchProductDto>(({ value }) => {
  (['curPage', 'rowPerPage', 'pagePerBlock'] as Array<keyof SearchProductDto>)
    .forEach(key => {
      const val = value[key];
      if (val !== undefined)
        value[key] = initNumber(val) as never;
    })
  return value;
})

const SEARCH_SELECT_PIPE = selectPipe<SearchProductDto>({
  range: (_, val) => getRange<Date>(val as string, v => isNumberForm(v) ? dayjs(initNumber(v)).toDate() : undefined),
  orderBy: (_, val) => {
    const { column, order } = splitToObject(
      val,
      ['column', 'order'],
      {
        limit: [['id', 'view', 'end', "price", 'ord', 'reg_date', 'state'], ['DESC', 'ASC']],
        def: { column: 'reg_date', order: 'DESC' }
      }
    );
    return `${column}-${order}`
  },
  secondOrderBy: (_, val) => {
    const { column, order } = splitToObject(
      val,
      ['column', 'order'],
      {
        limit: [['end'], ['DESC', 'ASC']],
        def: { column: 'end', order: 'DESC' }
      }
    );
    return `${column}-${order}`
  },
  state: (_, val) => {
    const arr = initArray<number>(val, (v) => isNumberForm(v))
    return !arr || arr.length === 0 ? null : arr;
  },
  uks: (_, val) => initArray<string>(val, v => !!v),
})

const SEARCH_FIT_PIPE = fitPipe<SearchProductDto>([
  'curPage', 'rowPerPage', 'pagePerBlock', 'orderBy', 'secondOrderBy',
  'title', 'content', 'managerUk', 'range', 'address', 'company',
  'state', 'uks', "userUk", "theme"

])
const EMAIL_FIT_PIPE = fitPipe<any>([
  "absoluteKeys"
])
@Controller('/products')
export class ProductsController {
  constructor(
    private connection: Connection,
    private productsService: ProductsService,
    private attachmentsService: AttachmentsService,
    private netAddressesService: NetAddressesService,
    private menusService: MenusService
  ) { }


  @Post("/email")
  async sendEmail(
    @Body(EMAIL_FIT_PIPE) body: { absoluteKeys: Array<string> },
    @Auth() auth: Manager ,
  ) {
    return this.productsService.sendMail(body.absoluteKeys, auth);

    
  }
  @Post()
  async postProduct(
    @Body(PRODUCT_FIT_PIPE) body: ProductReq,
    @Auth() auth: Manager | User,
  ): Promise<ProductRes> {

    const repos = getRepositories({
      menu: MenuRepository,
      attachment: AttachmentRepository
    }, this.connection.manager);

    const dto: ProductDto = await ProductUtil.reqToDto(
      body, auth,
      {
        menuRepository: repos.menu,
        attachmentsService: this.attachmentsService,
      }
    )

    return this.productsService.createProduct(dto, auth)
      .then(prd => new ProductRes(prd));
  }

  @Get('/:uk')
  async getProduct(
    @Param('uk') uk: string,
    @Auth() auth: User | Manager,
    @Query(
      'detail', dividePipe()
    ) details: Array<PathString<Product>>,
    @ClientIp() ip: string
  ): Promise<ProductRes> {

    return this.productsService.getProduct(uk, auth)
      .then(async prd => {

        await Promise.all([
          this.connection.getCustomRepository(ProductRepository)
            .setProperty({ details, data: { auth } }, [prd]),

          this.netAddressesService.productAddViewAndCount(prd, ip)
        ])
        return new ProductRes(prd)
      });
  }

  @Get('/move/:uk')
  async moveProduct(
    @Param('uk') uk: string,
    @Auth() auth: User | Manager,
    @Query(
      'detail', dividePipe()
    ) details: Array<PathString<Product>>,
    @ClientIp() ip: string
  ): Promise<ProductRes> {

    return this.productsService.getProduct(uk, auth)
      .then(async art => {

        await Promise.all([
          this.connection.getCustomRepository(ProductRepository)
            .setProperty({ details, data: { auth } }, [art]),
          this.netAddressesService.productAddMoveAndCount(art, ip)
        ])
        return new ProductRes(art)
      });
  }

  @Get('/:menu_absolute_key/page')
  async getListPage(
    @Param('menu_absolute_key') menuAbsoluteKey: string,
    @Query('menuBranchType', stringPipe(['deep', 'direct'])) menuBranchType: 'deep' | 'direct' | undefined,
    @Query('menuMetaKey') menuMetaKey: string,
    @Query('menuMetaVal') menuMetaVal: string,
    @Auth() auth: User | Manager,
    @Query(
      SEARCH_NUMBER_PIPE,
      SEARCH_FIT_PIPE,
      SEARCH_SELECT_PIPE
    ) search: SearchProductDto,
    @Query(
      'detail', dividePipe()
    ) details: Array<PathString<Product>>
  ): Promise<ListPageRes<ProductRes>> {

    search.menuIds = (await this.menusService.getMenus({
      absoluteKey: menuAbsoluteKey, branchType: menuBranchType,
      self: true, metaKey: menuMetaKey, metaVal: menuMetaVal
    })).map(({ id }) => id);

    return this.productsService.getListPage(search, auth)
      .then(async ({ page, list }) => {

        await this.connection.getCustomRepository(ProductRepository)
          .setProperty({ details, data: { auth } }, list)
        return {
          page,
          list: list.map(prd => new ProductRes(prd))
        }
      });
  }

  @Patch('/:uk')
  async patchProduct(
    @Param('uk') uk: string,
    @Body(PRODUCT_FIT_PIPE) body: ProductReq,
    @Auth() auth: Manager | User,
  ): Promise<ProductRes> {

    const repos = getRepositories({
      product: ProductRepository,
      menu: MenuRepository,
      attachment: AttachmentRepository
    }, this.connection.manager);

    const product = await repos.product
      .getOne(
        ['manager', 'menu.methods', 'themes'],
        ctx => ctx.searchQuery({ uk })
      )
    // console.log('[!!!!] AUTH', auth);

    const dto: ProductDto = await ProductUtil.reqToDto(
      body, auth,
      {
        origin: product,
        menuRepository: repos.menu,
        attachmentsService: this.attachmentsService,
      }
    )

    return this.productsService.patchProduct(product, dto, auth)
      .then(prd => new ProductRes(prd));
  }

  @Delete(':uk')
  async deleteArtwork(
    @Param('uk') uk: string,
    @Auth(Manager) auth: Manager | User,
  ): Promise<number> {
    const repos = getRepositories({
      product: ProductRepository
    }, this.connection.manager);

    const product: Product = await repos.product.getOne(
      ['user', 'manager'],
      ctx => ctx.searchQuery({ uk })
    );

    return this.productsService.deleteProduct(product, auth)
      .then(_res => 1);
  }


}