import { TABLE_ALIAS } from "src/config/typeorm.config";
import { ArtworkLabel } from "src/entity/artwork/artwork.bridge";
import { Artwork, ArtworkDto } from "src/entity/artwork/artwork.entity";
import { SearchAroundArtworkDto, SearchArtworkDto } from "src/entity/artwork/artwork.interface";
import { ArtworkHierarchical } from "src/entity/artwork/artworkHierarchical.entity";
import { ArtworkI18n } from "src/entity/artwork/artworkI18n.entity";
import { ArtworkKeyword } from "src/entity/artwork/artworkKeyword.entity";
import { ArtworkProperty } from "src/entity/artwork/artworkProperty.entity";
import { ArtworkRange } from "src/entity/artwork/artworkRange.entity";
import { ArtworkRegion } from "src/entity/artwork/artworkRegion.entity";
import { Attachment } from "src/entity/comm/attachment.entity";
import { Keyword } from "src/entity/comm/keyword.entity";
import { Manager } from "src/entity/member/manager.entity";
import { User } from "src/entity/member/user.entity";
import { Menu } from "src/entity/menu/menu.entity";
import { DEFAULT_ROLE } from "src/entity/role/role.interface";
import { COMM_STATE, isContainRoles, isSameAuth } from "src/util/entity.util";
import { equals, isUndeclared, maxText, UNKNOWN } from "src/util/format.util";
import { keysTypeGuard, splitToObject } from "src/util/index.util";
import { ChainRelation, ChainRepository, getRepositories, PathString, SaveSubscriber, SetPropertyEvent } from "src/util/typeorm.util";
import { DeepPartial, EntityManager, EntityRepository, getMetadataArgsStorage, Repository, SaveOptions, SelectQueryBuilder } from "typeorm";
import { AttachmentRepository } from "../comm/attachment.repository";
import { ManagerRepository } from "../member/manager.repository";
import { MenuRepository } from "../menu/menu.repository";
import { ArtworkKeywordRepository } from "./artworkKeyword.repository";
import { ArtworkLabelRepository } from "./artworkLabel.repository";
import { ArtworkRegionRepository } from "./artworkRegion.repository";

// const OBJECT_KEYS: Array<keyof Artwork> = [ 'manager', 'i18ns', 'attachments', 'properties', 'hierarchical', 'keywords', 'i18nKeywords' ];
// const STRING_KEYS: Array<keyof Artwork> = [ 'title', 'content', 'writer' ];
// const TITLE_REG = /^title(\\.[^.]+)?$/;
const CONTENT_REG = /^content(\\.[^.]+)?$/;
// const MANAGER_REG = /^manager|manager\..+/;
const KEYWORD_REG = /^keywords(\\.[^.]+)?$/;
const I18N_KEYWORD_REG = /^i18nKeywords(\\.[^.]+)?$/;

const {
  ARTWORKS,
  ARTWORK_I18NS,
  ARTWORK_HIERARCHICAL,
  ARTWORK_PROPERTIES,
  ARTWORK_KEYWORDS,
  ARTWORK_RANGES,
  ARTWORK_ATTACHMENTS,
  ARTWORK_REGIONS,

  MANAGERS
} = TABLE_ALIAS;

