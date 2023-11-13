import { Body, Controller, Delete, Get, Param, Post, Query } from "@nestjs/common";
import { TABLE_ALIAS } from "src/config/typeorm.config";
import { Auth } from "src/decorator/auth.decorator";
import { BlockMember, BlockMemberDto, BlockMemberReq, BlockMemberRes } from "src/entity/blockMember/blockMember.entity";
import { Manager } from "src/entity/member/manager.entity";
import { User } from "src/entity/member/user.entity";
import { dividePipe } from "src/pipe/divide.pipe";
import { dynamicPipe } from "src/pipe/dynamic.pipe";
import { fitPipe } from "src/pipe/fit.pipe";
import { BlockMemberRepository } from "src/repository/blockMember/blockMember.repository";
import { ManagerRepository } from "src/repository/member/manager.repository";
import { UserRepository } from "src/repository/member/user.repository";
import { BlockMembersService } from "src/service/blockMembers.service";
import { ListPageRes, SearchPage } from "src/util/entity/listPage";
import { initNumber } from "src/util/index.util";
import { getRepositories, PathString } from "src/util/typeorm.util";
import { Connection } from "typeorm";

const {
  BLOCK_MEMBERS, MANAGERS, USERS
} = TABLE_ALIAS;

const BLOCK_MEMBER_FIT_PIPE = fitPipe<BlockMemberReq>([
  'blockManager', 'blockUser'
])

const SEARCH_PAGE_NUMBER_PIPE = dynamicPipe<SearchPage>(({value}) => {
  (['curPage', 'rowPerPage', 'pagePerBlock'] as Array<keyof SearchPage>)
    .forEach(key => {
      const val = value[key];
      if(val !== undefined) {
        value[key] = initNumber(val) as never;
      }
    })
  return value;
})

const SEARCH_PAGE_FIT_PIPE = fitPipe<SearchPage>([
  'curPage', 'rowPerPage', 'orderBy', 'pagePerBlock'
])

@Controller('blockMembers')
export class BlockMembersController {
  constructor(
    private blockMembersService: BlockMembersService,
    private connection: Connection
  ) {}

  @Post()
  async createBlockMember(
    @Body(
      BLOCK_MEMBER_FIT_PIPE
    ) body: BlockMemberReq,
    @Auth() auth: Manager | User
  ): Promise<BlockMemberRes> {
    const repos = getRepositories({
      manager: ManagerRepository,
      user: UserRepository,
      blockMember: BlockMemberRepository
    }, this.connection.manager);

    let blockManager: Manager = undefined;
    if(body.blockManager) {
      blockManager = await repos.manager.getOne(
        undefined,
        ctx => ctx.searchQuery({uk: body.blockManager})
      );
    }
    let blockUser: User = undefined;
    if(body.blockUser) {
      blockUser = await repos.user.getOne(
        undefined,
        ctx => ctx.searchQuery({uk: body.blockUser})
      );
    }

    const dto: BlockMemberDto = {
      blockManager,
      blockUser
    };

    return this.blockMembersService.createBlockMember(dto, auth)
    .then(async blk => {
      await repos.blockMember
        .setProperty({details: ['manager', 'user', 'blockManager', 'blockUser'], data: {auth}}, [blk]);

      return new BlockMemberRes(blk);
    })
  }

  @Delete(':blockMember_id')
  async removeBlockMember(
    @Param('blockMember_id') blockMemberId: string,
    @Auth() auth: Manager | User
  ): Promise<string> {
    const repos = getRepositories({
      blockMember: BlockMemberRepository
    }, this.connection.manager);

    const blockMember: BlockMember = await repos.blockMember.getOne(
      ['manager', 'user'],
      ctx => ctx.searchQuery()
        .where(`${ctx.alias}.id = :id`, {id: blockMemberId})
    );

    return this.blockMembersService.removeBlockMember(blockMember, auth);
  }

  @Get('page')
  async readBlockMembers(
    @Query(
      SEARCH_PAGE_NUMBER_PIPE,
      SEARCH_PAGE_FIT_PIPE
    ) pageData: SearchPage,
    @Auth() auth: Manager | User,
    @Query(
      'detail', dividePipe()
    ) details: Array<PathString<BlockMember>>
  ): Promise<ListPageRes<BlockMemberRes>> {
    return this.blockMembersService.readBlockMembers(pageData, auth)
      .then(async ({page, list}) => {
        await this.connection.manager
          .getCustomRepository(BlockMemberRepository)
          .setProperty({details: ['manager', 'user', 'blockManager', 'blockUser', ...details], data: {auth}}, list);

        return {
          page,
          list: list.map(blk => new BlockMemberRes(blk))
        }
      });
  }
}