import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { Auth } from "src/decorator/auth.decorator";
import { Artwork } from "src/entity/artwork/artwork.entity";
import { Consulting } from "src/entity/consulting/consulting.entity";
import { Manager } from "src/entity/member/manager.entity";
import { MemberBasic } from "src/entity/member/memberBasic.entity";
import { User } from "src/entity/member/user.entity";
import { Reply, ReplyReq, ReplyRes } from "src/entity/reply/reply.entity";
import { SearchReplyDto } from "src/entity/reply/reply.interface";
import { DEFAULT_ROLE } from "src/entity/role/role.interface";
import { dividePipe } from "src/pipe/divide.pipe";
import { dynamicPipe } from "src/pipe/dynamic.pipe";
import { fitPipe } from "src/pipe/fit.pipe";
import { selectPipe } from "src/pipe/select.pipe";
import { ArtworkRepository } from "src/repository/artwork/artwork.repository";
import { ConsultingRepository } from "src/repository/consulting/consulting.repository";
import { ReplyRepository } from "src/repository/reply/reply.repository";
import { AttachmentsService } from "src/service/attachments.service";
import { RepliesService } from "src/service/replies.service";
import { isContainRoles, isSameAuth, replyUtil } from "src/util/entity.util";
import { ListPageRes } from "src/util/entity/listPage";
import { hideTextExclude, isUndeclared } from "src/util/format.util";
import { initArray, initNumber, splitToObject } from "src/util/index.util";
import { getRepositories, PathString } from "src/util/typeorm.util";
import { Connection } from "typeorm";

const REPLY_FIT_PIPE = fitPipe<ReplyReq>([
  'content', 'password', 'checkPassword', 'writer', 'state', 'attachments', 'isUnlock'
])
const REPLY_SELECT_PIPE = selectPipe<ReplyReq>({
  attachments: (_, val) => initArray(val)
})

const REPLY_SEARCH_NUMBER_PIPE = dynamicPipe<SearchReplyDto>(({ value }) => {
  (['curPage', 'rowPerPage', 'pagePerBlock'] as Array<keyof SearchReplyDto>)
    .forEach(key => {
      const val = value[key];
      if (val !== undefined)
        value[key] = initNumber(val) as never;
    })
  return value;
})
const REPLY_SEARCH_SELECT_PIPE = selectPipe<SearchReplyDto>({
  orderBy: (_, val) => {
    const { column, order } = splitToObject(
      val,
      ['column', 'order'],
      {
        limit: [['id', 'reg_date'], ['DESC', 'ASC']],
        def: { column: 'reg_date', order: 'DESC' }
      }
    );
    return `${column}-${order}`
  },
  uks: (_, val) => initArray<string>(val, v => !!v),
  depth: (_, val) => initArray<number>(val)
})
const REPLY_SEARCH_FIT_PIPE = fitPipe<SearchReplyDto>([
  'curPage', 'rowPerPage', 'pagePerBlock', 'orderBy',
  'artworkUk', 'consultingUk', 'uk', 'uks', 'depth', 'parent',
  'userUk', 'managerUk', 'blockMember'
])

@Controller('replies')
export class RepliesController {
  constructor(
    private connection: Connection,
    private repliesService: RepliesService,
    private attachmentsService: AttachmentsService
  ) { }

  @Post('/artworks/:artwork_uk')
  async postArtworkReply(
    @Param('artwork_uk') artworkUk: string,
    @Body(
      REPLY_FIT_PIPE,
      REPLY_SELECT_PIPE
    ) body: ReplyReq,
    @Auth() auth: User | Manager
  ): Promise<ReplyRes> {

    const repos = getRepositories({
      artwork: ArtworkRepository
    }, this.connection.manager);
    const artwork: Artwork = await repos.artwork.getOne(
      ['manager', 'menu.functions'],
      ctx => ctx.searchQuery({ uk: artworkUk })
    )
    const dto = await replyUtil.reqToDto(body, auth, {
      attachmentsService: this.attachmentsService
    });
    dto.artwork = artwork;

    return this.repliesService.createRootReply(dto, auth)
      .then(rpl => new ReplyRes(rpl));
  }

