import { TABLE_ALIAS } from "src/config/typeorm.config";
import { Attachment } from "src/entity/comm/attachment.entity";
import { Consulting, ConsultingDto } from "src/entity/consulting/consulting.entity";
import { SearchAroundConsultingDto, SearchConsultingDto } from "src/entity/consulting/consulting.interface";
import { ConsultingHierarchical } from "src/entity/consulting/consultingHierarchical.entity";
import { ConsultingProperty } from "src/entity/consulting/consultingProperty.entity";
import { Manager } from "src/entity/member/manager.entity";
import { User } from "src/entity/member/user.entity";
import { Menu } from "src/entity/menu/menu.entity";
import { equals, maxText } from "src/util/format.util";
import { ChainRelation, ChainRepository, getRepositories, PathString, SaveSubscriber, SetPropertyEvent } from "src/util/typeorm.util";
import { DeepPartial, EntityManager, EntityRepository, getMetadataArgsStorage, Repository, SaveOptions, SelectQueryBuilder } from "typeorm";
import { AttachmentRepository } from "../comm/attachment.repository";
import { ManagerRepository } from "../member/manager.repository";
import { UserRepository } from "../member/user.repository";
import { MenuRepository } from "../menu/menu.repository";
import { ConsultingSave } from "src/entity/consulting/consultingSave.entity";
import { ConsultingSaveRepository } from "./consultingsaves.repository";

// const OBJECT_KEYS: Array<keyof Consulting> = [ 'manager', 'user', 'attachments', 'properties', 'hierarchical'];
// const STRING_KEYS: Array<keyof Consulting> = [ 'title', 'content', 'writer' ];
// // const TITLE_REG = /^title|title\..+/;
// const CONTENT_REG = /^content|content\..+/;
// const MANAGER_REG = /^manager|manager\..+/;
// const USER_REG = /^user|user\..+/;

const {
  CONSULTINGS,
  CONSULTING_HIERARCHICAL,
  CONSULTING_PROPERTIES,
  CONSULTING_SAVES,
  CONSULTING_ATTACHMENTS,

  MANAGERS,
  USERS
} = TABLE_ALIAS;

