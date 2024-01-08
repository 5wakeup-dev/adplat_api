import { TABLE_ALIAS } from "src/config/typeorm.config";
import { Manager } from "src/entity/member/manager.entity";
import { User } from "src/entity/member/user.entity";
import { NegativeHistory } from "src/entity/point/negativeHistory.entity";
import { NegativePoint } from "src/entity/point/negativePoint.entity";
import { PositivePoint } from "src/entity/point/positivePoint.entity";

import { ChainRelation, ChainRepository, PathString, SaveSubscriber, SetPropertyEvent } from "src/util/typeorm.util";
import { EntityRepository, SelectQueryBuilder } from "typeorm";
import { NegativePointRepository } from "./negativePoint.repository";
import { PositivePointRepository } from "./positivePoint.repository";


const {
  NEGATIVE_POINT_HISTORIES,
} = TABLE_ALIAS;

@EntityRepository(NegativeHistory)
export class NegativeHistoryRepository extends ChainRepository<NegativeHistory> {
  public primaryKeys: Array<keyof NegativeHistory> = ['id'];
  public alias: string = NEGATIVE_POINT_HISTORIES;
  public relationChain: ChainRelation<NegativeHistory> = {
    negativePoint: {
      Entity: NegativePoint, Repository: NegativePointRepository,
      getBridges: ({ selfEntities }) =>
        this.searchQuery()
          .select(`${this.alias}.id AS self`)
          .addSelect(`${this.alias}.negativePoint AS inverse`)
          .where(`${this.alias}.id IN (:ids)`, { ids: selfEntities.map(({ id }) => id) })
          .getRawMany()
          .then(result => result.map(({ self, inverse }) => ({ self: { id: self }, inverse: { id: inverse } })))
    },
    positivePoint: {
      Entity: PositivePoint, Repository: PositivePointRepository,
      getBridges: ({ selfEntities }) =>
        this.searchQuery()
          .select(`${this.alias}.id AS self`)
          .addSelect(`${this.alias}.positivePoint AS inverse`)
          .where(`${this.alias}.id IN (:ids)`, { ids: selfEntities.map(({ id }) => id) })
          .getRawMany()
          .then(result => result.map(({ self, inverse }) => ({ self: { id: self }, inverse: { id: inverse } })))
    }
  }


  public readonly setPropertySubscriber: Array<SetPropertyEvent<NegativeHistory, PathString<NegativeHistory>>>

  public readonly saveSubscribe: SaveSubscriber<NegativeHistory, PathString<NegativeHistory>>

  public searchQuery(_: any = {}): SelectQueryBuilder<NegativeHistory> {
    // if( !searchDto )
    //   return this.createQueryBuilder(this.alias);
    let query = this.createQueryBuilder(this.alias);

    return query;

  }
}