import { Injectable } from "@nestjs/common";
import { Artwork } from "src/entity/artwork/artwork.entity";
import { Consulting } from "src/entity/consulting/consulting.entity";
import { Reply } from "src/entity/reply/reply.entity";
import { ReplyHierarchical } from "src/entity/reply/replyHierarchical.entity";
import { ArtworkRepository } from "src/repository/artwork/artwork.repository";
import { ConsultingRepository } from "src/repository/consulting/consulting.repository";
import { ReplyRepository } from "src/repository/reply/reply.repository";
import { aesDec, aesEnc } from "src/util/secret.util";
import { getRepositories } from "src/util/typeorm.util";
import { Connection, EntityManager, EntitySubscriberInterface, EventSubscriber, InsertEvent, LoadEvent, ObjectLiteral } from "typeorm";

const ENCRYT_KEYS: Array<string> = ['password']

@Injectable()
@EventSubscriber()
export class ReplySubscriber implements EntitySubscriberInterface<Reply>{
  constructor(connection: Connection){
    connection.subscribers.push(this);
  }

  listenTo(): any {
    return Reply;
  }

  async setReplyCount(entity: Reply | ObjectLiteral, manager: EntityManager) {
    const repos = getRepositories({
      reply: ReplyRepository,
      artwork: ArtworkRepository,
      consulting: ConsultingRepository,
      rawArtwork: Artwork,
      rawConsulting: Consulting,
    }, manager);

    if(entity.artwork) {
      const awkRplCount = await repos.reply
        .searchQuery({artworkUk: entity.artwork.uk})
        .getCount();
      await repos.rawArtwork.save({id: entity.artwork.id, reply: awkRplCount});
    }

    if(entity.consulting) {
      const cstRplCount = await repos.reply
        .searchQuery({consultingUk: entity.consulting.uk})
        .getCount();
      await repos.rawConsulting.save({id: entity.consulting.id, reply: cstRplCount});
    }

  }

  beforeInsert(event: InsertEvent<Reply>):Promise<any> | void {
    const {entity} = event;

    Object.keys(entity)
      .filter(k => entity[k] && ENCRYT_KEYS.includes(k))
      .forEach(k => entity[k] = aesEnc(entity[k]));
  }

  afterLoad(entity: Reply, _event: LoadEvent<Reply>): Promise<any> | void {
    Object.keys(entity)
    .filter(k => entity[k] && ENCRYT_KEYS.includes(k))
    .forEach(k => entity[k] = aesDec(entity[k]));
  }

  async afterInsert(event: InsertEvent<Reply>): Promise<any> {
    const {entity, manager} = event;
    await this.setReplyCount(entity, manager);
  }
}

@Injectable()
@EventSubscriber()
export class ReplyHierarchicalSubscriber implements EntitySubscriberInterface<ReplyHierarchical> {
  constructor(connection: Connection) {
    connection.subscribers.push(this);
  }

  listenTo(): any {
    return ReplyHierarchical;
  }

  async setReplyCount(entity: ReplyHierarchical, manager: EntityManager) {
    const repos = getRepositories({
      hierarchical: ReplyHierarchical,
      reply: ReplyRepository
    }, manager);

    // 바로 1 depth 밑에 하위 댓글만 개수 카운팅. 추후 기획에 따라 수정 필요.
    if(entity.groupParent) {
      const rplCount = await repos.reply
        .searchQuery({parent: entity.groupParent})
        .getCount();
      await repos.reply.save({id: entity.groupParent, repliesCount: rplCount});
    }
  }

  async afterInsert(event: InsertEvent<ReplyHierarchical>): Promise<any> {
    const {entity, manager} = event;
    await this.setReplyCount(entity, manager);
  }
}