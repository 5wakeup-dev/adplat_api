import { TABLE_ALIAS } from "src/config/typeorm.config";
import { Artwork } from "src/entity/artwork/artwork.entity";
import { Attachment } from "src/entity/comm/attachment.entity";
import { Keyword } from "src/entity/comm/keyword.entity";
import { Manager } from "src/entity/member/manager.entity";
import { User } from "src/entity/member/user.entity";
import { Menu } from "src/entity/menu/menu.entity";
import { equals } from "src/util/format.util";
import { splitToObject } from "src/util/index.util";
import { ChainRelation, ChainRepository, PathString, SaveSubscriber, SetPropertyEvent } from "src/util/typeorm.util";
import { DeepPartial, EntityRepository, getMetadataArgsStorage, SaveOptions, SelectQueryBuilder } from "typeorm";
import { AttachmentRepository } from "../comm/attachment.repository";
import { ManagerRepository } from "../member/manager.repository";
import { MenuRepository } from "../menu/menu.repository";
import { Product } from "src/entity/product/product.entity";
import { UserRepository } from "../member/user.repository";
import { SearchProductDto } from "src/entity/product/product.interface";
import { ProductTheme } from "src/entity/product/productTheme.entity";
import { ProductThemeRepository } from "./productTheme.repository";

const {
  ARTWORK_I18NS,
  ARTWORK_HIERARCHICAL,
  ARTWORK_PROPERTIES,
  ARTWORK_KEYWORDS,
  ARTWORK_RANGES,
  ARTWORK_ATTACHMENTS,
  PRODUCT, PRODUCT_THEMES,
  PRODUCT_ATTACHMENTS,
  MANAGERS, USERS
} = TABLE_ALIAS;

@EntityRepository(Product)
export class ProductRepository extends ChainRepository<Product> {
  public readonly primaryKeys: Array<keyof Product> = ['id'];
  public readonly alias: string = PRODUCT;
  public readonly relationChain: ChainRelation<Product> = {
    menu: {
      Entity: Menu, Repository: MenuRepository,
      getBridges: ({ selfEntities }) =>
        this.searchQuery()
          .select(`${this.alias}.id AS self`)
          .addSelect(`${this.alias}.menu AS inverse`)
          .where(`${this.alias}.menu IS NOT NULL AND ${this.alias}.id IN (:ids)`, { ids: selfEntities.map(({ id }) => id) })
          .getRawMany()
          .then(result => result.map(({ self, inverse }) => ({ self: { id: self }, inverse: { id: inverse } })))
    },
    manager: {
      Entity: Manager, Repository: ManagerRepository,
      getBridges: ({ selfEntities }) =>
        this.searchQuery()
          .select(`${this.alias}.id AS self`)
          .addSelect(`${this.alias}.manager AS inverse`)
          .where(`${this.alias}.id IN (:ids)`, { ids: selfEntities.map(({ id }) => id) })
          .getRawMany()
          .then(result => result.map(({ self, inverse }) => ({ self: { id: self }, inverse: { id: inverse } })))
    },
    user: {
      Entity: User, Repository: UserRepository,
      getBridges: ({ selfEntities }) =>
        this.searchQuery()
          .select(`${this.alias}.id AS self`)
          .addSelect(`${this.alias}.user AS inverse`)
          .where(`${this.alias}.id IN (:ids)`, { ids: selfEntities.map(({ id }) => id) })
          .getRawMany()
          .then(result => result.map(({ self, inverse }) => ({ self: { id: self }, inverse: { id: inverse } })))
    },

    attachments: {
      Entity: Attachment, Repository: AttachmentRepository,
      fieldIsMany: true,
      getBridges: ({ entityManager: em, selfEntities }) => {
        const {
          name: tableName,
          joinColumns, inverseJoinColumns
        } = getMetadataArgsStorage()
          .findJoinTable(Product, 'attachments' as keyof Product);

        const joinColumnName = `${PRODUCT_ATTACHMENTS}.${joinColumns[0].name}`,
          inverseColumnName = `${PRODUCT_ATTACHMENTS}.${inverseJoinColumns[0].name}`;

        return em.createQueryBuilder()
          .select(`${joinColumnName} AS self`)
          .addSelect(`${inverseColumnName} AS inverse`)
          .from(tableName, PRODUCT_ATTACHMENTS)
          .where(`${joinColumnName} IN (:ids)`, { ids: selfEntities.map(({ id }) => id) })
          .orderBy(`${joinColumnName}`, 'DESC')
          .addOrderBy(`${PRODUCT_ATTACHMENTS}.ord`, 'ASC')
          .getRawMany()
          .then(result => result.map(({ self, inverse }) => ({ self: { id: self }, inverse: { id: inverse } })))
      }
    },
    themes: {
      Entity: ProductTheme, Repository: ProductThemeRepository,
      fieldIsMany: true,
      getBridges: ({ entityManager: em, selfEntities }) =>
        em.getRepository(ProductTheme)
          .createQueryBuilder(PRODUCT_THEMES)
          .select(`${PRODUCT_THEMES}.product AS self`)
          .addSelect(`${PRODUCT_THEMES}.id AS inverse`)
          .where(`${PRODUCT_THEMES}.product IN (:ids)`, { ids: selfEntities.map(({ id }) => id) })
          .getRawMany()
          .then(rst => rst.map(({ self, inverse }) => ({ self: { id: self }, inverse: { id: inverse } })))
    },
  }
  public readonly setPropertySubscriber: Array<SetPropertyEvent<Product, PathString<Product>>>

