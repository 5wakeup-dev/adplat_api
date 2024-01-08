import { TABLE_ALIAS } from "src/config/typeorm.config";
import { Manager } from "src/entity/member/manager.entity";
import { User } from "src/entity/member/user.entity";
import { NegativeHistory } from "src/entity/point/negativeHistory.entity";
import { NegativePoint } from "src/entity/point/negativePoint.entity";
import { SearchPositivePoint } from "src/entity/point/point.interface";
import { PositivePoint } from "src/entity/point/positivePoint.entity";
import { BASIC_EXCEPTION } from "src/exception/basic.exception";
import { ChainRelation, ChainRepository, PathString, SaveSubscriber, SetPropertyEvent } from "src/util/typeorm.util";
import { EntityRepository, SelectQueryBuilder } from "typeorm";
import { UserRepository } from "../member/user.repository";
import { ManagerRepository } from "../member/manager.repository";
import { NegativePointRepository } from "./negativePoint.repository";
import { PositivePointRelationRepository } from "./positivePointRelation.repository";
import { PositivePointRelation } from "src/entity/point/positivePointRelation.entity";


const {
  POSITIVE_POINTS,
  NEGATIVE_POINT_HISTORIES,
  USERS, MANAGERS
} = TABLE_ALIAS;

@EntityRepository(PositivePoint)
export class PositivePointRepository extends ChainRepository<PositivePoint> {
  public primaryKeys: Array<keyof PositivePoint> = ['id'];
  public alias: string = POSITIVE_POINTS;
  public relationChain: ChainRelation<PositivePoint> = {
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
    histories: {
      Entity: NegativePoint, Repository: NegativePointRepository,
      fieldIsMany: true,
      getBridges: ({ entityManager: em, selfEntities }) =>
        em.getRepository(NegativeHistory)
          .createQueryBuilder(NEGATIVE_POINT_HISTORIES)
          .select(`${NEGATIVE_POINT_HISTORIES}.positivePoint AS self`)
          .addSelect(`${NEGATIVE_POINT_HISTORIES}.negativePoint AS inverse`)
          .where(`${NEGATIVE_POINT_HISTORIES}.positivePoint IN (:ids)`, { ids: selfEntities.map(({ id }) => id) })
          .getRawMany()
          .then(rst => rst.map(({ self, inverse }) => ({ self: { id: self }, inverse: { id: inverse } })))
    },
    relation: {
      Entity: PositivePointRelation, Repository: PositivePointRelationRepository,
      getBridges: ({ selfEntities }) =>
        this.searchQuery()
          .select(`${this.alias}.id AS self`)
          .addSelect(`${this.alias}.positivePoint AS inverse`)
          .where(`${this.alias}.id IN (:ids)`, { ids: selfEntities.map(({ id }) => id) })
          .getRawMany()
          .then(result => result.map(({ self, inverse }) => ({ self: { id: self }, inverse: { id: inverse } })))
    },
  }


  public readonly setPropertySubscriber: Array<SetPropertyEvent<PositivePoint, PathString<PositivePoint>>>

  public readonly saveSubscribe: SaveSubscriber<PositivePoint, PathString<PositivePoint>>

  public searchQuery(searchDto: SearchPositivePoint = {}): SelectQueryBuilder<PositivePoint> {
    // if( !searchDto )
    //   return this.createQueryBuilder(this.alias);

    let query = this.createQueryBuilder(this.alias);
    const {
      ids,
      memberUk, isRemaining, title
    } = searchDto;

    if (ids)
      query = query.andWhere(`${this.alias}.id IN (:ids)`, { ids: ids.length === 0 ? [0] : ids })

    if (memberUk)
      query = query.leftJoin(`${this.alias}.user`, `SRC_${USERS}`)
        .leftJoin(`${this.alias}.manager`, `SRC_${MANAGERS}`)
        .andWhere(`SRC_${USERS}.uk = :memberUk OR SRC_${MANAGERS}.uk = :memberUk`, { memberUk })

    if (isRemaining)
      query = query.andWhere(`${this.alias}.remaining > 0`)

    if (title)
      query = query.andWhere(`${this.alias}.title LIKE :title`, { title: `%${title}%` })

    return query;

  }

  getRemainingPoint(
    member: Manager | User
  ): Promise<Array<PositivePoint>> {
    if (!member || !member.type)
      throw BASIC_EXCEPTION.NOT_FOUND_AUTH;

    const { alias } = this;
    return this.createQueryBuilder(alias)
      .where(
        `${alias}.${member.type.toLowerCase()} = :memberId AND ${alias}.remaining > 0 AND (${alias}.expires IS NULL OR ${alias}.expires > NOW())`,
        { memberId: member.id }
      )
      .getMany();
  }
}