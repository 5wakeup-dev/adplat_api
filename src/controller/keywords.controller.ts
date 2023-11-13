import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { Auth } from "src/decorator/auth.decorator";
import { KeywordLabel, KeywordLabelDto, KeywordLabelReq, KeywordLabelRes } from "src/entity/comm/keywordLabel.entity";
import { SearchKeywordLabelDto } from "src/entity/comm/keywordLabel.interface";
import { Manager } from "src/entity/member/manager.entity";
import { BASIC_EXCEPTION } from "src/exception/basic.exception";
import { dividePipe } from "src/pipe/divide.pipe";
import { dynamicPipe } from "src/pipe/dynamic.pipe";
import { fitPipe } from "src/pipe/fit.pipe";
import { KeywordLabelRepository } from "src/repository/comm/keywordLabel.repository";
import { KeywordsService } from "src/service/keywords.service";
import { keywordLabelUtil } from "src/util/entity.util";
import { ListPageRes } from "src/util/entity/listPage";
import { initNumber } from "src/util/index.util";
import { getRepositories, PathString } from "src/util/typeorm.util";
import { Connection } from "typeorm";

const KEYWORD_LABEL_FIT_PIPE = fitPipe<KeywordLabelReq>([
  'keyword', 'type', 'color', 'ord'
])
const KEYWORD_LABEL_ARRAY_FIT_PIPE = dynamicPipe<Array<KeywordLabelReq>>(({value}) => {
  for(const val of value) {
    const keys = Object.keys(val);
    if(
      ['keyword', 'type'].some(requiredKey => !keys.includes(requiredKey))
    ) {
      throw BASIC_EXCEPTION.NOT_ALLOW_BODY;
    }
  }
  return value;
})
const KEYWORD_LABEL_SEARCH_NUMBER_PIPE = dynamicPipe<SearchKeywordLabelDto>(({value}) => {
  (['curPage', 'rowPerPage', 'pagePerBlock'] as Array<keyof SearchKeywordLabelDto>)
    .forEach(key => {
      const val = value[key];
      if(val !== undefined) {
        value[key] = initNumber(val) as never;
      }
    })
  return value;
})
const KEYWORD_LABEL_SEARCH_FIT_PIPE = fitPipe<SearchKeywordLabelDto>([
  'curPage', 'rowPerPage', 'pagePerBlock', 'orderBy',
  'uk', 'managerUk', 'type', 'keyword', 'color'
])

@Controller('keywords')
export class KeywordsController {
  constructor(
    private connection: Connection,
    private keywordsService: KeywordsService
  ) {}

  @Post('labels')
  async postKeywordLabels(
    @Body(KEYWORD_LABEL_ARRAY_FIT_PIPE) body: Array<KeywordLabelReq>,
    @Auth(Manager) auth: Manager
  ): Promise<Array<KeywordLabelRes>> {
    return this.keywordsService.getOrCreateKeywordLabels(body, auth)
      .then(kwlbs => kwlbs.map(kwlb => new KeywordLabelRes(kwlb)));
  }

  @Get('labels/:keywordLabel_uk')
  async getKeywordLabel(
    @Param('keywordLabel_uk') keywordLabelUk: string,
    @Auth(Manager) auth: Manager,
    @Query(
      'detail', dividePipe()
    ) details: Array<PathString<KeywordLabel>>
  ): Promise<KeywordLabelRes> {
    return this.keywordsService.readKeywordLabel(keywordLabelUk, auth)
      .then(async kwlb => {
        await this.connection.manager.getCustomRepository(KeywordLabelRepository)
          .setProperty({details, data: {auth}}, [kwlb]);

        return new KeywordLabelRes(kwlb);
      });
  }

  @Get('labels/:type/page')
  async getKeywordLabelListPage(
    @Param('type') type: string,
    @Auth() auth: Manager,
    @Query(
      KEYWORD_LABEL_SEARCH_NUMBER_PIPE,
      KEYWORD_LABEL_SEARCH_FIT_PIPE
    ) search: SearchKeywordLabelDto,
    @Query(
      'detail', dividePipe()
    ) details: Array<PathString<KeywordLabel>>
  ): Promise<ListPageRes<KeywordLabelRes>> {
    if(type.toLowerCase() !== 'all') {
      search.type = type;
    }

    return this.keywordsService.readKeywordLabelListPage(search, auth)
      .then(async ({page, list}) => {
        await this.connection.manager.getCustomRepository(KeywordLabelRepository)
          .setProperty({details, data: {auth}}, list);

        return {
          page,
          list: list.map(kwlb => new KeywordLabelRes(kwlb))
        }
      });
  }

  @Patch('labels/:keywordLabel_uk')
  async patchKeywordLabel(
    @Param('keywordLabel_uk') keywordLabelUk: string,
    @Body(KEYWORD_LABEL_FIT_PIPE) body: KeywordLabelReq,
    @Auth(Manager) auth: Manager
  ): Promise<KeywordLabelRes> {
    const repos = getRepositories({
      keywordLabel: KeywordLabelRepository
    }, this.connection.manager);

    const keywordLabel: KeywordLabel = await repos.keywordLabel.getOne(
      ['manager'], ctx => ctx.searchQuery({uk: keywordLabelUk})
    );

    const dto: KeywordLabelDto = await keywordLabelUtil.reqToDto(
      body, auth,
      {
        origin: keywordLabel,
        keywordsService: this.keywordsService,
        transaction: {connection: this.connection, entityManager: this.connection.manager}
      }
    );

    return this.keywordsService.updateKeywordLabel(keywordLabel, dto, auth)
      .then(kwlb => new KeywordLabelRes(kwlb));
  }

  @Delete('labels/:keywordLabel_uk')
  async deleteKeywordLabel(
    @Param('keywordLabel_uk') keywordLabelUk: string,
    @Auth(Manager) auth: Manager
  ): Promise<string> {
    const repos = getRepositories({
      keywordLabel: KeywordLabelRepository
    }, this.connection.manager);

    const keywordLabel: KeywordLabel = await repos.keywordLabel.getOne(
      ['manager'], ctx => ctx.searchQuery({uk: keywordLabelUk})
    );

    return this.keywordsService.deleteKeywordLabel(keywordLabel, auth);
  }
}