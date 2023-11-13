import { TABLE_ALIAS } from "src/config/typeorm.config";
import { ArtworkLabel } from "src/entity/artwork/artwork.bridge";
import { KeywordLabel } from "src/entity/comm/keywordLabel.entity";
import { ChainRelation, ChainRepository, PathString, SaveSubscriber, SetPropertyEvent } from "src/util/typeorm.util";
import { EntityRepository, SelectQueryBuilder } from "typeorm";
import { KeywordLabelRepository } from "../comm/keywordLabel.repository";

const{
  ARTWORK_LABELS
} = TABLE_ALIAS;

@EntityRepository(ArtworkLabel)
export class ArtworkLabelRepository extends ChainRepository<ArtworkLabel> {
  public readonly primaryKeys: Array<keyof ArtworkLabel> = ['artworkId', 'keywordLabelId'];
  public readonly alias: string = ARTWORK_LABELS;
  public readonly relationChain: ChainRelation<ArtworkLabel> = {
    keywordLabel: {
      Entity: KeywordLabel, Repository: KeywordLabelRepository,
      getBridges: async ({selfEntities}) =>
        selfEntities.map( ({artworkId, keywordLabelId}) => ({self: {artworkId, keywordLabelId}, inverse: {id: keywordLabelId}}))
    }
  };
  // public readonly setPropertySubscribe: ChainingSetPropertySubscribe<ArtworkLabel, PathString<ArtworkLabel>> = {
  //   beforeSetProperty: ({details}) => ({ details: [...details, 'keywordLabel'] })
  // };
  public readonly setPropertySubscriber: Array<SetPropertyEvent<ArtworkLabel, PathString<ArtworkLabel>>> = [
    {
      where: ({details}) => !details.some( detail => detail === 'keywordLabel'),
      before: ({details}) => { details.push('keywordLabel') }
    }
  ];

  public readonly saveSubscribe: SaveSubscriber<ArtworkLabel, PathString<ArtworkLabel>>;

  public searchQuery(): SelectQueryBuilder<ArtworkLabel> {
    return this.createQueryBuilder(this.alias);
  }
}