@EntityRepository(Artwork)
export class ArtworkRepository extends ChainRepository<Artwork> {
  public readonly primaryKeys: Array<keyof Artwork> = ['id'];
  public readonly alias: string = ARTWORKS;
  public readonly relationChain: ChainRelation<Artwork> = {
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
    hierarchical: {
      Entity: ArtworkHierarchical,
      getBridges: async ({ selfEntities }) => selfEntities.map(({ id }) => ({ self: { id }, inverse: { id } })),
      getDatas: ({ entityManager: em, selfEntities }) =>
        em.getRepository(ArtworkHierarchical)
          .createQueryBuilder(ARTWORK_HIERARCHICAL)
          .where(`${ARTWORK_HIERARCHICAL}.id IN (:ids)`, { ids: selfEntities.map(({ id }) => id) })
          .getMany()
    },
    i18ns: {
      Entity: ArtworkI18n, fieldIsMany: true,
      getBridges: ({ entityManager: em, selfEntities }) =>
        em.getRepository(ArtworkI18n)
          .createQueryBuilder(ARTWORK_I18NS)
          .select(`${ARTWORK_I18NS}.artwork AS self`)
          .addSelect(`${ARTWORK_I18NS}.i18n AS inverse`)
          .where(`${ARTWORK_I18NS}.artwork IS NOT NULL AND ${ARTWORK_I18NS}.artwork IN (:ids)`, { ids: selfEntities.map(({ id }) => id) })
          .getRawMany()
          .then(result => result.map(({ self, inverse }) => ({ self: { id: self }, inverse: { i18n: inverse, artworkId: self } })))
      ,
      getDatas: ({ entityManager: em, selfEntities }) =>
        em.getRepository(ArtworkI18n)
          .createQueryBuilder(ARTWORK_I18NS)
          .where(`${ARTWORK_I18NS}.artwork IN (:ids)`, { ids: selfEntities.map(({ id }) => id) })
          .getMany()
    },
    attachments: {
      Entity: Attachment, Repository: AttachmentRepository,
      fieldIsMany: true,
      getBridges: ({ entityManager: em, selfEntities }) => {
        const {
          name: tableName,
          joinColumns, inverseJoinColumns
        } = getMetadataArgsStorage()
          .findJoinTable(Artwork, 'attachments' as keyof Artwork);

        const joinColumnName = `${ARTWORK_ATTACHMENTS}.${joinColumns[0].name}`,
          inverseColumnName = `${ARTWORK_ATTACHMENTS}.${inverseJoinColumns[0].name}`;

        return em.createQueryBuilder()
          .select(`${joinColumnName} AS self`)
          .addSelect(`${inverseColumnName} AS inverse`)
          .from(tableName, ARTWORK_ATTACHMENTS)
          .where(`${joinColumnName} IN (:ids)`, { ids: selfEntities.map(({ id }) => id) })
          .orderBy(`${joinColumnName}`, 'DESC')
          .addOrderBy(`${ARTWORK_ATTACHMENTS}.ord`, 'ASC')
          .getRawMany()
          .then(result => result.map(({ self, inverse }) => ({ self: { id: self }, inverse: { id: inverse } })))
      }
    },
    properties: {
      Entity: ArtworkProperty, fieldIsMany: true,
      getBridges: ({ entityManager: em, selfEntities }) =>
        em.getRepository(ArtworkProperty)
          .createQueryBuilder(ARTWORK_PROPERTIES)
          .select(`${ARTWORK_PROPERTIES}.artwork AS self`)
          .addSelect(`${ARTWORK_PROPERTIES}.key AS inverse`)
          .where(`${ARTWORK_PROPERTIES}.artwork IN (:ids)`, { ids: selfEntities.map(({ id }) => id) })
          .getRawMany()
          .then(result => result.map(({ self, inverse }) => ({ self: { id: self }, inverse: { artworkId: self, key: inverse } })))
      ,
      getDatas: ({ entityManager: em, selfEntities }) =>
        em.getRepository(ArtworkProperty)
          .createQueryBuilder(ARTWORK_PROPERTIES)
          .where(`${ARTWORK_PROPERTIES}.artwork IN (:ids)`, { ids: selfEntities.map(({ id }) => id) })
          .getMany()

    },
    i18nKeywords: {
      Entity: ArtworkKeyword, Repository: ArtworkKeywordRepository,
      fieldIsMany: true,
      getBridges: ({ entityManager: em, selfEntities }) =>
        em.getCustomRepository(ArtworkKeywordRepository)
          .searchQuery()
          .select(`${ARTWORK_KEYWORDS}.artwork AS self`)
          .addSelect(`${ARTWORK_KEYWORDS}.id AS inverse`)
          .where(`${ARTWORK_KEYWORDS}.artwork IN (:ids)`, { ids: selfEntities.map(({ id }) => id) })
          .orderBy(`${ARTWORK_KEYWORDS}.artwork`, 'DESC')
          .addOrderBy(`${ARTWORK_KEYWORDS}.i18n`, 'ASC')
          .addOrderBy(`${ARTWORK_KEYWORDS}.ord`, 'ASC')
          .getRawMany()
          // .getMany()
          .then(result => result.map(({ self, inverse }) => ({ self: { id: self }, inverse: { id: inverse } })))
    },
    labels: {
      Entity: ArtworkLabel, Repository: ArtworkLabelRepository,
      fieldIsMany: true,
      getBridges: ({ entityManager: em, selfEntities }) =>
        em.getRepository(ArtworkLabel)
          .createQueryBuilder('ART_LBL')
          .where(`ART_LBL.artworkId IN (:ids)`, { ids: selfEntities.map(({ id }) => id) })
          .orderBy('ART_LBL.artworkId', 'DESC')
          .addOrderBy('ART_LBL.ord', 'ASC')
          .getMany()
          .then(result => result.map(({ artworkId, keywordLabelId }) => ({ self: { id: artworkId }, inverse: { artworkId, keywordLabelId } })))
    },
    ranges: {
      Entity: ArtworkRange,
      fieldIsMany: true,
      getBridges: ({ entityManager: em, selfEntities }) =>
        em.createQueryBuilder()
          .select(`${ARTWORK_RANGES}.artwork AS self`)
          .addSelect(`${ARTWORK_RANGES}.id AS inverse`)
          .from('artwork_ranges', ARTWORK_RANGES)
          .where(`${ARTWORK_RANGES}.artwork IN (:ids)`, { ids: selfEntities.map(({ id }) => id) })
          .getRawMany()
          .then(result => result.map(({ self, inverse }) => ({ self: { id: self }, inverse: { id: inverse } })))
      ,
      getDatas: ({ entityManager: em, selfEntities }) =>
        em.getRepository(ArtworkRange)
          .createQueryBuilder(ARTWORK_RANGES)
          .where(`${ARTWORK_RANGES}.artwork IN (:ids)`, { ids: selfEntities.map(({ id }) => id) })
          .getMany()
    },
    region: {
      Entity: ArtworkRegion, Repository: ArtworkRegionRepository,
      getBridges: async ({ selfEntities }) => selfEntities.map(({ id }) => ({ self: { id }, inverse: { id } }))
    }
    // keywords: {
    //   Entity: Keyword, fieldIsMany: true,
    //   getBridges: ({ entityManager:em, selfEntities }) =>
    //     em.getRepository(ArtworkKeyword)
    //     .createQueryBuilder('ART_KWD')
    //     .where('ART_KWD.artworkId IN (:ids)', {ids: selfEntities.map( ({id}) => id)})
    //     .orderBy('ART_KWD.ord', 'ASC')
    //     .getMany()
    //     .then( result => result.map( ({, inverse}) => ({self: {id: self}, inverse: {artworkId: self, key: inverse}})))

    // }
  }
  // public readonly setPropertySubscribe: ChainingSetPropertySubscribe<Artwork, PathString<Artwork>> = {
  // beforeSetProperty: ({ details, data = {} }) => {
  //   const auth = data.auth as User|Manager;
  //   const flag = details.reduce( (result, detail) => {
  //     if( !result.existTitle && TITLE_REG.test(detail) )
  //       result.existTitle = true;
  //     else if( !result.existContent && CONTENT_REG.test(detail) ){
  //       result.existContent = true;
  //       result.detailContent = !!detail.split('.').find( k => k === 'detail');
  //     } else if( !result.existI18ns && detail === 'i18ns' )
  //       result.existI18ns = true;
  //     else if( !result.existManager && MANAGER_REG.test(detail) )
  //       result.existManager = true;
  //     else if( !result.existKeywords && KEYWORD_REG.test(detail) )
  //       result.existKeywords = true;
  //     else if( !result.existI18nKeywords && I18N_KEYWORD_REG.test(detail) )
  //       result.existI18nKeywords = true;

