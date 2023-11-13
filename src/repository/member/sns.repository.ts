import { TABLE_ALIAS } from "src/config/typeorm.config";
import { Manager } from "src/entity/member/manager.entity";
import { MemberSns } from "src/entity/member/memberSns.entity";
import { User } from "src/entity/member/user.entity";
import { ChainRelation, ChainRepository, PathString, SaveSubscriber, SetPropertyEvent } from "src/util/typeorm.util";
import { EntityRepository, SelectQueryBuilder } from "typeorm";
import { ManagerRepository } from "./manager.repository";
import { UserRepository } from "./user.repository";

const {
  MEMBER_SNS
} = TABLE_ALIAS;
@EntityRepository(MemberSns)
export class MemberSnsRepository extends ChainRepository<MemberSns> {
  public primaryKeys: Array<keyof MemberSns> = ['id'];
  public alias: string = MEMBER_SNS;
  public relationChain: ChainRelation<MemberSns> = {
    user: {
      Entity: User, Repository: UserRepository,
      getBridges: ({selfEntities}) => 
        this.searchQuery()
        .select(`${this.alias}.id AS self`)
        .addSelect(`${this.alias}.user AS inverse`)
        .where(`${this.alias}.id IN (:ids)`, {ids: selfEntities.map( ({id}) => id)})
        .getRawMany()
        .then( result => 
          result.map( ({self, inverse}) => ({self: {id: self}, inverse: {id: inverse}}))
        )
    },
    manager: {
      Entity: Manager, Repository: ManagerRepository,
      getBridges: ({selfEntities}) => 
        this.searchQuery()
        .select(`${this.alias}.id AS self`)
        .addSelect(`${this.alias}.manager AS inverse`)
        .where(`${this.alias}.id IN (:ids)`, {ids: selfEntities.map( ({id}) => id)})
        .getRawMany()
        .then( result => 
          result.map( ({self, inverse}) => ({self: {id: self}, inverse: {id: inverse}}))
        )
    }

  }

  public readonly setPropertySubscriber: Array<SetPropertyEvent<MemberSns, PathString<MemberSns>>>;

  public readonly saveSubscribe: SaveSubscriber<MemberSns, PathString<MemberSns>>;

  public searchQuery( ): SelectQueryBuilder<MemberSns>{
    return this.createQueryBuilder(this.alias);
  }
}