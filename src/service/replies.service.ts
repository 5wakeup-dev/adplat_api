import { Injectable } from "@nestjs/common";
import { Message } from "firebase-admin/messaging";
import { TABLE_ALIAS } from "src/config/typeorm.config";
import { Artwork } from "src/entity/artwork/artwork.entity";
import { BlockMember } from "src/entity/blockMember/blockMember.entity";
import { Consulting } from "src/entity/consulting/consulting.entity";
import { Manager } from "src/entity/member/manager.entity";
import { User } from "src/entity/member/user.entity";
import { Reply, ReplyDto } from "src/entity/reply/reply.entity";
import { SearchReplyDto } from "src/entity/reply/reply.interface";
import { ReplyHierarchical, ReplyHierarchicalDto } from "src/entity/reply/replyHierarchical.entity";
import { DEFAULT_ROLE } from "src/entity/role/role.interface";
import { BASIC_EXCEPTION } from "src/exception/basic.exception";
import { ArtworkRepository } from "src/repository/artwork/artwork.repository";
import { BlockMemberRepository } from "src/repository/blockMember/blockMember.repository";
import { ConsultingRepository } from "src/repository/consulting/consulting.repository";
import { MemberDeviceTokenRepository } from "src/repository/member/deviceToken.repository";
import { ReplyRepository } from "src/repository/reply/reply.repository";
import { COMM_STATE, isContainRoles, isSameAuth } from "src/util/entity.util";
import { ListPageRes } from "src/util/entity/listPage";
import PageInfo from "src/util/entity/PageInfo";
import { equals, isUndeclared, UNKNOWN } from "src/util/format.util";
import { createBranchAndRefresh } from "src/util/hierarchical.util";
import { deepClone } from "src/util/index.util";
import { oneWayEnc } from "src/util/secret.util";
import { getRepositories, TransactionHelper, TransactionHelperParam } from "src/util/typeorm.util";
import { Connection, EntityManager } from "typeorm";

const {
  BLOCK_MEMBERS, MANAGERS, USERS,
  REPLIES
} = TABLE_ALIAS;

type CreateHierarchicalParam = {
  entityManager: EntityManager;
  self: Reply;
}
type CreateHierarchical = ( param: CreateHierarchicalParam ) => Promise<ReplyHierarchical>;

@Injectable()
export class RepliesService {
  constructor(
    private connection: Connection,
  ){}
  
  @TransactionHelper({ paramIndex: 3 })
  async createBranchReply(
    target: Reply, dto: ReplyDto, auth: User|Manager,
    transaction: TransactionHelperParam = {connection: this.connection, entityManager: this.connection.manager}
  ): Promise<Reply> {
    if( ( !target?.artwork && !target?.consulting ) || !dto )
      throw BASIC_EXCEPTION.NOT_ALLOW_EMPTY_ON_PROCESS;
    else if( !auth )
      throw BASIC_EXCEPTION.NOT_FOUND_AUTH;

    const isRoot = isContainRoles(auth, ['root'] as Array<DEFAULT_ROLE> );
    if( !isRoot ){
      if( !isUndeclared(dto.state) && dto.state !== COMM_STATE.NORMAL )
        throw BASIC_EXCEPTION.INCORRECT_PROPERTY_VALUE;
    }

    // if(target.password) {
    //   const targetReplyOwner = isSameAuth(auth, target.manager || target.user);
    //   const targetPostOwner = isSameAuth(auth, 
    //     target.artwork?.manager
    //     || target.consulting?.manager || target.consulting?.user
    //     || target.instrumentMarket?.manager || target.instrumentMarket?.user
    //   );
      
    //   if(!isRoot && !targetReplyOwner && !targetPostOwner) {
    //     throw BASIC_EXCEPTION.NOT_ALLOW_AUTH;
    //   }

    //   dto.password = oneWayEnc()
    // }

    if(!target.isUnlock) { // 비공개 댓글에 댓글을 쓰는 경우
      const targetReplyOwner = isSameAuth(auth, target.manager || target.user);
      const targetPostOwner = isSameAuth(auth, 
        target.artwork?.manager
        || target.consulting?.manager || target.consulting?.user
      );
      
      if(!isRoot && !targetReplyOwner && !targetPostOwner) {
        throw BASIC_EXCEPTION.NOT_ALLOW_AUTH;
      }

      dto.isUnlock = false;
    }

    if( target.artwork )
      dto.artwork = target.artwork;
    else if( target.consulting )
      dto.consulting = target.consulting;
   

    return this.createReply(
      dto,
      async ({ self, entityManager: em}) => {
        const repos = getRepositories({
          reply: ReplyRepository,
          hierarchical: ReplyHierarchical
        }, em);
        const allGroupReply = await repos.reply.findGroup(target);
        const allGroupHierarchicals = allGroupReply.map( ({hierarchical}) => hierarchical );
        const cloneAllGroup = deepClone(allGroupHierarchicals);
        const hierarchicalDto: ReplyHierarchicalDto = createBranchAndRefresh(allGroupHierarchicals, target.hierarchical)
        hierarchicalDto.id = self.id;
        const refresh = allGroupHierarchicals.filter( h => {
          const find = cloneAllGroup.find( ({id}) => id === h.id);
          return !find || !equals(find, h)
        }) 
        return repos.hierarchical.save(refresh)
          .then( () => hierarchicalDto as ReplyHierarchical )
      },
      transaction
    )
  }

