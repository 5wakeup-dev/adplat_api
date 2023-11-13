import { Injectable } from "@nestjs/common";
import * as dayjs from "dayjs";
import { TABLE_ALIAS, UK_PREFIX } from "src/config/typeorm.config";
import { Keyword, KeywordDto } from "src/entity/comm/keyword.entity";
import { KeywordLabel, KeywordLabelDto, KeywordLabelReq } from "src/entity/comm/keywordLabel.entity";
import { SearchKeywordLabelDto } from "src/entity/comm/keywordLabel.interface";
import { Manager } from "src/entity/member/manager.entity";
import { BASIC_EXCEPTION } from "src/exception/basic.exception";
import { KeywordLabelRepository } from "src/repository/comm/keywordLabel.repository";
import { isSameAuth } from "src/util/entity.util";
import { ListPageRes } from "src/util/entity/listPage";
import PageInfo from "src/util/entity/PageInfo";
import { createUuid, EMPTY, YYYYMMDDHHmmss } from "src/util/format.util";
import { deepClone } from "src/util/index.util";
import { disassemble } from "src/util/korea.util";
import { getRepositories, TransactionHelper, TransactionHelperParam } from "src/util/typeorm.util";
import { Connection } from "typeorm";


const {
  KEYWORDS,
  KEYWORD_LABELS
} = TABLE_ALIAS
@Injectable()
export class KeywordsService {
  constructor(
    private connection: Connection
  ){}

  getOrCreateKeyword( keywords: Array<string>, TransactionHelperParam?: TransactionHelperParam ): Promise<Array<Keyword>>;
  getOrCreateKeyword( keyword: string, TransactionHelperParam?: TransactionHelperParam ): Promise<Keyword>;

  @TransactionHelper({ paramIndex: 1, isolationLevel: 'READ UNCOMMITTED' })
  async getOrCreateKeyword( 
    keywordOrKeywords: string|Array<string> ,
    { entityManager }: TransactionHelperParam = {connection: this.connection, entityManager: this.connection.manager}
  ): Promise<Keyword|Array<Keyword>> {
    const isArray = Array.isArray(keywordOrKeywords);
    const keywords = isArray ? keywordOrKeywords : [ keywordOrKeywords ]
    if( !keywords || keywords.length === 0 )
      return undefined;

    const keywordsAsDeuplication: Array<string> = keywords.reduce( (arr, keyword) => {
      if( !arr.includes(keyword) )
        arr.push(keyword)
      return arr;
    }, [])

    const keywordRepo = entityManager.getRepository(Keyword);
    const exists: Array<Keyword> = await keywordRepo
    .createQueryBuilder(KEYWORDS)
    .where(`${KEYWORDS}.keyword IN (:keywords)`, { keywords: keywordsAsDeuplication })
    .getMany()
    const existKeywords = exists.map( ({keyword}) => keyword);

    const needInserts: Array<KeywordDto> = keywordsAsDeuplication
    .filter( reqKwd => !existKeywords.includes(reqKwd) )
    .map( reqKwd => {
      const { syllable, chosung } = disassemble(reqKwd);
      return {
        keyword: reqKwd,
        chosung: chosung.join(EMPTY),
        syllable: syllable.join(EMPTY)
      }
    });

    if( needInserts.length > 0 )
      await keywordRepo.save(needInserts);

    const inserted: Array<Keyword> = [...exists, ...needInserts as Array<Keyword>];

    inserted.sort( 
      ({keyword: aKeyword}, {keyword: bKeyword}) => 
        keywordsAsDeuplication.findIndex( reqKwd => reqKwd === aKeyword)
        - keywordsAsDeuplication.findIndex( reqKwd => reqKwd === bKeyword)
    )

    return isArray ? inserted : inserted[0];
  }

