import { TABLE_ALIAS } from "src/config/typeorm.config";
import { Attachment } from "src/entity/comm/attachment.entity";
import { Manager } from "src/entity/member/manager.entity";
import { Store } from "src/entity/member/store.entity";
import { DEFAULT_ROLE } from "src/entity/role/role.interface";
import { isContainRoles, isSameAuth } from "src/util/entity.util";
import { UNKNOWN } from "src/util/format.util";
import { getReflectProperty } from "src/util/reflect.util";
import { ChainRelation, ChainRepository, PathString, SaveSubscriber, SetPropertyEvent } from "src/util/typeorm.util";
import { EntityRepository, SelectQueryBuilder } from "typeorm";
import { AttachmentRepository } from "../comm/attachment.repository";
import { StoreMemo } from "src/entity/member/storeMemo.entity";
import { StoreMemoRepository } from "./storeMemo.repository";


const VISIBLE_PREFIX = 'visible';

const {STORE_MEMO,
  MANAGER_STORES
} = TABLE_ALIAS;

@EntityRepository(Store)
export class StoreRepository extends ChainRepository<Store> {
  public primaryKeys: Array<keyof Store> = ['id'];
  public alias: string = MANAGER_STORES;
  public relationChain: ChainRelation<Store> = {
    attachment: {
      Entity: Attachment, Repository: AttachmentRepository,
      getBridges: ({ selfEntities }) => 
        this.searchQuery()
        .select(`${this.alias}.id AS self`)
        .addSelect(`${this.alias}.attachment as inverse`) 
        .where(`${this.alias}.id IN (:ids)`, {ids: selfEntities.map( ({id}) => id)})
        .getRawMany()
        .then( result => result.map( ({self, inverse}) => ({ self: {id: self}, inverse: {id: inverse}})))
    },
    storeMemo: {
      Entity: StoreMemo, Repository: StoreMemoRepository,
      fieldIsMany: true,
      getBridges: ({entityManager: em, selfEntities}) =>
        em.getCustomRepository(StoreMemoRepository)
          .searchQuery()
          .select(`${STORE_MEMO}.store AS self`)
          .addSelect(`${STORE_MEMO}.id AS inverse`)
          .where(`${STORE_MEMO}.store IN (:ids)`, {ids: selfEntities.map(({id}) => id)})
          .getRawMany()
          .then(result => result.map(({self, inverse}) => ({self: {id: self}, inverse: {id: inverse}})))
    },
  }

  public readonly setPropertySubscriber: Array<SetPropertyEvent<Store, PathString<Store>>> = [
    {
      where: ({data}) => data.auth !== undefined,
      after: ({entities, data}) => {
        const { auth } = data||{};
        const isRoot = isContainRoles(auth, ['root'] as Array<DEFAULT_ROLE>);
        entities.forEach( entity => {
          const manager = getReflectProperty(entity, 'manager');
          const isOwner = isSameAuth(manager as Manager, auth);
          if( isRoot || isOwner )
            return
            
          const visibleKeys = Object.keys(entity).filter( k => k.indexOf(VISIBLE_PREFIX) > -1 )
          visibleKeys.forEach( k => {
            const visible: boolean = entity[k];
            const targetKey = k.replace(VISIBLE_PREFIX, '')
            .replace(/.{1}/, target => target.toLowerCase());

            const targetVal = entity[targetKey];
            if( !visible && targetVal )
              entity[targetKey] = UNKNOWN;
            

          })
        })
      }
    }
  ];

  public readonly saveSubscribe: SaveSubscriber<Store, PathString<Store>>;

  public searchQuery( ): SelectQueryBuilder<Store>{
    return this.createQueryBuilder(this.alias);
  }
}