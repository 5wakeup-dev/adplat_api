import { TABLE_ALIAS } from "src/config/typeorm.config";
import { Menu, MenuDto } from "src/entity/menu/menu.entity";
import { SearchMenuDto } from "src/entity/menu/menu.interface";
import { MenuFunction } from "src/entity/menu/menuFunction.entity";
import { MenuHierarchical } from "src/entity/menu/menuHierarchical.entity";
import { MenuI18n } from "src/entity/menu/menuI18n.entity";
import { MenuMetadata } from "src/entity/menu/menuMetadata.entity";
import { MenuMethod } from "src/entity/menu/menuMethod.entity";
import { MenuProperty } from "src/entity/menu/menuProperty.entity";
import { Bridge } from "src/type/index.type";
import { ChainRelation, ChainRepository, PathString, SaveSubscriber, SetPropertyEvent } from "src/util/typeorm.util";
import { EntityRepository, SelectQueryBuilder } from "typeorm";

// const TITLE_REG = /^title|title\..+/;

const {
  MENUS,
  MENU_HIERARCHICAL,
  MENU_METHODS,
  MENU_FUNCTIONS,
  MENU_I18NS,
  MENU_METADATAS,
  MENU_PROPERTIES,
  ROLES
} = TABLE_ALIAS;
@EntityRepository(Menu)
export class MenuRepository extends ChainRepository<Menu> {
  public primaryKeys: Array<keyof Menu> = ['id'];
  public alias: string = MENUS;
  public relationChain: ChainRelation<Menu> = {
    hierarchical: {
      Entity: MenuHierarchical,
      getBridges: async ({
        selfEntities
      }): Promise<Array<Bridge<Menu, MenuHierarchical>>> =>
        selfEntities.map(({ id }) => ({ self: { id }, inverse: { id } }))
      ,
      getDatas: ({
        entityManager: em, selfEntities
      }): Promise<Array<MenuHierarchical>> =>
        em.getRepository(MenuHierarchical)
          .createQueryBuilder('MNU_HRC')
          .where(`MNU_HRC.id IN (:ids)`, { ids: selfEntities.map(({ id }) => id) })
          .getMany()
    },
    methods: {
      Entity: MenuMethod, fieldIsMany: true,
      getBridges: ({ entityManager: em, selfEntities }) =>
        em.getRepository(MenuMethod)
          .createQueryBuilder(MENU_METHODS)
          .select(`${MENU_METHODS}.menu AS self`)
          .addSelect(`${MENU_METHODS}.key AS inverse`)
          .where(`${MENU_METHODS}.menu IN (:ids)`, { ids: selfEntities.map(({ id }) => id) })
          .getRawMany()
          .then(result =>
            result.map(({ self, inverse }) => ({ self: { id: self }, inverse: { key: inverse, menuId: self } }))
          )
      ,
      getDatas: ({ entityManager: em, selfEntities }) =>
        em.getRepository(MenuMethod)
          .createQueryBuilder(MENU_METHODS)
          .leftJoinAndSelect(`${MENU_METHODS}.roles`, ROLES)
          .where(`${MENU_METHODS}.menu IN (:ids)`, { ids: selfEntities.map(({ id }) => id) })
          .getMany()
    },
    functions: {
      Entity: MenuFunction, fieldIsMany: true,
      getBridges: ({ entityManager: em, selfEntities }) =>
        em.getRepository(MenuFunction)
          .createQueryBuilder(MENU_FUNCTIONS)
          .select(`${MENU_FUNCTIONS}.menu AS self`)
          .addSelect(`${MENU_FUNCTIONS}.key AS inverse`)
          .where(`${MENU_FUNCTIONS}.menu IN (:ids)`, { ids: selfEntities.map(({ id }) => id) })
          .getRawMany()
          .then(result =>
            result.map(({ self, inverse }) => ({ self: { id: self }, inverse: { key: inverse, menuId: self } }))
          )
      ,
      getDatas: ({ entityManager: em, selfEntities }) =>
        em.getRepository(MenuFunction)
          .createQueryBuilder(MENU_FUNCTIONS)
          .leftJoinAndSelect(`${MENU_FUNCTIONS}.roles`, ROLES)
          .where(`${MENU_FUNCTIONS}.menu IN (:ids)`, { ids: selfEntities.map(({ id }) => id) })
          .getMany()
    },
    i18ns: {
      Entity: MenuI18n, fieldIsMany: true,
      getBridges: ({ entityManager: em, selfEntities }) =>
        em.getRepository(MenuI18n)
          .createQueryBuilder(MENU_I18NS)
          .select(`${MENU_I18NS}.menu AS self`)
          .addSelect(`${MENU_I18NS}.i18n AS inverse`)
          .where(`${MENU_I18NS}.menu IN (:ids)`, { ids: selfEntities.map(({ id }) => id) })
          .getRawMany()
          .then(result =>
            result.map(({ self, inverse }) => ({
              self: { id: self },
              inverse: { i18n: inverse, menuId: self }
            }
            ))
          )
      ,
      getDatas: ({ entityManager: em, selfEntities }) =>
        em.getRepository(MenuI18n)
          .createQueryBuilder(MENU_I18NS)
          .where(`${MENU_I18NS}.menu IN (:ids)`, { ids: selfEntities.map(({ id }) => id) })
          .getMany()
    },
    metadatas: {
      Entity: MenuMetadata, fieldIsMany: true,
      getBridges: ({ entityManager: em, selfEntities }) =>
        em.getRepository(MenuMetadata)
          .createQueryBuilder(MENU_METADATAS)
          .select(`${MENU_METADATAS}.menu AS self`)
          .addSelect(`${MENU_METADATAS}.key AS inverse`)
          .where(`${MENU_METADATAS}.menu IN (:ids)`, { ids: selfEntities.map(({ id }) => id) })
          .getRawMany()
          .then(result =>
            result.map(({ self, inverse }) => ({ self: { id: self }, inverse: { key: inverse, menuId: self } }))
          )
      ,
      getDatas: ({ entityManager: em, selfEntities }) =>
        em.getRepository(MenuMetadata)
          .createQueryBuilder(MENU_METADATAS)
          .where(`${MENU_METADATAS}.menu IN (:ids)`, { ids: selfEntities.map(({ id }) => id) })
          .getMany()
    },
    properties: {
      Entity: MenuProperty, fieldIsMany: true,
      getBridges: ({ entityManager: em, selfEntities }) =>
        em.getRepository(MenuProperty)
          .createQueryBuilder(MENU_PROPERTIES)
          .select(`${MENU_PROPERTIES}.menu AS self`)
          .addSelect(`${MENU_PROPERTIES}.key AS inverse`)
          .where(`${MENU_PROPERTIES}.menu IN (:ids)`, { ids: selfEntities.map(({ id }) => id) })
          .getRawMany()
          .then(result =>
            result.map(({ self, inverse }) => ({ self: { id: self }, inverse: { key: inverse, menuId: self } }))
          )
      ,
      getDatas: ({ entityManager: em, selfEntities }) =>
        em.getRepository(MenuProperty)
          .createQueryBuilder(MENU_PROPERTIES)
          .where(`${MENU_PROPERTIES}.menu IN (:ids)`, { ids: selfEntities.map(({ id }) => id) })
          .getMany()
    }


  }