  @TransactionHelper({ paramIndex: 3 })
  async patchReply(
    origin: Reply, dto: ReplyDto, auth: User|Manager,
    transaction: TransactionHelperParam = {connection: this.connection, entityManager: this.connection.manager}
  ): Promise<Reply> {
    if( ( !origin?.artwork && !origin?.consulting ) || !dto ) {
      throw BASIC_EXCEPTION.NOT_ALLOW_EMPTY_ON_PROCESS;
    } else if( !auth ) {
      throw BASIC_EXCEPTION.NOT_FOUND_AUTH;
    }
    const isRoot = isContainRoles(auth, ['root'] as Array<DEFAULT_ROLE> );
    if(!isRoot && !(isSameAuth(origin.manager, auth) || isSameAuth(origin.user, auth))) {
      throw BASIC_EXCEPTION.NOT_ALLOW_AUTH;
    }

    const repos = getRepositories({
      reply: ReplyRepository
    }, transaction.entityManager);

    const cloneOrigin = deepClone(origin);

    return repos.reply.save(dto)
      .then(entity => 
        Object.assign(cloneOrigin, entity)
      )
  }

  @TransactionHelper({ paramIndex: 2 })
  async deleteReply(
    origin: Reply, auth: User|Manager,
    {entityManager}: TransactionHelperParam = {connection: this.connection, entityManager: this.connection.manager}
    ): Promise<Array<Reply>> {
    if(!origin?.hierarchical) {
      throw BASIC_EXCEPTION.NOT_ALLOW_EMPTY_ON_PROCESS;
    }
    const isRoot = isContainRoles(auth, ['root'] as Array<DEFAULT_ROLE> );
    if(!isRoot && !(isSameAuth(origin.manager, auth) || isSameAuth(origin.user, auth))) {
      throw BASIC_EXCEPTION.NOT_ALLOW_AUTH;
    }

    const repos = getRepositories({
      reply: ReplyRepository,
      hierarchical: ReplyHierarchical,
      artwork: ArtworkRepository,
      consulting: ConsultingRepository
    }, entityManager);

    const allGroups: Array<Reply> = await repos.reply.findGroup(origin);

    const {
      deepBranch, elseReplies
    } = allGroups.reduce(
      (result, r) => {
        if(r.id === origin.id || r.hierarchical.groupParent === origin.id) {
          result.deepBranch.push(r);
        } else {
          result.elseReplies.push(r);
        }
        return result;
      }, {deepBranch: [] as Array<Reply>, elseReplies: [] as Array<Reply>}
    );

    const cloneDeepBranch = deepClone(deepBranch);

    if(origin.artwork) {
      await repos.artwork.save({id: origin.artwork.id, reply: origin.artwork.reply - deepBranch.length});
    } else if(origin.consulting) {
      await repos.consulting.save({id: origin.consulting.id, reply: origin.consulting.reply - deepBranch.length});
    }

    // 바로 1 depth 밑에 하위 댓글만 개수 카운팅한다고 가정. 따라서, 1개만 차감. 추후 기획에 따라 수정 필요.
    if(origin.hierarchical.groupParent) {
      const parentReply = await repos.reply.getOne(
        undefined,
        ctx => ctx.searchQuery()
          .andWhere(`${ctx.alias}.id = :id`, {id: origin.hierarchical.groupParent})
      );
      await repos.reply.save({id: parentReply.id, repliesCount: parentReply.repliesCount - 1});
    }

    return repos.reply.remove(deepBranch)
      .then(async () => {
        elseReplies.forEach(({hierarchical: h}, i) => h.groupOrd = i + 1);
        await repos.hierarchical.save(
          elseReplies.map(({hierarchical}) => hierarchical)
        );
        return cloneDeepBranch;
      })
  }

