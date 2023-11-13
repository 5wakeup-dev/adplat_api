import { TABLE_ALIAS } from "src/config/typeorm.config";
import { BlockMember } from "src/entity/blockMember/blockMember.entity";
import { Manager } from "src/entity/member/manager.entity";
import { User } from "src/entity/member/user.entity";
import { ChainRelation, ChainRepository, PathString, SaveSubscriber, SetPropertyEvent } from "src/util/typeorm.util";
import { EntityRepository, SelectQueryBuilder } from "typeorm";
import { ManagerRepository } from "../member/manager.repository";
import { UserRepository } from "../member/user.repository";

const {
  BLOCK_MEMBERS
} = TABLE_ALIAS;

@EntityRepository(BlockMember)
export class BlockMemberRepository extends ChainRepository<BlockMember> {
  public readonly primaryKeys: Array<keyof BlockMember> = ['id'];
  public readonly alias: string = BLOCK_MEMBERS;
  public readonly relationChain: ChainRelation<BlockMember> = {
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
    blockManager: {
      Entity: Manager, Repository: ManagerRepository,
      getBridges: ({selfEntities}) =>
        this.searchQuery()
          .select(`${this.alias}.id AS self`)
          .addSelect(`${this.alias}.blockManager AS inverse`)
          .where(`${this.alias}.id IN (:ids)`, {ids: selfEntities.map(({id}) => id)})
          .getRawMany()
          .then(result => result.map(({self, inverse}) => ({self: {id: self}, inverse: {id: inverse}})))
    },
    blockUser: {
      Entity: User, Repository: UserRepository,
      getBridges: ({selfEntities}) =>
        this.searchQuery()
          .select(`${this.alias}.id AS self`)
          .addSelect(`${this.alias}.blockUser AS inverse`)
          .where(`${this.alias}.id IN (:ids)`, {ids: selfEntities.map(({id}) => id)})
          .getRawMany()
          .then(result => result.map(({self, inverse}) => ({self: {id: self}, inverse: {id: inverse}})))
    },
  }

  public readonly setPropertySubscriber: Array<SetPropertyEvent<BlockMember, PathString<BlockMember>>>;

  public readonly saveSubscribe: SaveSubscriber<BlockMember, PathString<BlockMember>>;

  public searchQuery(searchDto?: any): SelectQueryBuilder<BlockMember> {
    return this.createQueryBuilder(this.alias);
  }
}