@EntityRepository(Consulting)
export class ConsultingRepository extends ChainRepository<Consulting> {
  public readonly primaryKeys: Array<keyof Consulting> = ['id'];
  public readonly alias: string = CONSULTINGS;
  public readonly relationChain: ChainRelation<Consulting> = {
    menu: {
      Entity: Menu, Repository: MenuRepository,
      getBridges: ({selfEntities}) =>
        this.searchQuery()
          .select(`${this.alias}.id AS self`)
          .addSelect(`${this.alias}.menu AS inverse`)
          .where(`${this.alias}.menu IS NOT NULL AND ${this.alias}.id IN (:ids)`, {ids: selfEntities.map(({id}) => id)})
          .getRawMany()
          .then(result => result.map(({self, inverse}) => ({self: {id: self}, inverse: {id: inverse}})))
    },
    manager: {
      Entity: Manager, Repository: ManagerRepository,
      getBridges: ({selfEntities}) =>
        this.searchQuery()
          .select(`${this.alias}.id AS self`)
          .addSelect(`${this.alias}.manager AS inverse`)
          .where(`${this.alias}.id IN (:ids)`, {ids: selfEntities.map(({id}) => id)})
          .getRawMany()
          .then(result => result.map(({self, inverse}) => ({self: {id: self}, inverse: {id: inverse}})))
    },
    user: {
      Entity: User, Repository: UserRepository,
      getBridges: ({selfEntities}) =>
        this.searchQuery()
          .select(`${this.alias}.id AS self`)
          .addSelect(`${this.alias}.user AS inverse`)
          .where(`${this.alias}.id IN (:ids)`, {ids: selfEntities.map(({id}) => id)})
          .getRawMany()
          .then(result => result.map(({self, inverse}) => ({self: {id: self}, inverse: {id: inverse}})))
    },
    
    hierarchical: {
      Entity: ConsultingHierarchical,
      getBridges: async ({selfEntities}) =>
        selfEntities.map(({id}) => ({self: {id:id as any}, inverse: {id}})),
      getDatas: ({entityManager: em, selfEntities}) =>
        em.getRepository(ConsultingHierarchical)
          .createQueryBuilder(CONSULTING_HIERARCHICAL)
          .where(`${CONSULTING_HIERARCHICAL}.id IN (:ids)`, {ids: selfEntities.map(({id}) => id)})
          .getMany()
    },
    attachments: {
      Entity: Attachment, Repository: AttachmentRepository,
      fieldIsMany: true,
      getBridges: ({entityManager: em, selfEntities}) => {
        const {
          name: tableName,
          joinColumns, inverseJoinColumns
        } = getMetadataArgsStorage()
          .findJoinTable(Consulting, 'attachments' as keyof Consulting);
        
        const joinColumnName = `${CONSULTING_ATTACHMENTS}.${joinColumns[0].name}`,
          inverseColumnName = `${CONSULTING_ATTACHMENTS}.${inverseJoinColumns[0].name}`;
        
        return em.createQueryBuilder()
          .select(`${joinColumnName} AS self`)
          .addSelect(`${inverseColumnName} AS inverse`)
          .from(tableName, CONSULTING_ATTACHMENTS)
          .where(`${joinColumnName} IN (:ids)`, {ids: selfEntities.map(({id}) => id)})
          .orderBy(`${joinColumnName}`, 'DESC')
          .addOrderBy(`${CONSULTING_ATTACHMENTS}.ord`, 'ASC')
          .getRawMany()
          .then( result => result.map(({self, inverse}) => ({self: {id: self}, inverse: {id: inverse}})))
      }
    },
    properties: {
      Entity: ConsultingProperty, fieldIsMany: true,
      getBridges: ({entityManager: em, selfEntities}) =>
        em.getRepository(ConsultingProperty)
          .createQueryBuilder(CONSULTING_PROPERTIES)
          .select(`${CONSULTING_PROPERTIES}.consulting AS self`)
          .addSelect(`${CONSULTING_PROPERTIES}.key AS inverse`)
          .where(`${CONSULTING_PROPERTIES}.consulting IN (:ids)`, {ids: selfEntities.map(({id}) => id)})
          .getRawMany()
          .then(result => result.map(({self, inverse}) => ({self: {id: self}, inverse: {consultingId: self, key: inverse}}))),
      getDatas: ({entityManager: em, selfEntities}) =>
        em.getRepository(ConsultingProperty)
          .createQueryBuilder(CONSULTING_PROPERTIES)
          .where(`${CONSULTING_PROPERTIES}.consulting IN (:ids)`, {ids: selfEntities.map(({id}) => id)})
          .getMany()
    },
    // saves: {
    //   Entity: ConsultingSave,Repository:ConsultingSaveRepository,
    //   fieldIsMany: true,
    //   getBridges: ({ entityManager: em, selfEntities }) =>
    //     em.createQueryBuilder()
    //       .select(`${CONSULTING_SAVES}.consulting AS self`)
    //       .addSelect(`${CONSULTING_SAVES}.id AS inverse`)
    //       .from('consulting_saves', CONSULTING_SAVES)
    //       .where(`${CONSULTING_SAVES}.consulting IN (:ids)`, { ids: selfEntities.map(({ id }) => id) })
    //       .getRawMany()
    //       .then(result => result.map(({ self, inverse }) => ({ self: { id: self }, inverse: { id: inverse } })))
    // },
    saves: {
      Entity: ConsultingSave, Repository: ConsultingSaveRepository,fieldIsMany:true,
      getBridges: ({ entityManager: em, selfEntities }) =>
      em.getCustomRepository(ConsultingSaveRepository)
        .searchQuery()
        .select(`${CONSULTING_SAVES}.consulting AS self`)
        .addSelect(`${CONSULTING_SAVES}.id AS inverse`)
        .where(`${CONSULTING_SAVES}.consulting IN (:ids)`, { ids: selfEntities.map(({ id }) => id) })
        .getRawMany()
        .then(result => result.map(({ self, inverse }) => ({ self: { id: self }, inverse: { id: inverse } })))
    },
  }