  @TransactionHelper({ paramIndex: 2 })
  async createRootReply(
    dto: ReplyDto, auth: User|Manager,
    transaction: TransactionHelperParam = {connection: this.connection, entityManager: this.connection.manager}
  ): Promise<Reply> {
    if( !dto )
      throw BASIC_EXCEPTION.NOT_ALLOW_EMPTY_ON_PROCESS;
    else if( !auth )
      throw BASIC_EXCEPTION.NOT_FOUND_AUTH;
    else if( !dto.artwork && !dto.consulting )
      throw BASIC_EXCEPTION.NOT_ALLOW_EMPTY_ON_PROCESS;

    const isRoot = isContainRoles(auth, ['root'] as Array<DEFAULT_ROLE> );
    if( !isRoot ){
      if( !isUndeclared(dto.state) && dto.state !== COMM_STATE.NORMAL )
        throw BASIC_EXCEPTION.INCORRECT_PROPERTY_VALUE;
    }
    
    return this.createReply(
      dto,
      async ({self, entityManager: em}) => {
        
        const hierarchicalDto: ReplyHierarchicalDto = {
          groupId: self.id,
          id: self.id,
          groupOrd: 1,
          groupDepth: 0,
          groupParent: null
        }
        const rst = await em.getRepository(ReplyHierarchical).save(hierarchicalDto);
        rst.id = self.id;
        return hierarchicalDto as ReplyHierarchical;
      },
      transaction
    )
  }

  @TransactionHelper({ paramIndex: 2 })
  private async createReply(
    dto: ReplyDto, createHierarchical: CreateHierarchical,
    { entityManager }: TransactionHelperParam = {connection: this.connection, entityManager: this.connection.manager}
  ): Promise<Reply> {
    if( !dto )
      throw BASIC_EXCEPTION.NOT_ALLOW_EMPTY_ON_PROCESS;
    
    const created = await entityManager.getCustomRepository(ReplyRepository)
    .save(dto)
    created.hierarchical = await createHierarchical({self: created, entityManager});

    return created;
  }