  @TransactionHelper({ paramIndex: 2, isolationLevel: 'READ UNCOMMITTED' })
  async getOrCreateKeywordLabels(
    findTypeKeywods: Array<KeywordLabelReq>, 
    auth: Manager,
    transaction: TransactionHelperParam = {connection: this.connection, entityManager: this.connection.manager}
  ): Promise<Array<KeywordLabel>> {
    
    if( !findTypeKeywods || findTypeKeywods.some( ({type, keyword}) => !type || !keyword) )
      throw BASIC_EXCEPTION.NOT_ALLOW_EMPTY_ON_PROCESS;
    else if( !auth )
      throw BASIC_EXCEPTION.NOT_FOUND_AUTH;
    // console.log('[!!!!] KEYWORD_LABELS', findTypeKeywods)
    const { entityManager } = transaction;
    const repos = getRepositories({
      label: KeywordLabelRepository
    }, entityManager);
    const {
      types: filterTypes, keywords: filterKwds
    } = findTypeKeywods.reduce( (result, { keyword, type }) => {
      if( !result.types.includes(type) )
        result.types.push(type);

      if( !result.keywords.includes(keyword) )
        result.keywords.push(keyword)

      return result;
    }, {keywords: [] as Array<string>, types: [] as Array<string>})

    const [
      existLabels, keywords 
    ] = await Promise.all([
      repos.label.getMany(
        ['keyword'],
        ctx => ctx.searchQuery()
        .leftJoin(`${KEYWORD_LABELS}.keyword`, KEYWORDS)
        .where(
          `${KEYWORD_LABELS}.manager = :managerId AND type IN (:types) AND ${KEYWORDS}.keyword IN (:keywords)`, 
          { managerId: auth.id, types: filterTypes, keywords: filterKwds }
        )
      ),

      this.getOrCreateKeyword(findTypeKeywods.map( ({keyword}) => keyword))
    ]);

    const dtos = findTypeKeywods.reduce( (result, { type, keyword, color, ord }) => {
      const orgLabel = existLabels.find(
        ({type: orgType, keyword: orgKeyword}) => 
          type === orgType && keyword === orgKeyword?.keyword
      )

      result.push(
        orgLabel 
        ? {
            id: orgLabel.id,
            uk: orgLabel.uk,
            color, ord
          }
        : {
            manager: auth,
            uk: createUuid({ prefix: `${UK_PREFIX.KEYWORD_LABEL}-${dayjs().format(YYYYMMDDHHmmss)}`, length: 24}),
            // keywordId: keywords.find( ({keyword: kwd }) => kwd === keyword ).id,
            type, keyword: keywords.find( ({keyword: kwd }) => kwd === keyword ),
            color, ord
          }
      )
      return result;
    }, [] as Array<KeywordLabelDto>)
    // console.log('[!!!!] 확인용1', existLabels);
    // console.log('[!!!!] 확인용2', keywords);
    // console.log('[!!!!] 확인용3', dtos);
    return repos.label.save( dtos ).then( entities => 
      repos.label.getMany( 
        ['keyword'],
        ctx => ctx.createQueryBuilder(KEYWORD_LABELS)
        .where(`${KEYWORD_LABELS}.id IN (:ids)`, {ids: entities.map( ({id}) => id )})
      ).then( result => {
        result.sort( 
          ({id: aId}, {id: bId}) =>
          entities.findIndex( ({id}) => id === aId) 
          - entities.findIndex( ({id}) => id === bId)
        )
        return result;

      })
    )

  }


  async readKeywordLabel(
    keywordLabelUk: string, auth: Manager
  ): Promise<KeywordLabel> {
    if(!keywordLabelUk) {
      throw BASIC_EXCEPTION.EMPTY_CONTENT;
    }

    const repos = getRepositories({
      keywordLabel: KeywordLabelRepository
    }, this.connection.manager);

    const keywordLabel: KeywordLabel = await repos.keywordLabel.getOne(
      ['manager'], ctx => ctx.searchQuery({uk: keywordLabelUk})
    );

    if(!keywordLabel) {
      throw BASIC_EXCEPTION.EMPTY_CONTENT;
    }

    const isOwner = isSameAuth(keywordLabel?.manager, auth);
    if(!isOwner) {
      throw BASIC_EXCEPTION.NOT_ALLOW_AUTH;
    }

    return keywordLabel;
  }

  async readKeywordLabelListPage(
    search: SearchKeywordLabelDto, auth: Manager
  ): Promise<ListPageRes<KeywordLabel>> {
    if(!auth) {
      throw BASIC_EXCEPTION.NOT_ALLOW_AUTH;
    }

    search.managerUk = auth.uk;

    const repos = getRepositories({
      keywordLabel: KeywordLabelRepository
    }, this.connection.manager);

    const {curPage, rowPerPage, pagePerBlock} = search;

    const totalRow: number = await repos.keywordLabel
      .searchQuery(search)
      .getCount();
    if(totalRow === 0) {
      throw BASIC_EXCEPTION.EMPTY_CONTENT;
    }

    const page: PageInfo = new PageInfo({curPage, rowPerPage, totalRow, pagePerBlock});

    const list = await repos.keywordLabel
      .searchQuery(search)
      .skip(page.startRow)
      .take(page.rowPerPage)
      .getMany();

    return {page, list};
  }

  @TransactionHelper({ paramIndex: 3 })
  async updateKeywordLabel(
    origin: KeywordLabel, dto: KeywordLabelDto, auth: Manager,
    {entityManager}: TransactionHelperParam = {connection: this.connection, entityManager: this.connection.manager}
  ): Promise<KeywordLabel> {
    if(!origin || !dto) {
      throw BASIC_EXCEPTION.NOT_ALLOW_EMPTY_ON_PROCESS;
    }
    const isOwner = isSameAuth(origin?.manager, auth);
    if(!isOwner) {
      throw BASIC_EXCEPTION.NOT_ALLOW_AUTH;
    }

    const repos = getRepositories({
      keywordLabel: KeywordLabelRepository
    }, entityManager);

    const cloneOrigin = deepClone(origin);

    return repos.keywordLabel.save(dto)
      .then(entity =>
        Object.assign(cloneOrigin, entity)
      );
  }

  @TransactionHelper({ paramIndex: 2 })
  async deleteKeywordLabel(
    keywordLabel: KeywordLabel, auth: Manager,
    {entityManager}: TransactionHelperParam = {connection: this.connection, entityManager: this.connection.manager}
  ): Promise<string> {
    if(!keywordLabel) {
      throw BASIC_EXCEPTION.NOT_ALLOW_EMPTY_ON_PROCESS;
    } else if(!auth || !isSameAuth(keywordLabel.manager, auth)) {
      throw BASIC_EXCEPTION.NOT_ALLOW_AUTH;
    }

    const repos = getRepositories({
      keywordLabel: KeywordLabelRepository
    }, entityManager);

    const deletedId = keywordLabel.id;
    return repos.keywordLabel.remove(keywordLabel)
      .then(() => deletedId);
  }
}