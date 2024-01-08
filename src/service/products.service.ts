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
import { Product, ProductDto } from "src/entity/product/product.entity";
import { ProductRepository } from "src/repository/product/product.repository";
import { SearchProductDto } from "src/entity/product/product.interface";

@Injectable()
export class ProductsService {
  constructor(
    private connection: Connection,
  ) { }

  async getProduct(
    uk: string, auth: User | Manager
  ): Promise<Product> {
    if (!uk)
      throw BASIC_EXCEPTION.EMPTY_CONTENT;
    const repos = getRepositories({
      product: ProductRepository
    }, this.connection.manager);

    const product = await repos.product.getOne(
      undefined, // ['menu.methods', 'manager'],
      ctx => ctx.searchQuery({ uk })
    )
    // const isRoot = isContainRoles(auth, ['root'] as Array<DEFAULT_ROLE>);
    // const isOwner = isSameAuth(auth, artwork?.manager)
    if (!product)
      throw BASIC_EXCEPTION.EMPTY_CONTENT;
    
    const { manager, user, menu, ...other } = product;

    return { ...other };
  }

  async getListPage(
    search: SearchProductDto, auth: User | Manager
  ): Promise<ListPageRes<Product>> {
    const repos = getRepositories({
      product: ProductRepository
    }, this.connection.manager);

    const { curPage, rowPerPage, pagePerBlock } = search;

    const totalRow = await repos.product.searchQuery(search)
      .getCount();
    if (totalRow === 0)
      throw BASIC_EXCEPTION.EMPTY_CONTENT;
    let queryBuilder = repos.product.searchQuery(search);
    const page: PageInfo = new PageInfo({ curPage, rowPerPage, totalRow, pagePerBlock });

    const list = await queryBuilder
      .skip(page.startRow)
      .take(page.rowPerPage)
      .getMany()

    return { page, list }
  }


  @TransactionHelper({ paramIndex: 2 })
  async createProduct(
    dto: ProductDto, auth: Manager|User,
    { entityManager }: TransactionHelperParam = { connection: this.connection, entityManager: this.connection.manager }
  ): Promise<Product> {
    if (!dto?.menu)
      throw BASIC_EXCEPTION.NOT_ALLOW_EMPTY_ON_PROCESS;
    else if (!auth)
      throw BASIC_EXCEPTION.NOT_ALLOW_AUTH;

    const repos = getRepositories({
      product: ProductRepository
    }, entityManager);
    return await repos.product.save(dto);
  }

  @TransactionHelper({ paramIndex: 3 })
  async patchProduct(
    origin: Product, dto: ProductDto, auth: Manager | User,
    { entityManager }: TransactionHelperParam = { connection: this.connection, entityManager: this.connection.manager }
  ): Promise<Product> {

    if (!origin || !dto)
      throw BASIC_EXCEPTION.NOT_ALLOW_EMPTY_ON_PROCESS;

    const isOwner = isSameAuth(origin?.manager, auth) || isSameAuth(origin?.user, auth);
    const isRoot = isContainRoles(auth, ['root'] as Array<DEFAULT_ROLE>)

    if (!isRoot && !isOwner) // 본인 것이 아니면
      throw BASIC_EXCEPTION.NOT_ALLOW_AUTH;

    const repos = getRepositories({
      product: ProductRepository
    }, entityManager)

    const cloneOrigin = deepClone(origin);
    return repos.product.save(dto)
      .then(entity =>
        Object.assign(
          cloneOrigin,
          entity
        )
      )
  }

  @TransactionHelper({ paramIndex: 2 })
  async deleteProduct(
    product: Product, auth: Manager | User,
    { entityManager }: TransactionHelperParam = { connection: this.connection, entityManager: this.connection.manager }
  ): Promise<Product> {

    const isRoot = isContainRoles(auth, ['root'] as Array<DEFAULT_ROLE>);
    const isOwner = isSameAuth(product.manager, auth) || isSameAuth(product.user, auth);
    if (!isRoot && !isOwner) {
      throw BASIC_EXCEPTION.NOT_ALLOW_AUTH;
    }

    const repos = getRepositories({
      product: ProductRepository
    }, entityManager);


    return repos.product.remove(product);
  }
}