  @TransactionHelper({ paramIndex: 3 })
  async getArtworkRepliesAsListPage(
    search: SearchReplyDto, artwork: Artwork, auth: Manager | User,
    { entityManager }: TransactionHelperParam = {connection: this.connection, entityManager: this.connection.manager}
  ): Promise<ListPageRes<Reply>> {
    if(!artwork) {
      throw BASIC_EXCEPTION.NOT_ALLOW_EMPTY_ON_PROCESS;
    }
    
    search.artworkUk = artwork.uk;
    if(!!search.consultingUk) {
      delete search.consultingUk;
    }
  
    const repos = getRepositories({
      reply: ReplyRepository,
      blockMember: BlockMemberRepository
    }, entityManager);

    if(auth && search.blockMember) {
      let blockMembers: Array<BlockMember> = undefined;

      if(auth.type === 'Manager') {
        blockMembers = await repos.blockMember.getMany(
          ['blockManager', 'blockUser', 'manager'],
          ctx => ctx.searchQuery()
            .leftJoin(`${BLOCK_MEMBERS}.manager`, `${MANAGERS}`)
            .where(`${MANAGERS}.uk = :managerUk`, {managerUk: auth.uk})
        );
      } else {
        blockMembers = await repos.blockMember.getMany(
          ['blockManager', 'blockUser', 'user'],
          ctx => ctx.searchQuery()
            .leftJoin(`${BLOCK_MEMBERS}.user`, `${USERS}`)
            .where(`${USERS}.uk = :userUk`, {userUk: auth.uk})
        );
      }

      if(blockMembers && blockMembers.length > 0) {
        const blockManagers = blockMembers.filter(blk => !!blk.blockManager)
          .map(rst => rst.blockManager.uk);
        const blockUsers = blockMembers.filter(blk => !!blk.blockUser)
          .map(rst => rst.blockUser.uk);

        let blockQuery = repos.reply.searchQuery();
        if(blockManagers && blockManagers.length > 0) {
          blockQuery = blockQuery
            .leftJoin(`${REPLIES}.manager`, `${MANAGERS}`)
            .orWhere(`${MANAGERS}.uk IN (:blockManagers)`, {blockManagers});
        }
        if(blockUsers && blockUsers.length > 0) {
          blockQuery = blockQuery
            .leftJoin(`${REPLIES}.user`, `${USERS}`)
            .orWhere(`${USERS}.uk IN (:blockUsers)`, {blockUsers});
        }

        search.blockReplies = await blockQuery
          .getMany()
          .then(rpl => rpl.map(rp => rp.uk));

        if(search.blockReplies.length === 0) {
          delete search.blockReplies;
        }
      }
    }

    const {curPage, rowPerPage, pagePerBlock} = search;

    const totalRow: number = await repos.reply
      .searchQuery(search)
      .getCount();
    if(totalRow === 0) {
      throw BASIC_EXCEPTION.EMPTY_CONTENT;
    }

    const page: PageInfo = new PageInfo({curPage, rowPerPage, totalRow, pagePerBlock});

    const list = await repos.reply
      .searchQuery(search)
      .skip(page.startRow)
      .take(page.rowPerPage)
      .getMany();


    return {page, list};
  }

  @TransactionHelper({ paramIndex: 3 })
  async getConsultingRepliesAsListPage(
    search: SearchReplyDto, consulting: Consulting, auth: Manager | User,
    { entityManager }: TransactionHelperParam = {connection: this.connection, entityManager: this.connection.manager}
  ): Promise<ListPageRes<Reply>> {
    if(!consulting) {
      throw BASIC_EXCEPTION.NOT_ALLOW_EMPTY_ON_PROCESS;
    }
    
    search.consultingUk = consulting.uk;
    if(!!search.artworkUk) {
      delete search.artworkUk;
    }
    

    const repos = getRepositories({
      reply: ReplyRepository,
      blockMember: BlockMemberRepository
    }, entityManager);

    if(auth && search.blockMember) {
      let blockMembers: Array<BlockMember> = undefined;

      if(auth.type === 'Manager') {
        blockMembers = await repos.blockMember.getMany(
          ['blockManager', 'blockUser', 'manager'],
          ctx => ctx.searchQuery()
            .leftJoin(`${BLOCK_MEMBERS}.manager`, `${MANAGERS}`)
            .where(`${MANAGERS}.uk = :managerUk`, {managerUk: auth.uk})
        );
      } else {
        blockMembers = await repos.blockMember.getMany(
          ['blockManager', 'blockUser', 'user'],
          ctx => ctx.searchQuery()
            .leftJoin(`${BLOCK_MEMBERS}.user`, `${USERS}`)
            .where(`${USERS}.uk = :userUk`, {userUk: auth.uk})
        );
      }

      if(blockMembers && blockMembers.length > 0) {
        const blockManagers = blockMembers.filter(blk => !!blk.blockManager)
          .map(rst => rst.blockManager.uk);
        const blockUsers = blockMembers.filter(blk => !!blk.blockUser)
          .map(rst => rst.blockUser.uk);

        let blockQuery = repos.reply.searchQuery();
        if(blockManagers && blockManagers.length > 0) {
          blockQuery = blockQuery
            .leftJoin(`${REPLIES}.manager`, `${MANAGERS}`)
            .orWhere(`${MANAGERS}.uk IN (:blockManagers)`, {blockManagers});
        }
        if(blockUsers && blockUsers.length > 0) {
          blockQuery = blockQuery
            .leftJoin(`${REPLIES}.user`, `${USERS}`)
            .orWhere(`${USERS}.uk IN (:blockUsers)`, {blockUsers});
        }

        search.blockReplies = await blockQuery
          .getMany()
          .then(rpl => rpl.map(rp => rp.uk));

        if(search.blockReplies.length === 0) {
          delete search.blockReplies;
        }
      }
    }

    const {curPage, rowPerPage, pagePerBlock} = search;

    const totalRow: number = await repos.reply
      .searchQuery(search)
      .getCount();
    if(totalRow === 0) {
      throw BASIC_EXCEPTION.EMPTY_CONTENT;
    }

    const page: PageInfo = new PageInfo({curPage, rowPerPage, totalRow, pagePerBlock});

    const list = await repos.reply
      .searchQuery(search)
      .skip(page.startRow)
      .take(page.rowPerPage)
      .getMany();


    return {page, list};
  }


