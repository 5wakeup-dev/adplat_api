import { TABLE_ALIAS } from "src/config/typeorm.config";
import { ChainRelation, ChainRepository, PathString, SaveSubscriber, SetPropertyEvent } from "src/util/typeorm.util";
import { EntityRepository, SelectQueryBuilder } from "typeorm";
import { PositivePointRelation } from "src/entity/point/positivePointRelation.entity";
import { Consulting } from "src/entity/consulting/consulting.entity";
import { ConsultingRepository } from "../consulting/consulting.repository";


const {
  POSITIVE_POINT_RELATION
} = TABLE_ALIAS;

@EntityRepository(PositivePointRelation)
export class PositivePointRelationRepository extends ChainRepository<PositivePointRelation> {
  public readonly primaryKeys: Array<keyof PositivePointRelation> = ['id'];
  public readonly alias: string = POSITIVE_POINT_RELATION;
  public readonly relationChain: ChainRelation<PositivePointRelation> = {
    consulting: {
      Entity: Consulting, Repository: ConsultingRepository,
      getBridges: ({ selfEntities }) =>
        this.searchQuery()
          .select(`${this.alias}.id AS self`)
          .addSelect(`${this.alias}.consulting AS inverse`)
          .where(`${this.alias}.id IN (:ids)`, { ids: selfEntities.map(({ id }) => id) })
          .getRawMany()
          .then(result => result.map(({ self, inverse }) => ({ self: { id: self }, inverse: { id: inverse } })))
    },
  }

  public readonly setPropertySubscriber: Array<SetPropertyEvent<PositivePointRelation, PathString<PositivePointRelation>>>

  public readonly saveSubscribe: SaveSubscriber<PositivePointRelation, PathString<PositivePointRelation>>

  public searchQuery(): SelectQueryBuilder<PositivePointRelation> {
    return this.createQueryBuilder(this.alias);
  }
}