  //     // if( !result.i18nKeywordsPath && I18N_KEYWORD_REG.test(detail) && detail.indexOf('keyword') > -1 )
  //     //   result.i18nKeywordsPath = detail;

  //     return result;
  //   }, { 
  //     existTitle: false, existContent: false, detailContent: false, 
  //     existI18ns: false, existManager: false, 
  //     existKeywords: false, existI18nKeywords: false
  //   });

  //   const {
  //     existTitle, existContent, existI18ns, existKeywords, existI18nKeywords
  //   } = flag
  //   if( existTitle || existContent || auth !== undefined || existKeywords ){
  //     let refreshDetails = [...details],
  //       lang = data[process.env.PARAM_KEY_LANG];
  //     if( existTitle || existContent){
  //       refreshDetails = refreshDetails.filter( 
  //         detail => !TITLE_REG.test(detail) && !CONTENT_REG.test(detail)
  //       )
  //       if( !existI18ns )
  //         refreshDetails.push( 'i18ns' );
  //     }

  //     if( auth !== undefined )
  //       refreshDetails.push( 'manager' );

  //     if( existKeywords )
  //       refreshDetails = refreshDetails.filter( 
  //         detail => !KEYWORD_REG.test(detail)
  //       );


  //     if( existI18nKeywords && !existI18nKeywords )
  //       refreshDetails.push( 'i18nKeywords' )