  @Get('artworks/:artwork_uk')
  async getArtworkReplies(
    @Param('artwork_uk') artworkUk: string,
    @Query(
      REPLY_SEARCH_NUMBER_PIPE,
      REPLY_SEARCH_FIT_PIPE,
      REPLY_SEARCH_SELECT_PIPE
    ) search: SearchReplyDto,
    @Query(
      'detail', dividePipe()
    ) details: Array<PathString<Reply>>,
    @Auth() auth: User | Manager,
  ): Promise<ListPageRes<ReplyRes>> {
    const repos = getRepositories({
      artwork: ArtworkRepository,
      reply: ReplyRepository
    }, this.connection.manager);

    search.blockMember = !isUndeclared(search.blockMember);

    const artwork: Artwork = await repos.artwork.getOne(
      ['manager'],
      ctx => ctx.searchQuery({ uk: artworkUk })
    );

    return this.repliesService.getArtworkRepliesAsListPage(search, artwork, auth)
      .then(async ({ page, list }) => {
        await repos.reply.setProperty({ details, data: { auth } }, list);

        for (const item of list) {
          if (!item.isUnlock) {
            const itemWithRelation = await repos.reply.getOne(
              ['hierarchical', 'manager', 'user'],
              ctx => ctx.searchQuery({ uk: item.uk })
            );

            const isRoot = isContainRoles(auth, ['root'] as Array<DEFAULT_ROLE>);
            const isReplyOwner = isSameAuth(auth, itemWithRelation.manager || itemWithRelation.user);
            const isPostOwner = isSameAuth(auth, artwork.manager);
            let isParentReplyOwner = false;
            if (itemWithRelation.hierarchical.groupParent) {
              const parentWithRelation = await repos.reply.getOne(
                ['hierarchical', 'manager', 'user'],
                ctx => ctx.searchQuery()
                  .where(`${ctx.alias}.id = :id`, { id: itemWithRelation.hierarchical.groupParent })
              );
              isParentReplyOwner = isSameAuth(auth, parentWithRelation.manager || parentWithRelation.user);
            }

            if (!isRoot && !isReplyOwner && !isParentReplyOwner && !isPostOwner) {
              item.content = '비밀 댓글입니다.';
            }

            if (!isRoot && !isReplyOwner) {
              if (item.manager) {
                if (item.manager?.basic) {
                  item.manager.basic = {
                    name: hideTextExclude({
                      text: item.manager.basic.name,
                      padChar: "*",
                      excludeLength: item.manager.basic.name.length - 2
                    })
                  } as MemberBasic
                }
                item.manager.identity = hideTextExclude({
                  text: item.manager.identity,
                  padChar: "*",
                  excludeLength: item.manager.identity.length - 2
                });
              } else if (item.user) {
                if (item.user?.basic) {
                  item.user.basic = {
                    name: hideTextExclude({
                      text: item.user.basic.name,
                      padChar: "*",
                      excludeLength: item.user.basic.name.length - 2
                    })
                  } as MemberBasic
                }
                item.user.identity = hideTextExclude({
                  text: item.user.identity,
                  padChar: "*",
                  excludeLength: item.user.identity.length - 2
                });
              }
            }
          }
        }

        return {
          page,
          list: list.map(rpl => new ReplyRes(rpl))
        }
      });
  }

  @Post('consultings/:consulting_uk')
  async postConsultingReply(
    @Param('consulting_uk') consultingUk: string,
    @Body(
      REPLY_FIT_PIPE,
      REPLY_SELECT_PIPE
    ) body: ReplyReq,
    @Auth() auth: User | Manager
  ): Promise<ReplyRes> {
    const repos = getRepositories({
      consulting: ConsultingRepository
    }, this.connection.manager);

    const consulting: Consulting = await repos.consulting.getOne(
      ['manager', 'menu.functions'],
      ctx => ctx.searchQuery({ uk: consultingUk })
    )

    const dto = await replyUtil.reqToDto(body, auth, {
      attachmentsService: this.attachmentsService
    });
    dto.consulting = consulting;

    return this.repliesService.createRootReply(dto, auth)
      // .then(rpl => new ReplyRes(rpl));
      .then(async rpl => {

        return new ReplyRes(rpl);
      })
  }