  @TransactionHelper({ paramIndex: 3 })
  async getRepliesAsListPageByReplyUk(
    search: SearchReplyDto, parentReply: Reply, auth: Manager | User,
    { entityManager }: TransactionHelperParam = {connection: this.connection, entityManager: this.connection.manager}
  ): Promise<ListPageRes<Reply>> {
    if(!parentReply) {
      throw BASIC_EXCEPTION.NOT_ALLOW_EMPTY_ON_PROCESS;
    }

    search.parent = parentReply.id;

    const repos = getRepositories({
      reply: ReplyRepository,
      blockMember: BlockMemberRepository
    }, entityManager);

    if(auth && search.blockMember) {
      let blockMembers: Array<BlockMember> = undefined;

      if(auth.type === 'Manager') {
        blockMembers = await repos.blockMember.getMany(
          ['blockManager', 'blockUser', 'manager'],
          ctx => ctx.searchQuery()
            .leftJoin(`${BLOCK_MEMBERS}.manager`, `${MANAGERS}`)
            .where(`${MANAGERS}.uk = :managerUk`, {managerUk: auth.uk})
        );
      } else {
        blockMembers = await repos.blockMember.getMany(
          ['blockManager', 'blockUser', 'user'],
          ctx => ctx.searchQuery()
            .leftJoin(`${BLOCK_MEMBERS}.user`, `${USERS}`)
            .where(`${USERS}.uk = :userUk`, {userUk: auth.uk})
        );
      }

      if(blockMembers && blockMembers.length > 0) {
        const blockManagers = blockMembers.filter(blk => !!blk.blockManager)
          .map(rst => rst.blockManager.uk);
        const blockUsers = blockMembers.filter(blk => !!blk.blockUser)
          .map(rst => rst.blockUser.uk);

        let blockQuery = repos.reply.searchQuery();
        if(blockManagers && blockManagers.length > 0) {
          blockQuery = blockQuery
            .leftJoin(`${REPLIES}.manager`, `${MANAGERS}`)
            .orWhere(`${MANAGERS}.uk IN (:blockManagers)`, {blockManagers});
        }
        if(blockUsers && blockUsers.length > 0) {
          blockQuery = blockQuery
            .leftJoin(`${REPLIES}.user`, `${USERS}`)
            .orWhere(`${USERS}.uk IN (:blockUsers)`, {blockUsers});
        }

        search.blockReplies = await blockQuery
          .getMany()
          .then(rpl => rpl.map(rp => rp.uk));

        if(search.blockReplies.length === 0) {
          delete search.blockReplies;
        }
      }
    }

    const {curPage, rowPerPage, pagePerBlock} = search;

    const totalRow: number = await repos.reply
      .searchQuery(search)
      .getCount();
    if(totalRow === 0) {
      throw BASIC_EXCEPTION.EMPTY_CONTENT;
    }

    const page: PageInfo = new PageInfo({curPage, rowPerPage, totalRow, pagePerBlock});

    const list = await repos.reply
      .searchQuery(search)
      .skip(page.startRow)
      .take(page.rowPerPage)
      .getMany();


    return {page, list};
  }