  // public readonly setPropertySubscribe: ChainingSetPropertySubscribe<Consulting, PathString<Consulting>> = {
  //   beforeSetProperty: ({details}) => {
  //     const flag = details.reduce((result, detail) => {
  //       if(!result.existContent && CONTENT_REG.test(detail)) {
  //         result.existContent = true;
  //         result.detailContent = !!detail.split('.').find(k => k === 'detail');
  //       } else if(!result.existManager && MANAGER_REG.test(detail)) {
  //         result.existManager = true;
  //       } else if(!result.existUser && USER_REG.test(detail)) {
  //         result.existUser = true;
  //       }

  //       return result;
  //     }, {
  //       existContent: false, detailContent: false,
  //       existManager: false, existUser: false
  //     });

  //     const {
  //       existContent
  //     } = flag;

  //     if(existContent) {
  //       let refreshDetails = details.filter(
  //         detail => !CONTENT_REG.test(detail)
  //       )

  //       refreshDetails.push('manager');
  //       refreshDetails.push('user');

  //       return {
  //         details: refreshDetails,
  //         relay: {...flag}
  //       }
  //     }
  //   },
  //   afterSetProperty: ({entities, relay = {}}) => {

  //     if(relay.existContent) {
  //       entities.forEach(cst => {
  //         if(relay.existContent) {
  //           cst.content = relay.detailContent
  //             ? cst.content
  //             : maxText(cst.search, 128)
  //         }
  //       })
  //     }
  //   }
  // };
  public readonly setPropertySubscriber: Array<SetPropertyEvent<Consulting, PathString<Consulting>>> = [
    {
      where: ({data, details}) => 
        data.auth !== undefined && !details.some( detail => detail === 'content'),
      after: ({entities}) => {
        entities.forEach( entity => entity.content = maxText(entity.search, 128) )
      }
    }
  ];

  public readonly saveSubscribe: SaveSubscriber<Consulting, PathString<Consulting>> = {
    events: [
      {
        where: entity => entity.attachments?.length > 0,
        afterSave: async ({entity}) => {
          const {
            name: tableName,
            joinColumns, inverseJoinColumns
          } = getMetadataArgsStorage()
            .findJoinTable(Consulting, 'attachments' as keyof Consulting);

          const joinColumnName = joinColumns[0].name;
          const inverseJoinColumnName = inverseJoinColumns[0].name;
          const updateBridge = entity.attachments.map( ({ id }, i: number ) => 
            ({
              [joinColumnName]: entity.id,
              [inverseJoinColumnName]: id,
              ord: i+1
            })
          );

          if(updateBridge.length > 0) {
            await Promise.all(
              updateBridge.map(({ord, ...other}) =>
                this.manager.query(
                  `UPDATE \`${tableName}\` SET \`ord\` = ? WHERE \`${joinColumnName}\` = ? AND \`${inverseJoinColumnName}\` = ?`
                  ,
                  [ ord, other[joinColumnName], other[inverseJoinColumnName]]
                )
              )
            )
          }
        }
      }
    ]
  }

