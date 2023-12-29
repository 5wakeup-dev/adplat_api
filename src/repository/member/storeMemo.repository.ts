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
import { StoreRepository } from "./store.repository";
import { StoreMemo } from "src/entity/member/storeMemo.entity";

const VISIBLE_PREFIX = 'visible';

const {
  STORE_MEMO
} = TABLE_ALIAS;

@EntityRepository(StoreMemo)
export class StoreMemoRepository extends ChainRepository<StoreMemo> {
  public primaryKeys: Array<keyof StoreMemo> = ['id'];
  public alias: string = STORE_MEMO;
  public relationChain: ChainRelation<StoreMemo> = {
    
    store: {
      Entity:Store, Repository: StoreRepository,
      getBridges: ({selfEntities}) =>
        this.searchQuery()
        .select(`${this.alias}.id AS self`)
        .addSelect(`${this.alias}.store AS inverse`)
        .where(`${this.alias}.id IN (:ids)`, {ids: selfEntities.map(({id}) => id)})
        .getRawMany()
        .then(result => result.map(({self, inverse}) => ({self: {id: self}, inverse: {id: inverse}})))
    }
  }

  public readonly setPropertySubscriber: Array<SetPropertyEvent<StoreMemo, PathString<StoreMemo>>> 
  public readonly saveSubscribe: SaveSubscriber<StoreMemo, PathString<StoreMemo>>;

  public searchQuery( ): SelectQueryBuilder<StoreMemo>{
    return this.createQueryBuilder(this.alias);
  }
}