  // public readonly setPropertySubscribe: ChainingSetPropertySubscribe<Menu, PathString<Menu>> = {
  //   beforeSetProperty: ({details, data = {}}) => {
  //     const {
  //       existTitle, existI18ns
  //     } = details.reduce( (result, detail) => {
  //       if( !result.existTitle && TITLE_REG.test(detail) )
  //         result.existTitle = true;
  //       else if( !result.existI18ns && detail === 'i18ns' )
  //         result.existI18ns = true;

  //       return result;
  //     }, { existTitle: false, existI18ns: false});

  //     if( existTitle ){
  //       const refreshDetails = details.filter( detail => !TITLE_REG.test(detail) );
  //       const lang = data[process.env.PARAM_KEY_LANG]
  //       if( !existI18ns )
  //         refreshDetails.push( 'i18ns' );

  //       return {
  //         details: refreshDetails,
  //         relay: { existTitle, lang, existI18ns }
  //       }
  //     }
  //   },
  //   afterSetProperty: ({entities, relay = {}}) => {
  //     if( relay.existTitle ){
  //       entities.forEach( m => {
  //         m.title = (m.i18ns?.find( ({i18n}) => i18n === relay.lang) || m.i18ns?.[0] )?.title
  //       })
  //       if( !relay.existI18ns )
  //         entities.forEach( m => delete m.i18ns )