  public searchQuery({
    uk, root, title, content, writer, parentUk, productUk, 
    receiveUk, orReceiveUk,
    menuIds, searchKey, searchVal, userUk, managerUk,
    blockConsultings
  }: SearchConsultingDto = {}): SelectQueryBuilder<Consulting> {
    let query = this.createQueryBuilder(this.alias);

    if(uk) {
      query = query.andWhere(`${this.alias}.uk = :uk`, {uk});
    }

    if(menuIds && menuIds.length > 0) {
      query = query.andWhere(`${this.alias}.menu IN (:menuIds)`, {menuIds});
    }

    if(title) {
      query = query.andWhere(`${this.alias}.title LIKE :title`, {title: `%${title}%`});
    }

    if(content) {
      query = query.andWhere(`${this.alias}.search LIKE :content`, {title: `%${content}%`});
    }

    if(root || parentUk) {
      query = query.leftJoin(`${this.alias}.hierarchical`, `SRC_${CONSULTING_HIERARCHICAL}`);
      if(root) {
        query = query.andWhere(`SRC_${CONSULTING_HIERARCHICAL}.groupParent IS NULL`);
      }
      if(parentUk) {
        query = query.leftJoin(Consulting, 'PRT_CST', `SRC_${CONSULTING_HIERARCHICAL}.groupParent = PRT_CST.id`)
          .andWhere(`PRT_CST.uk = :parentUk`, {parentUk});
      }
    }

    if(writer) {
      query = query.andWhere(`${this.alias}.writer LIKE :writer`, {writer: `%${writer}%`});
    }

    if(managerUk) {
      query = query.leftJoin(`${this.alias}.manager`, `SRC_${MANAGERS}`)
        .andWhere(`SRC_${MANAGERS}.uk = :managerUk`, {managerUk});
    }

    if(userUk) {
      query = query.leftJoin(`${this.alias}.user`, `SRC_${USERS}`)
        .andWhere(`SRC_${USERS}.uk = :userUk`, {userUk});
    }

    if(searchKey || searchVal) {
      query = query.leftJoin(ConsultingProperty, 'SRC_PROP', `SRC_PROP.consulting = ${CONSULTINGS}.id`)
      if(searchKey) {
        query = query.andWhere(`SRC_PROP.key = :searchKey`, {searchKey})
      }
      if(searchVal) {
        query = query.andWhere(`SRC_PROP.val LIKE :searchVal`, {searchVal: `%${searchVal}%`})
      }
    }

    if(blockConsultings) {
      query = query.andWhere(`${this.alias}.uk NOT IN (:blockConsultings)`, {blockConsultings})
    }

    if(receiveUk || receiveUk === null || orReceiveUk || orReceiveUk === null) {
      query = query.leftJoin(`${this.alias}.receiverManager`, `SRC_RCV_${MANAGERS}`);

      const receiveArr = [receiveUk, orReceiveUk]
        .filter(rcvUk => rcvUk !== undefined)
        .reduce((result, rcvUk, i) => {
          if(rcvUk === null) {
            result.query.push(`SRC_RCV_${MANAGERS}.uk IS NULL`);
          } else if(rcvUk.toUpperCase() === 'IS_NOT_NULL') {
            result.query.push(`SRC_RCV_${MANAGERS}.uk IS NOT NULL`);
          } else {
            const key = `receiveUk_${i}`;
            result.query.push(`SRC_RCV_${MANAGERS}.uk = :${key}`);
            result.value[key] = rcvUk;
          }
          return result;
        }, {query: [], value: {}});

      query = query.andWhere(`(${receiveArr.query.join(' OR ')})`, receiveArr.value);
    }

    return query;
  }

  public async findGroup(consulting: Consulting): Promise<Array<Consulting>> {
    if(!consulting?.hierarchical) {
      return [];
    }

    return this.getMany(
      ['hierarchical'],
      ctx => ctx.searchQuery()
        .leftJoin(`${ctx.alias}.hierarchical`, CONSULTING_HIERARCHICAL)
        .where(`${CONSULTING_HIERARCHICAL}.groupId = :groupId`, {groupId: consulting.hierarchical.groupId})
        .orderBy(`${CONSULTING_HIERARCHICAL}.groupOrd`, 'ASC')
    )
  }