  @Get('consultings/:consulting_uk')
  async getConsultingReplies(
    @Param('consulting_uk') consultingUk: string,
    @Query(
      REPLY_SEARCH_NUMBER_PIPE,
      REPLY_SEARCH_FIT_PIPE,
      REPLY_SEARCH_SELECT_PIPE
    ) search: SearchReplyDto,
    @Query(
      'detail', dividePipe()
    ) details: Array<PathString<Reply>>,
    @Auth() auth: User | Manager,
  ): Promise<ListPageRes<ReplyRes>> {
    const repos = getRepositories({
      consulting: ConsultingRepository,
      reply: ReplyRepository
    }, this.connection.manager);

    search.blockMember = !isUndeclared(search.blockMember);

    const consulting: Consulting = await repos.consulting.getOne(
      ['manager', 'user'],
      ctx => ctx.searchQuery({ uk: consultingUk })
    );

    return this.repliesService.getConsultingRepliesAsListPage(search, consulting, auth)
      .then(async ({ page, list }) => {
        await repos.reply.setProperty({ details, data: { auth } }, list);

        for (const item of list) {
          if (!item.isUnlock) {
            const itemWithRelation = await repos.reply.getOne(
              ['hierarchical', 'manager', 'user'],
              ctx => ctx.searchQuery({ uk: item.uk })
            );

            const isRoot = isContainRoles(auth, ['root'] as Array<DEFAULT_ROLE>);
            const isReplyOwner = isSameAuth(auth, itemWithRelation.manager || itemWithRelation.user);
            const isPostOwner = isSameAuth(auth, consulting.manager || consulting.user);
            let isParentReplyOwner = false;
            if (itemWithRelation.hierarchical.groupParent) {
              const parentWithRelation = await repos.reply.getOne(
                ['hierarchical', 'manager', 'user'],
                ctx => ctx.searchQuery()
                  .where(`${ctx.alias}.id = :id`, { id: itemWithRelation.hierarchical.groupParent })
              );
              isParentReplyOwner = isSameAuth(auth, parentWithRelation.manager || parentWithRelation.user);
            }

            if (!isRoot && !isReplyOwner && !isParentReplyOwner && !isPostOwner) {
              item.content = '비밀 댓글입니다.';
            }

            if (!isRoot && !isReplyOwner) {
              if (item.manager) {
                if (item.manager?.basic) {
                  item.manager.basic = {
                    name: hideTextExclude({
                      text: item.manager.basic.name,
                      padChar: "*",
                      excludeLength: item.manager.basic.name.length - 2
                    })
                  } as MemberBasic
                }
                item.manager.identity = hideTextExclude({
                  text: item.manager.identity,
                  padChar: "*",
                  excludeLength: item.manager.identity.length - 2
                });
              } else if (item.user) {
                if (item.user?.basic) {
                  item.user.basic = {
                    name: hideTextExclude({
                      text: item.user.basic.name,
                      padChar: "*",
                      excludeLength: item.user.basic.name.length - 2
                    })
                  } as MemberBasic
                }
                item.user.identity = hideTextExclude({
                  text: item.user.identity,
                  padChar: "*",
                  excludeLength: item.user.identity.length - 2
                });
              }
            }

            
          }
        }

        return {
          page,
          list: list.map(rpl => new ReplyRes(rpl))
        }
      });
  }


  @Post(':reply_uk')
  async postReplyBranch(
    @Param('reply_uk') replyUk: string,
    @Body(
      REPLY_FIT_PIPE,
      REPLY_SELECT_PIPE
    ) body: ReplyReq,
    @Auth() auth: User | Manager
  ): Promise<ReplyRes> {
    const repos = getRepositories({
      reply: ReplyRepository
    }, this.connection.manager);
    const target: Reply = await repos.reply.getOne(
      ['artwork.manager', 'consulting.manager', 'consulting.user', 'hierarchical', 'manager', 'user'],
      ctx => ctx.searchQuery({ uk: replyUk })
    )

    const dto = await replyUtil.reqToDto(body, auth, {
      attachmentsService: this.attachmentsService
    });

    return this.repliesService.createBranchReply(target, dto, auth)
      // .then( rpl => new ReplyRes(rpl) )
      .then(async rpl => {

        return new ReplyRes(rpl);
      })
  }

