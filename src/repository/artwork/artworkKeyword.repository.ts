import { TABLE_ALIAS } from "src/config/typeorm.config";
import { ArtworkKeyword } from "src/entity/artwork/artworkKeyword.entity";
import { Keyword } from "src/entity/comm/keyword.entity";
import { ChainRelation, ChainRepository, PathString, SaveSubscriber, SetPropertyEvent } from "src/util/typeorm.util";
import { EntityRepository, SelectQueryBuilder } from "typeorm";

const{
  ARTWORK_KEYWORDS
} = TABLE_ALIAS;

@EntityRepository(ArtworkKeyword)
export class ArtworkKeywordRepository extends ChainRepository<ArtworkKeyword> {
  public readonly primaryKeys: Array<keyof ArtworkKeyword> = ['id'];
  public readonly alias: string = ARTWORK_KEYWORDS;
  public readonly relationChain: ChainRelation<ArtworkKeyword> = {
    keyword: {
      Entity: Keyword, 
      getBridges: ({ selfEntities }) =>
        this.createQueryBuilder(this.alias)
        .select(`${this.alias}.id AS self`)
        .addSelect(`${this.alias}.keyword AS inverse`)
        .where(`${this.alias}.id IN (:ids)`, {ids: selfEntities.map( ({id}) => id)})
        .orderBy(`${this.alias}.artworkId`, 'DESC')
        .addOrderBy(`${this.alias}.ord`, 'ASC')
        .getRawMany()
        .then( result => result.map( ({self, inverse}) => ({self: {id: self}, inverse: {id: inverse}})))
      ,
      getDatas: ({ entityManager: em, selfEntities }) => 
        em.getRepository(Keyword)
        .createQueryBuilder('KWD')
        .leftJoin(ArtworkKeyword, this.alias, `${this.alias}.keywordId = KWD.id`)
        .where(`${this.alias}.id IS NOT NULL AND ${this.alias}.id IN (:ids)`, {ids: selfEntities.map( ({id}) => id) })
        .getMany()
    }
  };
  // public readonly setPropertySubscribe: ChainingSetPropertySubscribe<ArtworkKeyword, PathString<ArtworkKeyword>> = {
  //   beforeSetProperty: ({details}) => ({ details: [...details, 'keyword'] })
  // };
  public readonly setPropertySubscriber: Array<SetPropertyEvent<ArtworkKeyword, PathString<ArtworkKeyword>>> = [
    {
      where: ({details}) => !details.some( detail => detail === 'keyword'),
      before: ({details}) => { details.push('keyword') }
    }
  ];
  public readonly saveSubscribe: SaveSubscriber<ArtworkKeyword, PathString<ArtworkKeyword>>;

  public searchQuery(): SelectQueryBuilder<ArtworkKeyword> {
    
    return this.createQueryBuilder(this.alias);
  }
}
