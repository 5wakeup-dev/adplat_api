import { TABLE_ALIAS } from "src/config/typeorm.config";
import { Artwork } from "src/entity/artwork/artwork.entity";
import { Attachment } from "src/entity/comm/attachment.entity";
import { Consulting } from "src/entity/consulting/consulting.entity";
import { Manager } from "src/entity/member/manager.entity";
import { User } from "src/entity/member/user.entity";
import { Reply } from "src/entity/reply/reply.entity";
import { SearchReplyDto } from "src/entity/reply/reply.interface";
import { ReplyHierarchical } from "src/entity/reply/replyHierarchical.entity";
import { splitToObject } from "src/util/index.util";
import { ChainRelation, ChainRepository, PathString, SaveSubscriber, SetPropertyEvent } from "src/util/typeorm.util";
import { EntityRepository, getMetadataArgsStorage, SelectQueryBuilder } from "typeorm";
import { ArtworkRepository } from "../artwork/artwork.repository";
import { AttachmentRepository } from "../comm/attachment.repository";
import { ConsultingRepository } from "../consulting/consulting.repository";
import { ManagerRepository } from "../member/manager.repository";
import { UserRepository } from "../member/user.repository";

const {
  REPLIES,
  REPLY_HIERARCHICAL,
  ARTWORKS, CONSULTINGS, INSTRUMENT_MARKET,
  MANAGERS, USERS
} = TABLE_ALIAS;

@EntityRepository(Reply)
export class ReplyRepository extends ChainRepository<Reply> {
  public readonly primaryKeys: Array<keyof Reply> = ['id'];
  public readonly alias: string = REPLIES;
  public readonly relationChain: ChainRelation<Reply> = {
    hierarchical: {
      Entity: ReplyHierarchical, 
      getBridges: async ({selfEntities}) => selfEntities.map( ({id}) => ({self: {id}, inverse: {id}})),
      getDatas: ({entityManager: em, selfEntities}) => 
        em.getRepository(ReplyHierarchical)
        .createQueryBuilder(REPLY_HIERARCHICAL)
        .where(`${REPLY_HIERARCHICAL}.id IN (:ids)`, {ids: selfEntities.map(({id}) => id)})
        .getMany()
    },
    manager: {
      Entity: Manager, Repository: ManagerRepository,
      getBridges: ({selfEntities}) => 
        this.searchQuery()
        .select(`${this.alias}.id AS self`)
        .addSelect(`${this.alias}.manager AS inverse`)
        .where(`${this.alias}.id IN (:ids)`, {ids: selfEntities.map( ({id}) => id)})
        .getRawMany()
        .then( result => result.map( ({self, inverse}) => ({self: {id: self}, inverse: {id: inverse}})))
    },
    user: {
      Entity: User, Repository: UserRepository,
      getBridges: ({selfEntities}) => 
        this.searchQuery()
        .select(`${this.alias}.id AS self`)
        .addSelect(`${this.alias}.user AS inverse`)
        .where(`${this.alias}.id IN (:ids)`, {ids: selfEntities.map( ({id}) => id)})
        .getRawMany()
        .then( result => result.map( ({self, inverse}) => ({self: {id: self}, inverse: {id: inverse}})))
    },
    attachments: {
      Entity: Attachment, Repository: AttachmentRepository,
      fieldIsMany: true,
      getBridges: ({ entityManager: em, selfEntities }) => {
        const {
          name: tableName,
          joinColumns, inverseJoinColumns
        } = getMetadataArgsStorage()
        .findJoinTable(Reply, 'artwork' as keyof Reply);
        const joinColumnName = joinColumns[0].name;
        const inverseJoinColumnName = inverseJoinColumns[0].name;
        return em.createQueryBuilder()
        .select(`RPL_ATC.${joinColumnName} AS self`)
        .addSelect(`RPL_ATC.${inverseJoinColumnName} AS inverse`)
        .from(tableName,'RPL_ATC')
        .where(`RPL_ATC.${joinColumnName} IN (:ids)`, {ids: selfEntities.map( ({id}) => id)})
        .orderBy(`RPL_ATC.${joinColumnName}`, 'DESC')
        .addOrderBy('RPL_ATC.ord', 'ASC')
        .getRawMany()
        .then( result => result.map( ({self, inverse}) => ({self: {id: self}, inverse: {id: inverse}})))}
    },
    artwork: {
      Entity: Artwork, Repository: ArtworkRepository,
      getBridges: ({ selfEntities }) => 
        this.createQueryBuilder(this.alias)
        .select(`${this.alias}.id AS self`)
        .addSelect(`${this.alias}.artwork AS inverse`)
        .where(`${this.alias}.id IN (:ids)`, {ids: selfEntities.map( ({id}) => id)})
        .getRawMany()
        .then( result => result.map( ({self, inverse}) => ({self: {id: self}, inverse: {id: inverse}})))
    },
    consulting: {
      Entity: Consulting, Repository: ConsultingRepository,
      getBridges: ({ selfEntities }) => 
        this.createQueryBuilder(this.alias)
        .select(`${this.alias}.id AS self`)
        .addSelect(`${this.alias}.consulting AS inverse`)
        .where(`${this.alias}.id IN (:ids)`, {ids: selfEntities.map( ({id}) => id)})
        .getRawMany()
        .then( result => result.map( ({self, inverse}) => ({self: {id: self}, inverse: {id: inverse}})))
    }

  }

