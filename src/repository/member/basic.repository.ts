import { TABLE_ALIAS } from "src/config/typeorm.config";
import { Attachment } from "src/entity/comm/attachment.entity";
import { MemberBasic } from "src/entity/member/memberBasic.entity";
import { ChainRelation, ChainRepository, PathString, SaveSubscriber, SetPropertyEvent } from "src/util/typeorm.util";
import { EntityRepository, SelectQueryBuilder } from "typeorm";
import { AttachmentRepository } from "../comm/attachment.repository";

const {
  MEMBER_BASICS,
} = TABLE_ALIAS;

@EntityRepository(MemberBasic)
export class MemberBasicRepository extends ChainRepository<MemberBasic> {
  public primaryKeys: Array<keyof MemberBasic> = ['id'];
  public alias: string = MEMBER_BASICS;
  public relationChain: ChainRelation<MemberBasic> = {
    attachmentProfile: {
      Entity: Attachment, Repository: AttachmentRepository,
      getBridges: ({ selfEntities }) => 
        this.searchQuery()
        .select(`${this.alias}.id AS self`)
        .addSelect(`${this.alias}.attachmentProfile as inverse`) 
        .where(`${this.alias}.id IN (:ids)`, {ids: selfEntities.map( ({id}) => id)})
        .getRawMany()
        .then( result => result.map( ({self, inverse}) => ({ self: {id: self}, inverse: {id: inverse}})))
    }
  }

  public readonly setPropertySubscriber: Array<SetPropertyEvent<MemberBasic, PathString<MemberBasic>>>;

  public readonly saveSubscribe: SaveSubscriber<MemberBasic, PathString<MemberBasic>>;

  public searchQuery( ): SelectQueryBuilder<MemberBasic>{
    return this.createQueryBuilder(this.alias);
  }
}