  //     return {
  //       details: refreshDetails,
  //       relay: { ...flag, lang }
  //     }
  //   }

  // },
  // afterSetProperty: ({ entities, relay = {}, data = {}}) => {
  //   const auth = data.auth as User|Manager;

  //   if( relay.existTitle || relay.existContent ){
  //     entities.forEach( art => {
  //       const i18n = art.i18ns?.find( ({i18n: iKey}) => relay.lang === iKey) || art.i18ns?.[0];
  //       if( relay.existTitle )
  //         art.title = i18n?.title;
  //       if( relay.existContent )
  //         art.content = relay.detailContent 
  //           ? i18n?.content
  //           : maxText(i18n?.search, 128) 
  //     })

  //     if( !relay.existI18ns )
  //       entities.forEach( a => delete a.i18ns )
  //   }

  //   if( relay.existKeywords ){
  //     entities.forEach( art => {
  //       const artKwd = art.i18nKeywords?.filter( ({i18n: iKey}) => iKey === relay.lang);
  //       if( artKwd )
  //         art.keywords = artKwd.map( ({keyword}) => keyword);
  //     })
  //     if( !relay.existI18nKeywords )
  //       entities.forEach( a => delete a.i18nKeywords )

  //   }

  //   if( auth !== undefined ){
  //     const isRoot = isContainRoles(auth, ['root'] as Array<DEFAULT_ROLE>);

  //     entities.forEach( art => {
  //       if( art.state === COMM_STATE.NORMAL )
  //         return;
  //       const isOwner = isSameAuth(art.manager, auth);
  //       if( !isRoot && !isOwner ){
  //         OBJECT_KEYS.forEach( k => art[k] = undefined as never );
  //         STRING_KEYS.filter(k => !isUndeclared(art[k]) ).forEach( k => art[k] = UNKNOWN as never );
  //       }

  //     })
  //     if( !relay.existManager )
  //       entities.forEach( a => delete a.manager )

  //   }
  // }
  // };
  public readonly setPropertySubscriber: Array<SetPropertyEvent<Artwork, PathString<Artwork>>> = [
    {
      where: ({ data }) => data.auth !== undefined
      ,
      details: ['manager'],
      after: ({ entities, data }) => {
        // const auth = data.auth as User | Manager;
        // const isRoot = isContainRoles(auth, ['root'] as Array<DEFAULT_ROLE>);

        // entities.forEach(entity => {
        //   const isOwner = isSameAuth(entity.manager, auth);
        //   if (entity.state === COMM_STATE.NORMAL)
        //     return;
        //   else if (!isRoot && !isOwner) {
        //     keysTypeGuard(entity).forEach(key => {
        //       const field = entity[key]
        //       if (isUndeclared(field) || field instanceof Date)
        //         return;
        //       else if (['state', 'uk', 'id'].includes(key)) { /* TODO document why this block is empty */ }
        //       else if (typeof field === 'string')
        //         entity[key] = UNKNOWN as never;
        //       else if (typeof field === 'number')
        //         entity[key] = NaN as never;
        //       else
        //         entity[key] = undefined as never;
        //     })

        //   }
        // })
      }
    }
    ,
    {
      where: ({ data, details }) => data.auth !== undefined && details?.some(detail => KEYWORD_REG.test(detail)),
      details: ['i18nKeywords.keyword'],
      after: ({ entities, data }) => {
        const lang = data[process.env.PARAM_KEY_LANG];
        entities.forEach(entity => {
          const keywords = entity.i18nKeywords?.filter(({ i18n: i18 }) => i18 === lang);
          entity.keywords = keywords?.map(kwd => kwd.keyword);
        })
      }
    }
    ,
    {
      where: ({ data }) => data.auth !== undefined
      //&& ( details?.some( detail => TITLE_REG.test(detail)) || details?.some( detail => CONTENT_REG.test(detail)) )
      ,
      details: ['i18ns'],
      after: ({ entities, details, data }) => {
        const lang = data[process.env.PARAM_KEY_LANG];
        // const existTitle = details?.some( detail => TITLE_REG.test(detail));
        const existContent = details?.some(detail => CONTENT_REG.test(detail));
        entities.forEach(entity => {
          const i18n = entity.i18ns?.find(({ i18n: i1 }) => i1 === lang);
          entity.title = i18n?.title;
          entity.content = existContent ? i18n?.content : maxText(i18n?.search, 128)
        })
      }
    }
  ];

