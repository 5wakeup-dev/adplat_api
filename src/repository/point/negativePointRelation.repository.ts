import { TABLE_ALIAS } from "src/config/typeorm.config";
import { ChainRelation, ChainRepository, PathString, SaveSubscriber, SetPropertyEvent } from "src/util/typeorm.util";
import { EntityRepository, SelectQueryBuilder } from "typeorm";
import { NegativePointRelation } from "src/entity/point/negativePointRelation.entity";


const {
  NEGATIVE_POINT_RELATION
} = TABLE_ALIAS;

@EntityRepository(NegativePointRelation)
export class NegativePointRelationRepository extends ChainRepository<NegativePointRelation> {
  public readonly primaryKeys: Array<keyof NegativePointRelation> = ['id'];
  public readonly alias: string = NEGATIVE_POINT_RELATION;
  public readonly relationChain: ChainRelation<NegativePointRelation> = {

  }

  public readonly setPropertySubscriber: Array<SetPropertyEvent<NegativePointRelation, PathString<NegativePointRelation>>>

  public readonly saveSubscribe: SaveSubscriber<NegativePointRelation, PathString<NegativePointRelation>>

  public searchQuery(): SelectQueryBuilder<NegativePointRelation> {
    return this.createQueryBuilder(this.alias);
  }
}