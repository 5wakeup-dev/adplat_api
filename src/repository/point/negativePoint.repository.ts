import { TABLE_ALIAS } from "src/config/typeorm.config";
import { Manager } from "src/entity/member/manager.entity";
import { User } from "src/entity/member/user.entity";
import { NegativeHistory } from "src/entity/point/negativeHistory.entity";
import { NegativePoint } from "src/entity/point/negativePoint.entity";
import { SearchNegativePoint } from "src/entity/point/point.interface";
import { ChainRelation, ChainRepository, PathString, SaveSubscriber, SetPropertyEvent } from "src/util/typeorm.util";
import { EntityRepository, SelectQueryBuilder } from "typeorm";
import { UserRepository } from "../member/user.repository";
import { ManagerRepository } from "../member/manager.repository";
import { NegativePointRelation } from "src/entity/point/negativePointRelation.entity";
import { NegativePointRelationRepository } from "./negativePointRelation.repository";
import { NegativeHistoryRepository } from "./negativeHistory.repository";


const {
  NEGATIVE_POINTS,
  NEGATIVE_POINT_HISTORIES,
  USERS, MANAGERS
} = TABLE_ALIAS;

@EntityRepository(NegativePoint)
export class NegativePointRepository extends ChainRepository<NegativePoint> {
  public primaryKeys: Array<keyof NegativePoint> = ['id'];
  public alias: string = NEGATIVE_POINTS;
  public relationChain: ChainRelation<NegativePoint> = {
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
    negativeHistories: {
      Entity: NegativePoint, Repository: NegativeHistoryRepository,
      fieldIsMany: true,
      getBridges: ({ entityManager: em, selfEntities }) =>
        em.getRepository(NegativeHistory)
          .createQueryBuilder(NEGATIVE_POINT_HISTORIES)
          .select(`${NEGATIVE_POINT_HISTORIES}.negativePoint AS self`)
          .addSelect(`${NEGATIVE_POINT_HISTORIES}.id AS inverse`)
          .where(`${NEGATIVE_POINT_HISTORIES}.negativePoint IN (:ids)`, { ids: selfEntities.map(({ id }) => id) })
          .getRawMany()
          .then(rst => rst.map(({ self, inverse }) => ({ self: { id: self }, inverse: { id: inverse } })))
    },
    relation: {
      Entity: NegativePointRelation, Repository: NegativePointRelationRepository,
      getBridges: ({ selfEntities }) =>
        this.searchQuery()
          .select(`${this.alias}.id AS self`)
          .addSelect(`${this.alias}.negativePoint AS inverse`)
          .where(`${this.alias}.id IN (:ids)`, { ids: selfEntities.map(({ id }) => id) })
          .getRawMany()
          .then(result => result.map(({ self, inverse }) => ({ self: { id: self }, inverse: { id: inverse } })))
    },
  }


  public readonly setPropertySubscriber: Array<SetPropertyEvent<NegativePoint, PathString<NegativePoint>>>

  public readonly saveSubscribe: SaveSubscriber<NegativePoint, PathString<NegativePoint>>

  public searchQuery(searchDto: SearchNegativePoint = {}): SelectQueryBuilder<NegativePoint> {
    // if( !searchDto )
    //   return this.createQueryBuilder(this.alias);
    let query = this.createQueryBuilder(this.alias);

    const {
      ids, 
      memberUk, title
    } = searchDto;

    if( ids )
      query = query.andWhere(`${this.alias}.id IN (:ids)`, {ids: ids.length === 0 ? [0] : ids})

    if( memberUk )
      query = query.leftJoin(`${this.alias}.user`, `SRC_${USERS}`)
        .leftJoin(`${this.alias}.manager`, `SRC_${MANAGERS}`)
        .andWhere(`SRC_${USERS}.uk = :memberUk OR SRC_${MANAGERS}.uk = :memberUk`, {memberUk})

    if( title )
      query = query.andWhere(`${this.alias}.title LIKE :title`, {title: `%${title}%`})

    return query;

  }
}