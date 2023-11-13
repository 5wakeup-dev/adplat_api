import { TABLE_ALIAS } from "src/config/typeorm.config";
import { Manager } from "src/entity/member/manager.entity";
import { MemberDeviceToken, SearchDeviceTokenDto } from "src/entity/member/memberDeviceToken.entity";
import { User } from "src/entity/member/user.entity";
import { ChainRelation, ChainRepository, PathString, SaveSubscriber, SetPropertyEvent } from "src/util/typeorm.util";
import { EntityRepository, SelectQueryBuilder } from "typeorm";
import { ManagerRepository } from "./manager.repository";
import { UserRepository } from "./user.repository";

const {
  DEVICE_TOKEN,
  MANAGERS, USERS
} = TABLE_ALIAS;

@EntityRepository(MemberDeviceToken)
export class MemberDeviceTokenRepository extends ChainRepository<MemberDeviceToken> {
  public primaryKeys: Array<keyof MemberDeviceToken> = ['id'];
  public alias: string = DEVICE_TOKEN;
  public relationChain: ChainRelation<MemberDeviceToken> = {
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
    }
  }

  public readonly setPropertySubscriber: Array<SetPropertyEvent<MemberDeviceToken, PathString<MemberDeviceToken>>>;

  public readonly saveSubscribe: SaveSubscriber<MemberDeviceToken, PathString<MemberDeviceToken>>;

  public searchQuery({
    memberUk, device, token
  }: SearchDeviceTokenDto = {}): SelectQueryBuilder<MemberDeviceToken>{
    let query = this.createQueryBuilder(this.alias);

    if(memberUk) {
      query = query.leftJoin(`${this.alias}.manager`, `SRC_${MANAGERS}`)
        .leftJoin(`${this.alias}.user`, `SRC_${USERS}`)
        .andWhere(`(SRC_${MANAGERS}.uk = :managerUk OR SRC_${USERS}.uk = :userUk)`, {managerUk: memberUk, userUk: memberUk});
    }

    if(device) {
      query = query.andWhere(`${this.alias}.device = :device`, {device});
    }

    if(token) {
      query = query.andWhere(`${this.alias}.token = :token`, {token});
    }

    return query;
  }
}