  @TransactionHelper({ paramIndex: 2 })
  async getRepliesAsListPage(
    search: SearchReplyDto, auth: Manager|User,
    { entityManager }: TransactionHelperParam = {connection: this.connection, entityManager: this.connection.manager}
  ): Promise<ListPageRes<Reply>> {
    if(!auth) {
      throw BASIC_EXCEPTION.NOT_ALLOW_AUTH;
    }
    const isRoot = isContainRoles(auth, ['root'] as Array<DEFAULT_ROLE>);
    if(!isRoot) {
      if(auth.type === 'Manager') {
        search.managerUk = auth.uk;
        delete search.userUk;
      } else {
        search.userUk = auth.uk;
        delete search.managerUk;
      }
    }

    const repos = getRepositories({
      reply: ReplyRepository,
      blockMember: BlockMemberRepository
    }, entityManager);

    if(auth && search.blockMember) {
      let blockMembers: Array<BlockMember> = undefined;

      if(auth.type === 'Manager') {
        blockMembers = await repos.blockMember.getMany(
          ['blockManager', 'blockUser', 'manager'],
          ctx => ctx.searchQuery()
            .leftJoin(`${BLOCK_MEMBERS}.manager`, `${MANAGERS}`)
            .where(`${MANAGERS}.uk = :managerUk`, {managerUk: auth.uk})
        );
      } else {
        blockMembers = await repos.blockMember.getMany(
          ['blockManager', 'blockUser', 'user'],
          ctx => ctx.searchQuery()
            .leftJoin(`${BLOCK_MEMBERS}.user`, `${USERS}`)
            .where(`${USERS}.uk = :userUk`, {userUk: auth.uk})
        );
      }

      if(blockMembers && blockMembers.length > 0) {
        const blockManagers = blockMembers.filter(blk => !!blk.blockManager)
          .map(rst => rst.blockManager.uk);
        const blockUsers = blockMembers.filter(blk => !!blk.blockUser)
          .map(rst => rst.blockUser.uk);

        let blockQuery = repos.reply.searchQuery();
        if(blockManagers && blockManagers.length > 0) {
          blockQuery = blockQuery
            .leftJoin(`${REPLIES}.manager`, `${MANAGERS}`)
            .orWhere(`${MANAGERS}.uk IN (:blockManagers)`, {blockManagers});
        }
        if(blockUsers && blockUsers.length > 0) {
          blockQuery = blockQuery
            .leftJoin(`${REPLIES}.user`, `${USERS}`)
            .orWhere(`${USERS}.uk IN (:blockUsers)`, {blockUsers});
        }

        search.blockReplies = await blockQuery
          .getMany()
          .then(rpl => rpl.map(rp => rp.uk));

        if(search.blockReplies.length === 0) {
          delete search.blockReplies;
        }
      }
    }

    const {curPage, rowPerPage, pagePerBlock} = search;

    const totalRow: number = await repos.reply
      .searchQuery(search)
      .getCount();
    if(totalRow === 0) {
      throw BASIC_EXCEPTION.EMPTY_CONTENT;
    }

    const page: PageInfo = new PageInfo({curPage, rowPerPage, totalRow, pagePerBlock});

    const list = await repos.reply
    .searchQuery(search)
    .skip(page.startRow)
    .take(page.rowPerPage)
    .getMany();

    return {page, list};
  }


}