  @Patch(':reply_uk')
  async patchReply(
    @Param('reply_uk') replyUk: string,
    @Body(
      REPLY_FIT_PIPE,
      REPLY_SELECT_PIPE
    ) body: ReplyReq,
    @Auth() auth: User | Manager
  ): Promise<ReplyRes> {
    const repos = getRepositories({
      reply: ReplyRepository
    }, this.connection.manager);

    const reply: Reply = await repos.reply.getOne(
      ['artwork', 'consulting', 'hierarchical'],
      ctx => ctx.searchQuery({ uk: replyUk })
    );

    const dto = await replyUtil.reqToDto(body, auth, {
      origin: reply,
      attachmentsService: this.attachmentsService
    });

    return this.repliesService.patchReply(reply, dto, auth)
      .then(rpl => new ReplyRes(rpl));
  }

  @Delete(':reply_uk')
  async deleteReply(
    @Param('reply_uk') replyUk: string,
    @Auth() auth: User | Manager
  ): Promise<number> {
    const repos = getRepositories({
      reply: ReplyRepository
    }, this.connection.manager);

    const reply: Reply = await repos.reply.getOne(
      ['artwork', 'consulting', 'hierarchical', 'manager', 'user'],
      ctx => ctx.searchQuery({ uk: replyUk })
    );

    return this.repliesService.deleteReply(reply, auth)
      .then(deleteReplies => deleteReplies.length);
  }

  @Get(':reply_uk')
  async getReplyListPageByReplyUk(
    @Param('reply_uk') replyUk: string,
    @Query(
      REPLY_SEARCH_NUMBER_PIPE,
      REPLY_SEARCH_FIT_PIPE,
      REPLY_SEARCH_SELECT_PIPE
    ) search: SearchReplyDto,
    @Query(
      'detail', dividePipe()
    ) details: Array<PathString<Reply>>,
    @Auth() auth: User | Manager
  ): Promise<ListPageRes<ReplyRes>> {
    const repos = getRepositories({
      reply: ReplyRepository
    }, this.connection.manager);

    const parentReply: Reply = await repos.reply.getOne(
      ['manager', 'user', 'artwork.manager', 'consulting.manager', 'consulting.user'],
      ctx => ctx.searchQuery({ uk: replyUk })
    );

    return this.repliesService.getRepliesAsListPageByReplyUk(search, parentReply, auth)
      .then(async ({ page, list }) => {
        await repos.reply.setProperty({ details, data: { auth } }, list);

        for (const item of list) {
          const itemWithRelation = await repos.reply.getOne(
            ['manager', 'user'],
            ctx => ctx.searchQuery({ uk: item.uk })
          );

          const isRoot = isContainRoles(auth, ['root'] as Array<DEFAULT_ROLE>);
          const isReplyOwner = isSameAuth(auth, itemWithRelation.manager || itemWithRelation.user);
          const isParentReplyOwner = isSameAuth(auth, parentReply.manager || parentReply.user);
          let isPostOwner = false;

          if (!item.isUnlock) {

            if (parentReply.artwork) {
              isPostOwner = isSameAuth(auth, parentReply.manager);
            } else if (parentReply.consulting) {
              isPostOwner = isSameAuth(auth, parentReply.consulting.manager || parentReply.consulting.user);
            } 

            if (!isRoot && !isReplyOwner && !isParentReplyOwner && !isPostOwner) {
              item.content = '비밀 댓글입니다.';
            }
          }

          if (!isRoot && !isReplyOwner) {
            if (item.manager) {
              if (item.manager?.basic) {
                item.manager.basic = {
                  name: hideTextExclude({
                    text: item.manager.basic.name,
                    padChar: "*",
                    excludeLength: item.manager.basic.name.length - 2
                  })
                } as MemberBasic
              }
              item.manager.identity = hideTextExclude({
                text: item.manager.identity,
                padChar: "*",
                excludeLength: item.manager.identity.length - 2
              });
            } else if (item.user) {
              if (item.user?.basic) {
                item.user.basic = {
                  name: hideTextExclude({
                    text: item.user.basic.name,
                    padChar: "*",
                    excludeLength: item.user.basic.name.length - 2
                  })
                } as MemberBasic
              }
              item.user.identity = hideTextExclude({
                text: item.user.identity,
                padChar: "*",
                excludeLength: item.user.identity.length - 2
              });
            }
          }

        }

        return {
          page,
          list: list.map(rpl => new ReplyRes(rpl))
        }
      });
  }

