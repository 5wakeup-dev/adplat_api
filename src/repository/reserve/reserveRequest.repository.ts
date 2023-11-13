import { TABLE_ALIAS } from "src/config/typeorm.config";

import { ChainRelation, ChainRepository, PathString, SaveSubscriber, SetPropertyEvent } from "src/util/typeorm.util";
import { EntityRepository, SelectQueryBuilder } from "typeorm";

import { ReserveRequest, SearchReserveDto } from "src/entity/reserve/reserveRequest.entity";


const {
RESERVE_REQUEST
} = TABLE_ALIAS;

@EntityRepository(ReserveRequest)
export class ReserveRequestRepository extends ChainRepository<ReserveRequest> {
  public readonly primaryKeys: Array<keyof ReserveRequest> = ['id'];
  public readonly alias: string = RESERVE_REQUEST;
  public readonly relationChain: ChainRelation<ReserveRequest> = {
   

  }

  public readonly setPropertySubscriber: Array<SetPropertyEvent<ReserveRequest, PathString<ReserveRequest>>>

  public readonly saveSubscribe: SaveSubscriber<ReserveRequest, PathString<ReserveRequest>> 

  public searchQuery({id,name,state,tel,uk,email
  }: SearchReserveDto = {}): SelectQueryBuilder<ReserveRequest> {
    let query = this.createQueryBuilder(this.alias);

    if(id){
      query = query.andWhere(`${this.alias}.id = :id`, {id});
    }

    if(uk){
      query = query.andWhere(`${this.alias}.uk = :uk`, {uk});
    }

    if(name){
      query = query.andWhere(`${this.alias}.name like :name`, {name:`%${name}%`});
    }

    if(email){
      query = query.andWhere(`${this.alias}.email like :email`, {email:`%${email}%`});
    }
    if(tel){
      query = query.andWhere(`${this.alias}.tel = :tel`, {tel});
    }

    if(state){
      query = query.andWhere(`${this.alias}.state = :state`, {state});

    }
    query=query.orderBy(`${this.alias}.id`,"DESC")

    return query;
  }
}