import { Replace } from "src/type/index.type";
import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from "typeorm";
import { Reply, ReplyRes } from "../reply/reply.entity";
import { Consulting, ConsultingRes } from "./consulting.entity";

@Entity({ name: 'consulting_relations' })
export class ConsultingRelation {
  @PrimaryColumn({
    name: 'consulting_id',
    type: 'bigint'
  })
  id: number;

  @ManyToOne(() => Consulting , entity => entity.relation)
  @JoinColumn({
    name: 'consulting_id',
    referencedColumnName: 'id'
  })
  self: Consulting;

  @Column({name: 'reportConsulting_id'})
  consultingId: number;

  @ManyToOne( () => Consulting)
  @JoinColumn({ name: 'reportConsulting_id' })
  consulting?: Consulting;

  @Column({name: 'reportReply_id'})
  replyId: number;

  @ManyToOne( () => Reply)
  @JoinColumn({ name: 'reportReply_id' })
  reply?: Reply;

  @Column({name: 'reportReview_id'})
  reviewId: number;

 
}

export type ConsultingRelationDto = Partial<ConsultingRelation>;

export class ConsultingRelationRes {
  consulting?: ConsultingRes;
  reply?: ReplyRes;
  constructor({
    consulting, reply, 
  }: ConsultingRelation) {
    if(consulting) {
      this.consulting = new ConsultingRes(consulting);
    }
    if(reply) {
      this.reply = new ReplyRes(reply);
    }
   
 
  }
}

export type ConsultingRelationReq = Partial<
  Replace<ConsultingRelationRes, {
    consulting: string;
    reply: string;
    review: string;
  }>
>;