  @Get('reply/page')
  async getReplyListPage(
    @Query(
      REPLY_SEARCH_NUMBER_PIPE,
      REPLY_SEARCH_FIT_PIPE,
      REPLY_SEARCH_SELECT_PIPE
    ) search: SearchReplyDto,
    @Query(
      'detail', dividePipe()
    ) details: Array<PathString<Reply>>,
    @Auth() auth: User | Manager
  ): Promise<ListPageRes<ReplyRes>> {
    const repos = getRepositories({
      reply: ReplyRepository
    }, this.connection.manager);

    search.blockMember = !isUndeclared(search.blockMember);

    return this.repliesService.getRepliesAsListPage(search, auth)
      .then(async ({ page, list }) => {
        await repos.reply.setProperty({ details, data: { auth } }, list);

        for (const item of list) {
          if (!item.isUnlock) {
            const itemWithRelation = await repos.reply.getOne(
              ['hierarchical', 'manager', 'user', 'artwork.manager', 'consulting.manager', 'consulting.user'],
              ctx => ctx.searchQuery({ uk: item.uk })
            );

            const isRoot = isContainRoles(auth, ['root'] as Array<DEFAULT_ROLE>);
            const isReplyOwner = isSameAuth(auth, itemWithRelation.manager || itemWithRelation.user);
            let isParentReplyOwner = false;
            if (itemWithRelation.hierarchical.groupParent) {
              const parentWithRelation = await repos.reply.getOne(
                ['hierarchical', 'manager', 'user'],
                ctx => ctx.searchQuery()
                  .where(`${ctx.alias}.id = :id`, { id: itemWithRelation.hierarchical.groupParent })
              );
              isParentReplyOwner = isSameAuth(auth, parentWithRelation.manager || parentWithRelation.user);
            }
            let isPostOwner = false;
            if (itemWithRelation.artwork) {
              isPostOwner = isSameAuth(auth, itemWithRelation.manager);
            } else if (itemWithRelation.consulting) {
              isPostOwner = isSameAuth(auth, itemWithRelation.consulting.manager || itemWithRelation.consulting.user);
            } 

            if (!isRoot && !isReplyOwner && !isParentReplyOwner && !isPostOwner) {
              item.content = '비밀 댓글입니다.';
            }

            if (!isRoot && !isReplyOwner) {
              if (item.manager) {
                if (item.manager?.basic) {
                  item.manager.basic = {
                    name: hideTextExclude({
                      text: item.manager.basic.name,
                      padChar: "*",
                      excludeLength: item.manager.basic.name.length - 2
                    })
                  } as MemberBasic
                }
                item.manager.identity = hideTextExclude({
                  text: item.manager.identity,
                  padChar: "*",
                  excludeLength: item.manager.identity.length - 2
                });
              } else if (item.user) {
                if (item.user?.basic) {
                  item.user.basic = {
                    name: hideTextExclude({
                      text: item.user.basic.name,
                      padChar: "*",
                      excludeLength: item.user.basic.name.length - 2
                    })
                  } as MemberBasic
                }
                item.user.identity = hideTextExclude({
                  text: item.user.identity,
                  padChar: "*",
                  excludeLength: item.user.identity.length - 2
                });
              }
            }
          }
        }

        return {
          page,
          list: list.map(rpl => new ReplyRes(rpl))
        }
      });
  }

}