  public readonly saveSubscribe: SaveSubscriber<Product, PathString<Product>> = {
    events: [
      {
        where: entity => entity.attachments?.length > 0,
        afterSave: async ({ entity }) => {
          const {
            name: tableName,
            joinColumns, inverseJoinColumns
          } = getMetadataArgsStorage()
            .findJoinTable(Product, 'attachments' as keyof Product);

          const joinColumnName = joinColumns[0].name;
          const inverseJoinColumnName = inverseJoinColumns[0].name;
          const updateBridge = entity.attachments.map(({ id }, i: number) =>
          ({
            [joinColumnName]: entity.id,
            [inverseJoinColumnName]: id,
            ord: i + 1
          })
          );

          if (updateBridge.length > 0) {
            await Promise.all(
              updateBridge.map(({ ord, ...other }) =>
                this.manager.query(
                  `UPDATE \`${tableName}\` SET \`ord\` = ? WHERE \`${joinColumnName}\` = ? AND \`${inverseJoinColumnName}\` = ?`
                  ,
                  [ord, other[joinColumnName], other[inverseJoinColumnName]]
                )
              )
            )
          }
        }
      }
    ]
  }

  public searchQuery(
    { orderBy, address,
      uk, title, content, menuIds, userUk, theme, targetEnd,
      managerUk, state, uks, range,
    }: SearchProductDto = {}
  ): SelectQueryBuilder<Product> {
    let query = this.createQueryBuilder(this.alias);

    if (uk)
      query = query.andWhere(`${this.alias}.uk = :uk`, { uk });

    if (uks)
      query = query.andWhere(`${this.alias}.uk IN (:uks)`, { uks });

    if (menuIds && menuIds.length > 0)
      query = query.andWhere(`${this.alias}.menu IN (:menuIds)`, { menuIds })


    if (title)
      query = query.andWhere(`${this.alias}.title LIKE :title`, { title: `%${title}%` })

    if (state)
      query = query.andWhere(`${this.alias}.state IN (:state)`, { state })


    if (address) query = query.andWhere(`${this.alias}.address =  :address`, { address })
    
    if (managerUk)
      query = query.leftJoin(`${this.alias}.manager`, `SRC_${MANAGERS}`)
        .andWhere(`SRC_${MANAGERS}.uk = :managerUk`, { managerUk })

    if (userUk)
      query = query.leftJoin(`${this.alias}.user`, `SRC_${USERS}`)
        .andWhere(`SRC_${USERS}.uk = :userUk`, { userUk })


    if (theme) {
      query = query.leftJoin(`${this.alias}.themes`, `${PRODUCT_THEMES}`)
        .andWhere(`${PRODUCT_THEMES}.value = :theme`, { theme })
    }
    if (range) {
      const { start, end } = range;
      const val = { start, end };
      if (start && end) {
        query = query.andWhere(
          `( (${this.alias}.startDate IS NULL OR ${this.alias}.startDate <= :start OR ${this.alias}.startDate <= :end) AND (${this.alias}.endDate IS NULL OR ${this.alias}.endDate >= :start OR ${this.alias}.endDate >= :end) )`,
          val
        )
      } else if (start) {
        query = query.andWhere(
          `( (${this.alias}.startDate IS NULL OR ${this.alias}.startDate <= :start) AND (${this.alias}.endDate IS NULL OR ${this.alias}.endDate >= :start) )`,
          val
        )
      } else {
        query = query.andWhere(
          `( (${this.alias}.startDate IS NULL OR ${this.alias}.startDate <= :end) AND (${this.alias}.endDate IS NULL OR ${this.alias}.endDate <= :end) )`,
          val
        )
      }
    }

    if (targetEnd) {
      query = query.andWhere(
        `${this.alias}.endDate = :end`, { end: targetEnd }
      )
    }

    if (orderBy) {
      if (orderBy) {
        const { column, order } = splitToObject(orderBy, ['column', 'order']);
        if (column === 'view') {
          query = query.orderBy(`${this.alias}.view`, order as 'DESC' | 'ASC')
        }
        if (column === 'ord') {
          query = query.orderBy(`${this.alias}.ord`, order as 'DESC' | 'ASC')
        }

        if (column === 'end') {
          query = query.orderBy(`${this.alias}.endDate`, order as 'DESC' | 'ASC');
        }
        if (column === "price") {

          query = query.orderBy(`${this.alias}.price`, order as "DESC" | "ASC")
        }

      }
    }
    query = query.addOrderBy(`${this.alias}.id`, "DESC") // 오름차순 정렬

    return query;
  }