  // public readonly setPropertySubscribe: ChainingSetPropertySubscribe<Reply, PathString<Reply>> = {
  //   beforeSetProperty: ({details}) => ({ details: [ ...details, 'keywordLabel' ] })
  // };
  public readonly setPropertySubscriber: Array<SetPropertyEvent<Reply, PathString<Reply>>>;
  public readonly saveSubscribe: SaveSubscriber<Reply, PathString<Reply>> = {
    events: [
      {
        where: ({attachments}) => attachments?.length > 0,
        afterSave: async ({entity}) => {
          const {
            name: tableName,
            joinColumns, inverseJoinColumns
          } = getMetadataArgsStorage()
          .findJoinTable(Reply, 'attachments' as keyof Reply);
          const joinColumnName = joinColumns[0].name;
          const inverseJoinColumnName = inverseJoinColumns[0].name;
          const updateBridge = entity.attachments.map( ({ id }, i: number ) => 
            ({
              [joinColumnName]: entity.id,
              [inverseJoinColumnName]: id,
              ord: i+1
            })
          );
          if( updateBridge.length > 0 )
            await Promise.all(
              updateBridge.map( ({ord, ...other}) => 
                this.manager.query(
                  `UPDATE \`${tableName}\` SET \`ord\` = ? WHERE \`${joinColumnName}\` = ? AND \`${inverseJoinColumnName}\` = ?`,
                  [ ord, other[joinColumnName], other[inverseJoinColumnName]]
                )
              )
            )
        }
      }
    ]
  };

  public searchQuery({
    uk, uks, artworkUk, consultingUk, orderBy, depth, parent, managerUk, userUk, blockReplies
  }: SearchReplyDto = {}): SelectQueryBuilder<Reply> {

    let query = this.createQueryBuilder(this.alias);

    if( uk )
      query = query.andWhere(`${this.alias}.uk = :uk`, {uk})
    if( uks?.length > 0 )
      query = query.andWhere(`${this.alias}.uk IN (:uks)`, {uks})

    if( artworkUk )
      query = query.leftJoin(`${this.alias}.artwork`, `SRC_${ARTWORKS}`)
        .andWhere(`SRC_${ARTWORKS}.uk = :artworkUk`, {artworkUk})

    if( consultingUk )
      query = query.leftJoin(`${this.alias}.consulting`, `SRC_${CONSULTINGS}`)
        .andWhere(`SRC_${CONSULTINGS}.uk = :consultingUk`, {consultingUk})

    if( orderBy ) {
      const { column, order } = splitToObject(orderBy, ['column', 'order']);
      if( column === 'id' ) {
        query = query.orderBy(`${this.alias}.id`, order as 'DESC'|'ASC')
      } else if(column === 'reg_date') {
        query = query.orderBy(`${this.alias}.reg_date`, order as 'DESC'|'ASC');
      }
      //추후 다른 정렬 기준에 대해서 추가 가능.
    } else {
      query = query.orderBy(`${this.alias}.reg_date`, 'DESC')
    }

    if(depth || parent) {
      query = query.leftJoin(`${this.alias}.hierarchical`, `SRC_${REPLY_HIERARCHICAL}`);
      if(depth) {
        query = query.andWhere(`SRC_${REPLY_HIERARCHICAL}.groupDepth IN (:depth)`, {depth});
      }
      if(parent) {
        query = query.andWhere(`SRC_${REPLY_HIERARCHICAL}.groupParent = :parent`, {parent});
      }
    }

    if(managerUk) {
      query = query.leftJoin(`${this.alias}.manager`, `SRC_${MANAGERS}`)
        .andWhere(`SRC_${MANAGERS}.uk = :managerUk`, {managerUk})
    }

    if(userUk) {
      query = query.leftJoin(`${this.alias}.user`, `SRC_${USERS}`)
        .andWhere(`SRC_${USERS}.uk = :userUk`, {userUk})
    }

    if(blockReplies) {
      query = query.andWhere(`${this.alias}.uk NOT IN (:blockReplies)`, {blockReplies});
    }

    return query;
  }

  public async findGroup(reply: Reply): Promise<Array<Reply>> {
    if( !reply?.hierarchical )
      return [];

    return this.getMany(
      ['hierarchical'],
      ctx => ctx.searchQuery()
      .leftJoin(`${ctx.alias}.hierarchical`, REPLY_HIERARCHICAL)
      .where(`${REPLY_HIERARCHICAL}.groupId = :groupId`, {groupId: reply.hierarchical.groupId})
      .orderBy(`${REPLY_HIERARCHICAL}.groupOrd`, 'ASC')
    )
  }
}