  public aroundPrevQuery(
    consulting: Consulting, search: SearchAroundConsultingDto
  ): SelectQueryBuilder<Consulting> {
    const {groupId, groupOrd, groupParent} = consulting.hierarchical;

    let query = this.createQueryBuilder(this.alias)
      .leftJoinAndSelect(`${this.alias}.hierarchical`, `${CONSULTING_HIERARCHICAL}`)

    if(search.type === 'all') {
      if(groupParent) {
        query = query.andWhere(`${CONSULTING_HIERARCHICAL}.groupId = :groupId`, {groupId})
          .andWhere(`${CONSULTING_HIERARCHICAL}.groupOrd < :groupOrd`, {groupOrd})
          .andWhere(`${this.alias}.menu IN (:menuIds)`, {menuIds: search.menuIds});
      } else {
        query = query.andWhere(`${CONSULTING_HIERARCHICAL}.groupId > :groupId`, {groupId})
          .andWhere(`${this.alias}.menu IN (:menuIds)`, {menuIds: search.menuIds});
      }
    } else {
      query = query.andWhere(`${CONSULTING_HIERARCHICAL}.groupId >= :groupId`, {groupId})
        .andWhere(`${CONSULTING_HIERARCHICAL}.id != :id`, {id: consulting.id})
        .andWhere(`${CONSULTING_HIERARCHICAL}.groupParent IS NULL`)
        .andWhere(`${this.alias}.menu IN (:menuIds)`, {menuIds: search.menuIds});
    }

    query = query.orderBy(`${CONSULTING_HIERARCHICAL}.groupId`, 'ASC')
      .addOrderBy(`${CONSULTING_HIERARCHICAL}.groupOrd`, 'DESC')
    return query;
  }

  public aroundNextQuery(
    consulting: Consulting, search: SearchAroundConsultingDto, nextBranch: number
  ): SelectQueryBuilder<Consulting> {
    const {groupId, groupOrd} = consulting.hierarchical;

    let query = this.createQueryBuilder(this.alias)
      .leftJoinAndSelect(`${CONSULTINGS}.hierarchical`, `${CONSULTING_HIERARCHICAL}`)

    if(search.type === 'all') {
      if(nextBranch > 0) {
        query = query.andWhere(`${CONSULTING_HIERARCHICAL}.groupId = :groupId`, {groupId})
          .andWhere(`${CONSULTING_HIERARCHICAL}.groupOrd > :groupOrd`, {groupOrd})
          .andWhere(`${this.alias}.menu IN (:menuIds)`, {menuIds: search.menuIds});
      } else {
        query = query.andWhere(`${CONSULTING_HIERARCHICAL}.groupId < :groupId`, {groupId})
          .andWhere(`${this.alias}.menu IN (:menuIds)`, {menuIds: search.menuIds});
      }
    } else {
      query = query.andWhere(`${CONSULTING_HIERARCHICAL}.groupId < :groupId`, {groupId})
        .andWhere(`${CONSULTING_HIERARCHICAL}.id != :id`, {id: consulting.id})
        .andWhere(`${CONSULTING_HIERARCHICAL}.groupParent IS NULL`)
        .andWhere(`${this.alias}.menu IN (:menuIds)`, {menuIds: search.menuIds});
    }
    
    query = query.orderBy(`${CONSULTING_HIERARCHICAL}.groupId`, 'DESC')
      .addOrderBy(`${CONSULTING_HIERARCHICAL}.groupOrd`, 'ASC')

    return query;
  }