  public readonly saveSubscribe: SaveSubscriber<Artwork, PathString<Artwork>> = {
    events: [
      {
        where: entity => entity.attachments?.length > 0,
        afterSave: async ({ entity }) => {
          const {
            name: tableName,
            joinColumns, inverseJoinColumns
          } = getMetadataArgsStorage()
            .findJoinTable(Artwork, 'attachments' as keyof Artwork);

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
    { propsKey, propsVal, secondOrderBy, orderBy,
      uk, title, content, menuIds, root, writer, parentUk, targetEnd,
      managerUk, state, keyword, uks, range, ingEvent, endEvent,
      rangeLatitude, rangeLongitude
    }: SearchArtworkDto = {}
  ): SelectQueryBuilder<Artwork> {
    let query = this.createQueryBuilder(this.alias);

    query = query.leftJoinAndSelect(`${this.alias}.hierarchical`, ARTWORK_HIERARCHICAL)

    if (uk)
      query = query.andWhere(`${this.alias}.uk = :uk`, { uk });

    if (uks)
      query = query.andWhere(`${this.alias}.uk IN (:uks)`, { uks });

    if (menuIds && menuIds.length > 0)
      query = query.andWhere(`${this.alias}.menu IN (:menuIds)`, { menuIds })

    if (title || content) {
      query = query.leftJoin(`${this.alias}.i18ns`, `SRC_${ARTWORK_I18NS}`)
      if (title)
        query = query.andWhere(`SRC_${ARTWORK_I18NS}.title LIKE :title`, { title: `%${title}%` })
      if (content)
        query = query.andWhere(`SRC_${ARTWORK_I18NS}.search LIKE :content`, { title: `%${content}%` })
    }

    if (state)
      query = query.andWhere(`${this.alias}.state IN (:state)`, { state })


    if (writer)
      query = query.andWhere(`${this.alias}.writer LIKE :writer`, { writer: `%${writer}%` })

    if (managerUk)
      query = query.leftJoin(`${this.alias}.manager`, `SRC_${MANAGERS}`)
        .andWhere(`SRC_${MANAGERS}.uk = :managerUk`, { managerUk })

    if (root || parentUk) {
      // query = query.leftJoin(`${this.alias}.hierarchical`, `SRC_${ARTWORK_HIERARCHICAL}`)

      if (root)
        query = query.andWhere(`SRC_${ARTWORK_HIERARCHICAL}.groupParent IS NULL`)
      if (parentUk)
        query = query.leftJoin(Artwork, 'PRT_ART', `SRC_${ARTWORK_HIERARCHICAL}.groupParent = PRT_ART.id`)
          .andWhere(`PRT_ART.uk = :parentUk`, { parentUk })

    }


    if (keyword) {
      query = query.leftJoin(`${this.alias}.i18nKeywords`, `SRC_${ARTWORK_KEYWORDS}`)
        .leftJoin(Keyword, 'SRC_KWD', `SRC_${ARTWORK_KEYWORDS}.keyword = SRC_KWD.id`)
        .andWhere(`SRC_KWD.keyword LIKE :keyword`, { keyword: `%${keyword}%` })
    }
    if (propsKey && propsVal) {
      query = query.leftJoinAndSelect(`${this.alias}.properties`, `SRC_${ARTWORK_PROPERTIES}`)
        .andWhere(`(SRC_${ARTWORK_PROPERTIES}.key = :propsKey and SRC_${ARTWORK_PROPERTIES}.val = :propsVal)`, { propsKey, propsVal })
    }
    if (range) {
      const { start, end } = range;
      const val = { start, end };
      query = query.leftJoin(`${this.alias}.ranges`, `SRC_${ARTWORK_RANGES}`)
      if (start && end) {
        query = query.andWhere(
          `( (SRC_${ARTWORK_RANGES}.startDate IS NULL OR SRC_${ARTWORK_RANGES}.startDate <= :start OR SRC_${ARTWORK_RANGES}.startDate <= :end) AND (SRC_${ARTWORK_RANGES}.endDate IS NULL OR SRC_${ARTWORK_RANGES}.endDate >= :start OR SRC_${ARTWORK_RANGES}.endDate >= :end) )`,
          val
        )
      } else if (start) {
        query = query.andWhere(
          `( (SRC_${ARTWORK_RANGES}.startDate IS NULL OR SRC_${ARTWORK_RANGES}.startDate <= :start) AND (SRC_${ARTWORK_RANGES}.endDate IS NULL OR SRC_${ARTWORK_RANGES}.endDate >= :start) )`,
          val
        )
      } else {

        query = query.andWhere(
          `( (SRC_${ARTWORK_RANGES}.startDate IS NULL OR SRC_${ARTWORK_RANGES}.startDate <= :end) AND (SRC_${ARTWORK_RANGES}.endDate IS NULL OR SRC_${ARTWORK_RANGES}.endDate <= :end) )`,
          val
        )
      }
    }



    if (targetEnd) {
      query = query.leftJoin(`${this.alias}.ranges`, `SRC_TAREND_${ARTWORK_RANGES}`)
      query = query.andWhere(
        `SRC_TAREND_${ARTWORK_RANGES}.endDate = :end`, { end: targetEnd }
      )
    }
    if (ingEvent || endEvent) {
      query = query.leftJoin(`${this.alias}.ranges`, `SRC_EVENT_${ARTWORK_RANGES}`)
      if (ingEvent) {
        query = query.andWhere(
          `(SRC_EVENT_${ARTWORK_RANGES}.startDate IS NULL OR SRC_EVENT_${ARTWORK_RANGES}.startDate <= :start)`, { start: ingEvent }
        )

        query = query.andWhere(
          `(SRC_EVENT_${ARTWORK_RANGES}.endDate IS NULL OR SRC_EVENT_${ARTWORK_RANGES}.endDate >= :end)`, { end: ingEvent }
        )
      }

      if (endEvent) {
        query = query.andWhere(
          `SRC_EVENT_${ARTWORK_RANGES}.endDate < :end`, { end: endEvent }
        )
      }
    }

    if (rangeLatitude || rangeLongitude) {
      query = query.leftJoin(`${this.alias}.region`, `SRC_${ARTWORK_REGIONS}`);

      if (rangeLatitude) {
        let { start: latstart, end: latEnd } = rangeLatitude;
        if (latstart > latEnd) {
          [latstart, latEnd] = [latEnd, latstart];
        }
        const val = { latstart, latEnd };
        if (latstart && latEnd) {
          query = query.andWhere(`SRC_${ARTWORK_REGIONS}.latitude >= :latstart AND SRC_${ARTWORK_REGIONS}.latitude <= :latEnd`, val);
        } else if (latstart && !latEnd) {
          query = query.andWhere(`SRC_${ARTWORK_REGIONS}.latitude >= :latstart`, val);
        } else if (!latstart && latEnd) {
          query = query.andWhere(`SRC_${ARTWORK_REGIONS}.latitude <= :latEnd`, val);
        }
      }

      if (rangeLongitude) {
        let { start: lonStart, end: lonEnd } = rangeLongitude;
        if (lonStart > lonEnd) {
          [lonStart, lonEnd] = [lonEnd, lonStart];
        }
        const val = { lonStart, lonEnd };
        if (lonStart && lonEnd) {
          query = query.andWhere(`SRC_${ARTWORK_REGIONS}.longitude >= :lonStart AND SRC_${ARTWORK_REGIONS}.longitude <= :lonEnd`, val);
        } else if (lonStart && !lonEnd) {
          query = query.andWhere(`SRC_${ARTWORK_REGIONS}.longitude >= :lonStart`, val);
        } else if (!lonStart && lonEnd) {
          query = query.andWhere(`SRC_${ARTWORK_REGIONS}.longitude <= :lonEnd`, val);
        }
      }
    }

    query = query.orderBy(`${ARTWORK_HIERARCHICAL}.groupId`, `DESC`)
      .addOrderBy(`${ARTWORK_HIERARCHICAL}.groupOrd`, 'ASC')

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
          query = query.leftJoinAndSelect(`${this.alias}.ranges`, `SRC_END_${ARTWORK_RANGES}`)
          query = query.orderBy(`SRC_END_${ARTWORK_RANGES}.endDate`, order as 'DESC' | 'ASC');
        }
        if (column === "price") {
          
          query = query.leftJoinAndSelect(`${this.alias}.properties`, `SRC_${ARTWORK_PROPERTIES}_PR`)
          query = query.andWhere(`SRC_${ARTWORK_PROPERTIES}_PR.key = "price"`)
          query = query.orderBy(`SRC_${ARTWORK_PROPERTIES}_PR.val`, order as "DESC" | "ASC") // 오름차순 정렬
        }

      }


    }

    return query;
  }