  //     }

  //   },
  // };
  public readonly setPropertySubscriber: Array<SetPropertyEvent<Menu, PathString<Menu>>> = [
    {
      where: ({ data }) => data.auth !== undefined,
      details: ['i18ns'],
      after: ({ entities, data }) => {
        const lang = data[process.env.PARAM_KEY_LANG];
        entities.forEach(entity => {
          entity.title = (
            entity.i18ns?.find(({ i18n: i1 }) => i1 === lang) || entity.i18ns?.[0]
          )?.title;
        })
      }
    }
  ];

  public readonly saveSubscribe: SaveSubscriber<Menu, PathString<Menu>>;

  public searchQuery(
    {
      absoluteKey, branchType, self,
      metaKey, metaVal, groupId, absoluteKeys
    }: SearchMenuDto = {}
  ): SelectQueryBuilder<Menu> {
    let query = this.createQueryBuilder(this.alias);

    const join = { hierarchical: false }

    if (branchType && absoluteKey) {
      // query = query.andWhere(`${this.alias}.absoluteKey LIKE :absoluteKey`,  {absoluteKey: `${absoluteKey}.%` })
      const selfQuery: string = self ? `OR ${this.alias}.absoluteKey = '${absoluteKey}' ` : '';
      if (branchType === 'deep')
        query = query.andWhere(`( ${this.alias}.absoluteKey LIKE '${absoluteKey}.%' ${selfQuery})`)
      else {//if( branchType === 'direct' )
        join.hierarchical = true
        query = query.leftJoin(`${this.alias}.hierarchical`, `SRC_${MENU_HIERARCHICAL}`)
          .leftJoin(Menu, 'PRT_MNU', `SRC_${MENU_HIERARCHICAL}.groupParent = PRT_MNU.id`)
          // .andWhere(`( ${this.alias}.absoluteKey LIKE '${absoluteKey}.%' ${selfQuery})`)
          .andWhere(`( PRT_MNU.absoluteKey = '${absoluteKey}' ${selfQuery})`);
      }

    } else if (absoluteKey)
      query = query.andWhere(`${this.alias}.absoluteKey = :absoluteKey`, { absoluteKey })

    if (absoluteKeys) {
      query = query.andWhere(`${this.alias}.absoluteKey in (:absoluteKeys)`, { absoluteKeys })
    }

    if (groupId) {
      if (!join.hierarchical)
        query = query.leftJoin(`${this.alias}.hierarchical`, `SRC_${MENU_HIERARCHICAL}`)

      query = query.andWhere(`SRC_${MENU_HIERARCHICAL}.groupId = :groupId`, { groupId })
    }


    if (metaKey || metaVal) {
      query = query.leftJoin(`${this.alias}.metadatas`, MENU_METADATAS)

      if (metaKey)
        query = query.andWhere(`${MENU_METADATAS}.key = :metaKey`, { metaKey })
      if (metaVal)
        query = query.andWhere(`${MENU_METADATAS}.val = :metaVal`, { metaVal })
    }


    return query;
  }

  public async findGroup(menu: MenuDto): Promise<Array<Menu>> {
    if (!menu?.hierarchical)
      return [];

    return this.getMany(
      ['hierarchical'],
      ctx => ctx.searchQuery()
        .leftJoin(`${ctx.alias}.hierarchical`, MENU_HIERARCHICAL)
        .where(`${MENU_HIERARCHICAL}.groupId = :groupId`, { groupId: menu.hierarchical.groupId })
        // .orderBy(`${MENU_HIERARCHICAL}.groupId`, 'DESC')
        .orderBy(`${MENU_HIERARCHICAL}.groupOrd`, 'ASC')
    )
  }
  // public basicQuery({details = {}}: BasicQueryOption<Path<Menu>> = {}): SelectQueryBuilder<Menu> {
  //   let query = this.createQueryBuilder('MNU');

  //   return query;
  // }


}