  save<T extends DeepPartial<Product>>(entities: T[], options: SaveOptions & { reload: false; }): Promise<T[]>;
  save<T extends DeepPartial<Product>>(entities: T[], options?: SaveOptions): Promise<(T & Product)[]>;
  save<T extends DeepPartial<Product>>(entity: T, options: SaveOptions & { reload: false; }): Promise<T>;
  save<T extends DeepPartial<Product>>(entity: T, options?: SaveOptions): Promise<T & Product>;
  async save<T extends DeepPartial<Product>>(entityOrEntities: T | T[], options?: any): Promise<T | T[]> {
    const entities: Array<T> = Array.isArray(entityOrEntities) ? entityOrEntities : [entityOrEntities];
    const ids = entities.filter(({ id }) => id).map(({ id }) => id);
    const originEntities = await this.getMany(
      ['menu', 'attachments'],
      ctx => ctx.searchQuery()
        .where(`${ctx.alias}.id IN (:ids)`, { ids: ids.length > 0 ? ids : ['NULL'] })
    );
    // const updateLabels = entities.reduce( (result, art, i) => {
    //   if( art.labels ){
    //     result.push({
    //       index: i, labels: art.labels as undefined
    //     })
    //     art.labels = undefined;
    //   }
    //   return result;
    // }, [] as Array<{index: number, labels: Array<KeywordLabel>}>)


    return super.save(entityOrEntities as any, options)
      .then(async rst => {

        const insertOrUpdateAttachments = entities.filter(({ attachments }) => attachments && attachments.length > 0)
          .filter(({ id, attachments }) => {
            if (!id)
              return true;
            else
              return !equals(originEntities.find(({ id: orgId }) => orgId === id), attachments)
          });

        const updateMenus = originEntities
          .reduce((result, { id, menu }) => {
            const find = entities.find(({ id: entityId }) => entityId === id);
            if (find && find.menu && find.menu.id !== menu.id)
              result.push({ ...find })
            return result;
          }, []);

        const promises: Array<Promise<any>> = [];



        await Promise.all(promises)

        return rst as any;
      })
  }

}