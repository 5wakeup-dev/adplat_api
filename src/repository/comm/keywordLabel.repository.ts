import { TABLE_ALIAS } from "src/config/typeorm.config";
import { Keyword } from "src/entity/comm/keyword.entity";
import { KeywordLabel } from "src/entity/comm/keywordLabel.entity";
import { SearchKeywordLabelDto } from "src/entity/comm/keywordLabel.interface";
import { Manager } from "src/entity/member/manager.entity";
import { ChainRelation, ChainRepository, PathString, SaveSubscriber, SetPropertyEvent } from "src/util/typeorm.util";
import { EntityRepository, SelectQueryBuilder } from "typeorm";
import { ManagerRepository } from "../member/manager.repository";

const {
  KEYWORD_LABELS,
  KEYWORDS,
  MANAGERS
} = TABLE_ALIAS;

@EntityRepository(KeywordLabel)
export class KeywordLabelRepository extends ChainRepository<KeywordLabel> {
  public readonly primaryKeys: Array<keyof KeywordLabel> = ['id'];
  public readonly alias: string = KEYWORD_LABELS;
  public readonly relationChain: ChainRelation<KeywordLabel> = {
    keyword: {
      Entity: Keyword, 
      getBridges: async ({selfEntities}) =>
        selfEntities.map( ({id, keywordId}) => ({self: {id}, inverse: {id: keywordId}}))
      ,
      getDatas: ({entityManager: em, selfEntities}) => 
        em.getRepository(Keyword)
        .createQueryBuilder(KEYWORDS)
        .leftJoin(KeywordLabel, this.alias, `${KEYWORDS}.id = ${this.alias}.keywordId`)
        .where(`${this.alias}.id IN (:ids)`, {ids: selfEntities.map( ({id}) => id)})
        .getMany()
        
    },
    manager: {
      Entity: Manager, Repository: ManagerRepository,
      getBridges: ({selfEntities}) =>
        this.searchQuery()
          .select(`${this.alias}.id AS self`)
          .addSelect(`${this.alias}.manager AS inverse`)
          .where(`${this.alias}.id IN (:ids)`, {ids: selfEntities.map(({id}) => id)})
          .getRawMany()
          .then(result => result.map(({self, inverse}) => ({self: {id: self}, inverse: {id: inverse}})))
    }
  }
  
  public readonly setPropertySubscriber: Array<SetPropertyEvent<KeywordLabel, PathString<KeywordLabel>>> = [
    {
      where: ({details}) => !details.some( detail => detail === 'keyword'),
      before: ({details}) => { details.push('keyword') }
    }
  ];

  public readonly saveSubscribe: SaveSubscriber<KeywordLabel, PathString<KeywordLabel>>;

  public searchQuery({
    uk, managerUk, keyword, type, color
  }: SearchKeywordLabelDto = {}): SelectQueryBuilder<KeywordLabel> {
    let query = this.createQueryBuilder(this.alias);

    if(uk) {
      query = query.andWhere(`${this.alias}.uk = :uk`, {uk});
    }

    if(managerUk) {
      query = query.leftJoin(`${this.alias}.manager`, `SRC_${MANAGERS}`)
        .andWhere(`SRC_${MANAGERS}.uk = :managerUk`, {managerUk});
    }

    if(keyword) {
      query = query.leftJoin(`${this.alias}.keyword`, `SRC_${KEYWORDS}`)
        .andWhere(`SRC_${KEYWORDS}.keyword LIKE :keyword`, {keyword: `%${keyword}%`});
    }

    if(type) {
      query = query.andWhere(`${this.alias}.type LIKE :type`, {type: `%${type}%`});
    }

    if(color) {
      query = query.andWhere(`${this.alias}.color = :color`, {color});
    }

    return query;
  }

}