import { TABLE_ALIAS } from "src/config/typeorm.config";
import { Attachment } from "src/entity/comm/attachment.entity";
import { ChainRelation, ChainRepository, PathString, SaveSubscriber, SetPropertyEvent } from "src/util/typeorm.util";
import { EntityRepository, SelectQueryBuilder } from "typeorm";
const{
  ATTACHMENTS
} = TABLE_ALIAS;

@EntityRepository(Attachment)
export class AttachmentRepository extends ChainRepository<Attachment> {
  public readonly primaryKeys: Array<keyof Attachment> = ['id'];
  public readonly alias: string = ATTACHMENTS;
  public readonly relationChain: ChainRelation<Attachment> = {}
  public readonly setPropertySubscriber: Array<SetPropertyEvent<Attachment, PathString<Attachment>>>;
  public readonly saveSubscribe: SaveSubscriber<Attachment, PathString<Attachment>>;

  public searchQuery(): SelectQueryBuilder<Attachment> {
    return this.createQueryBuilder(this.alias);
  }

}