  public async findGroup(artwork: Artwork): Promise<Array<Artwork>> {
    if (!artwork?.hierarchical)
      return [];

    return this.getMany(
      ['hierarchical'],
      ctx => ctx.searchQuery()
        // .leftJoin(`${ctx.alias}.hierarchical`, ARTWORK_HIERARCHICAL)
        .where(`${ARTWORK_HIERARCHICAL}.groupId = :groupId`, { groupId: artwork.hierarchical.groupId })
        .orderBy(`${ARTWORK_HIERARCHICAL}.groupOrd`, 'ASC')
    )

  }

  public aroundPrevQuery(
    artwork: Artwork, search: SearchAroundArtworkDto
  ): SelectQueryBuilder<Artwork> {

    const { groupId, groupOrd, groupParent } = artwork.hierarchical;

    let query = this.createQueryBuilder(this.alias)
      .leftJoinAndSelect(`${this.alias}.hierarchical`, ARTWORK_HIERARCHICAL)

    if (search.type === 'all') {
      if (groupParent) {
        query = query.andWhere(`${ARTWORK_HIERARCHICAL}.groupId = :groupId`, { groupId })
          .andWhere(`${ARTWORK_HIERARCHICAL}.groupOrd < :groupOrd`, { groupOrd })
          .andWhere(`${this.alias}.menu IN (:menuIds)`, { menuIds: search.menuIds });
      } else {
        query = query.andWhere(`${ARTWORK_HIERARCHICAL}.groupId > :groupId`, { groupId })
          .andWhere(`${this.alias}.menu IN (:menuIds)`, { menuIds: search.menuIds });
      }
    } else {
      query = query.andWhere(`${ARTWORK_HIERARCHICAL}.groupId >= :groupId`, { groupId })
        .andWhere(`${ARTWORK_HIERARCHICAL}.id != :id`, { id: artwork.id })
        .andWhere(`${ARTWORK_HIERARCHICAL}.groupParent IS NULL`)
        .andWhere(`${this.alias}.menu IN (:menuIds)`, { menuIds: search.menuIds });
    }

    query = query.orderBy(`${ARTWORK_HIERARCHICAL}.groupId`, 'ASC')
      .addOrderBy(`${ARTWORK_HIERARCHICAL}.groupOrd`, 'DESC')
    return query;
  }

