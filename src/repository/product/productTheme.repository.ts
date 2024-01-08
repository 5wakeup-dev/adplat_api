import { TABLE_ALIAS } from "src/config/typeorm.config";
import { ArtworkKeyword } from "src/entity/artwork/artworkKeyword.entity";
import { Keyword } from "src/entity/comm/keyword.entity";
import { ProductTheme } from "src/entity/product/productTheme.entity";
import { ChainRelation, ChainRepository, PathString, SaveSubscriber, SetPropertyEvent } from "src/util/typeorm.util";
import { EntityRepository, SelectQueryBuilder } from "typeorm";

const{
  ARTWORK_KEYWORDS
} = TABLE_ALIAS;

@EntityRepository(ProductTheme)
export class ProductThemeRepository extends ChainRepository<ProductTheme> {
  public readonly primaryKeys: Array<keyof ProductTheme> = ['id'];
  public readonly alias: string = ARTWORK_KEYWORDS;
  public readonly relationChain: ChainRelation<ProductTheme> = {
   
  };
  // public readonly setPropertySubscribe: ChainingSetPropertySubscribe<ArtworkKeyword, PathString<ArtworkKeyword>> = {
  //   beforeSetProperty: ({details}) => ({ details: [...details, 'keyword'] })
  // };
  public readonly setPropertySubscriber: Array<SetPropertyEvent<ProductTheme, PathString<ProductTheme>>>;
  public readonly saveSubscribe: SaveSubscriber<ProductTheme, PathString<ProductTheme>>;

  public searchQuery(): SelectQueryBuilder<ProductTheme> {
    
    return this.createQueryBuilder(this.alias);
  }
}