  save<T extends DeepPartial<Consulting>>(entities: T[], options: SaveOptions & { reload: false; }): Promise<T[]>;
  save<T extends DeepPartial<Consulting>>(entities: T[], options?: SaveOptions): Promise<(T & Consulting)[]>;
  save<T extends DeepPartial<Consulting>>(entity: T, options: SaveOptions & { reload: false; }): Promise<T>;
  save<T extends DeepPartial<Consulting>>(entity: T, options?: SaveOptions): Promise<T & Consulting>;
  async save<T extends DeepPartial<Consulting>>(entityOrEntities: T | T[], options?: any): Promise<T|T[]> {
    const entities: Array<T> = Array.isArray(entityOrEntities) ? entityOrEntities : [entityOrEntities];
    const ids = entities.filter(({id}) => id).map(({id}) => id);
    const originEntities = await this.getMany(
      ['menu', 'attachments'],
      ctx => ctx.searchQuery()
        .where(`${ctx.alias}.id IN (:ids)`, {ids: ids.length > 0 ? ids : ['NULL']})
    );

    return super.save(entityOrEntities as any, options)
      .then(async rst => {
        const insertOrUpdateAttachments = entities.filter(({attachments}) => attachments && attachments.length > 0)
          .filter(({id, attachments}) => {
            if(!id) {
              return true;
            } else {
              return !equals(originEntities.find(({id: orgId}) => orgId === id), attachments)
            }
          });

        const updateMenus = originEntities.reduce((result, {id, menu}) => {
          const find = entities.find(({id: entityId}) => entityId === id);
          if(find && find.menu && find.menu.id !== menu.id) {
            result.push({...find})
          }
          return result;
        }, []);

        const promises: Array<Promise<any>> = [];
        // if(insertOrUpdateAttachments.length > 0) {
        //   const cstAndAttcRepo = this.manager.getRepository(ConsultingAttachment);
        //   promises.push(
        //     sortAttachment({consultingAttachment: cstAndAttcRepo}, insertOrUpdateAttachments)
        //   )
        // }
        if(updateMenus.length > 0) {
          await this.setProperty(['hierarchical'], updateMenus);
          updateMenus.forEach(menuUpdate => {
            promises.push(
              syncGroupMenu(this.manager, menuUpdate as unknown as Consulting)
            )
          })
        }

        await Promise.all(promises);
        return rst as any;
      })
  }
}

const syncGroupMenu = async (
  entityManager: EntityManager,
  updateEntity: Consulting,
): Promise<Array<ConsultingDto>> => {
  if(!updateEntity?.menu) {
    return;
  }

  const repos = getRepositories({
    consultingComm: Consulting,
    consulting: ConsultingRepository
  }, entityManager);

  return repos.consultingComm.save(
    await repos.consulting.findGroup(updateEntity)
      .then(rst => rst.filter(({id}) => id !== updateEntity.id))
      .then(rst => rst.map(({id}) => ({id, menu: updateEntity.menu})))
  )
}

// const sortAttachment = async (
//   repos: {consultingAttachment: Repository<ConsultingAttachment>},
//   insertOrUpdateAttachments: Array<DeepPartial<Consulting>>
// ): Promise<Array<ConsultingAttachment>> => {
//   const allCstAtcs = await repos.consultingAttachment
//     .createQueryBuilder(CONSULTING_ATTACHMENTS)
//     .where(`${CONSULTING_ATTACHMENTS}.consulting.id IN (:ids)`, {ids: insertOrUpdateAttachments.map(({id}) => id)})
//     .getMany();

//   const updateEntities = insertOrUpdateAttachments.reduce((result, {id, attachments}) => {
//     allCstAtcs.filter(({consultingId}) => consultingId === id)
//       .sort(
//         ({attachmentId: aId}, {attachmentId: bId}) =>
//           attachments.findIndex(({id: attcId}) => aId === attcId) - attachments.findIndex(({id: attcId}) => bId === attcId)
//       ).forEach(({id: cstAtcId}, i) =>
//         result.push({id: cstAtcId, ord: i+1})
//       );

//       return result;
//   }, [] as Array<Partial<ConsultingAttachment>>)
//   return repos.consultingAttachment.save(updateEntities);
// }