  public aroundNextQuery(
    artwork: Artwork, search: SearchAroundArtworkDto, nextBranch: number
  ): SelectQueryBuilder<Artwork> {
    const { groupId, groupOrd } = artwork.hierarchical;

    let query = this.createQueryBuilder(this.alias)
      .leftJoinAndSelect(`${ARTWORKS}.hierarchical`, ARTWORK_HIERARCHICAL)

    if (search.type === 'all') {
      if (nextBranch > 0) {
        query = query.andWhere(`${ARTWORK_HIERARCHICAL}.groupId = :groupId`, { groupId })
          .andWhere(`${ARTWORK_HIERARCHICAL}.groupOrd > :groupOrd`, { groupOrd })
          .andWhere(`${this.alias}.menu IN (:menuIds)`, { menuIds: search.menuIds });
      } else {
        query = query.andWhere(`${ARTWORK_HIERARCHICAL}.groupId < :groupId`, { groupId })
          .andWhere(`${this.alias}.menu IN (:menuIds)`, { menuIds: search.menuIds });
      }
    } else {
      query = query.andWhere(`${ARTWORK_HIERARCHICAL}.groupId < :groupId`, { groupId })
        .andWhere(`${ARTWORK_HIERARCHICAL}.id != :id`, { id: artwork.id })
        .andWhere(`${ARTWORK_HIERARCHICAL}.groupParent IS NULL`)
        .andWhere(`${this.alias}.menu IN (:menuIds)`, { menuIds: search.menuIds });
    }

    query = query.orderBy(`${ARTWORK_HIERARCHICAL}.groupId`, 'DESC')
      .addOrderBy(`${ARTWORK_HIERARCHICAL}.groupOrd`, 'ASC')

    return query;
  }

  // public async findAround(
  //   artwork: Artwork, search: SearchAroundArtworkDto
  // ): Promise<Around<Artwork>> {
  //   if( !search || search.id)
  // }



