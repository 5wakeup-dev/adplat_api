import { TABLE_ALIAS } from "src/config/typeorm.config";
import { ChainRelation, ChainRepository, PathString, SaveSubscriber, SetPropertyEvent } from "src/util/typeorm.util";
import { EntityRepository, SelectQueryBuilder } from "typeorm";
import { MailHistory, SearchMailDto } from "src/entity/mail/mailHistory.entity";

const { MAIL } = TABLE_ALIAS;
@EntityRepository(MailHistory)
export class MailRepository extends ChainRepository<MailHistory> {
  public readonly primaryKeys: Array<keyof MailHistory> = ['id'];
  public readonly alias: string = MAIL;
  public readonly relationChain: ChainRelation<MailHistory> 
  public readonly setPropertySubscriber: Array<SetPropertyEvent<MailHistory, PathString<MailHistory>>>;
  // public readonly saveSubscribe: SaveSubscriber<Bill, PathString<Bill>>;

  public readonly saveSubscribe: SaveSubscriber<MailHistory, PathString<MailHistory>>
  public searchQuery({
    id,ids,sender,address,receiver
  }: SearchMailDto = {}): SelectQueryBuilder<MailHistory> {
    let query = this.createQueryBuilder(this.alias);


    if (id) {
      query = query.andWhere(`${this.alias}.id = :id`, { id });
    }


    if (ids?.length > 0) {
      query = query.andWhere(`${this.alias}.id IN (:ids)`, { ids });
    }

    if(receiver){
      query = query.andWhere(`${this.alias}.receiver like :receiver`, {receiver:`%${receiver}%` });
    }
    if (sender) {
      query = query.andWhere(`${this.alias}.senderType = :sender`, { sender });
    }

    if (address) {
      query = query.andWhere(`${this.alias}.address = :address`, { address });
    }

    return query;
  }
}