  save<T extends DeepPartial<Artwork>>(entities: T[], options: SaveOptions & { reload: false; }): Promise<T[]>;
  save<T extends DeepPartial<Artwork>>(entities: T[], options?: SaveOptions): Promise<(T & Artwork)[]>;
  save<T extends DeepPartial<Artwork>>(entity: T, options: SaveOptions & { reload: false; }): Promise<T>;
  save<T extends DeepPartial<Artwork>>(entity: T, options?: SaveOptions): Promise<T & Artwork>;
  async save<T extends DeepPartial<Artwork>>(entityOrEntities: T | T[], options?: any): Promise<T | T[]> {
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
        // if( insertOrUpdateAttachments.length > 0 ){
        //   const artAndAttcRepo = this.manager.getRepository( ArtworkAttachment );
        //   promises.push(
        //     sortAttachment({artworkAttachment: artAndAttcRepo}, insertOrUpdateAttachments)
        //   ) 
        // }
        if (updateMenus.length > 0) {
          await this.setProperty(['hierarchical'], updateMenus)
          updateMenus.forEach(menuUpdate => {
            promises.push(
              syncGroupMenu(this.manager, menuUpdate as unknown as Artwork)
            )
          })
        }

        // if( updateLabels.length > 0 ){
        //   const artworkLabelRepo = this.manager.getRepository(ArtworkLabel);
        //   updateLabels.forEach( ({index, labels}) => {
        //     const art = entities[index];
        //     art.labels = labels;
        //     promises.push(
        //       sortArtworkLabels({label: artworkLabelRepo}, art as unknown )
        //     )
        //   }) 
        // }

        await Promise.all(promises)

        return rst as any;
      })
  }

}


const syncGroupMenu = async (
  entityManager: EntityManager,
  updateEntity: Artwork,
): Promise<Array<ArtworkDto>> => {
  if (!updateEntity?.menu)
    return;
  const repos = getRepositories({
    artworkComm: Artwork,
    artwork: ArtworkRepository
  }, entityManager)

  return repos.artworkComm.save(
    await repos.artwork.findGroup(updateEntity)
      .then(rst => rst.filter(({ id }) => id !== updateEntity.id))
      .then(rst => rst.map(({ id }) => ({ id, menu: updateEntity.menu })))
  )
}

// const sortAttachment = async (
//   repos: {artworkAttachment: Repository<ArtworkAttachment>},
//   insertOrUpdateAttachments: Array<DeepPartial<Artwork>>
// ): Promise<Array<ArtworkAttachment>> => {
//   const allArtAtcs = await repos.artworkAttachment.createQueryBuilder('ART_ATC')
//     .where('ART_ATC.artworkId IN (:ids)', {ids: insertOrUpdateAttachments.map( ({id}) => id)})
//     .getMany();
//   // const promises: Array<Promise<any>> = [];
//   const updateEntities = insertOrUpdateAttachments.reduce( (result, {id, attachments}) => {
//     allArtAtcs.filter( ({artworkId}) => artworkId === id)
//     .sort(
//       ({attachmentId: aId}, {attachmentId: bId}) =>
//         attachments.findIndex( ({id: attcId}) => aId === attcId) - attachments.findIndex( ({id: attcId}) => bId === attcId)
//     ).forEach( ({id: artAtcid}, i) =>
//       result.push({id: artAtcid, ord: i+1})
//     );
//     return result;
//   }, [] as Array<Partial<ArtworkAttachment>>)
//   return repos.artworkAttachment.save(updateEntities);
// }

// const sortArtworkLabels = async (
//   repos: { label: Repository<ArtworkLabel> },
//   savedDto: ArtworkDto
// ): Promise<Array<Partial<ArtworkLabel>>> => {

//   const { id: artworkId, labels }= savedDto;
//   const orgArtworkLabels: Array<ArtworkLabel> = await repos.label.createQueryBuilder('ART_LBL')
//   .where('ART_LBL.artworkId = :artworkId', {artworkId})
//   .orderBy('ART_LBL.ord', 'ASC')
//   .getMany();

//   return repos.label.save(labels.map( ({id}, i) => {
//     // const orgLabel = orgArtworkLabels.find( ({keywordLabelId}) => id === keywordLabelId )
//     return {
//       artworkId,
//       keywordLabelId: id,
//       ord: i+1
//     } as ArtworkLabel
//   })).then( async entities => {
//     const deleteArtworkLabels = orgArtworkLabels.filter( ({keywordLabelId: orgId}) => !entities.some( ({keywordLabelId: savedId}) => savedId === orgId ));
//     if( deleteArtworkLabels.length > 0 )
//       await repos.label.remove(deleteArtworkLabels)

//     return entities;
//   })

// }