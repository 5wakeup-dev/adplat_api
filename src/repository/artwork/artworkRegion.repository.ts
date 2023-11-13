import { TABLE_ALIAS } from "src/config/typeorm.config";
import { ArtworkRegion } from "src/entity/artwork/artworkRegion.entity";
import { ChainRelation, ChainRepository, PathString, SaveSubscriber, SetPropertyEvent } from "src/util/typeorm.util";
import { EntityRepository, SelectQueryBuilder } from "typeorm";

const {
  ARTWORK_REGIONS
} = TABLE_ALIAS;

@EntityRepository(ArtworkRegion)
export class ArtworkRegionRepository extends ChainRepository<ArtworkRegion> {
  public readonly primaryKeys: Array<keyof ArtworkRegion> = ['id'];
  public readonly alias: string = ARTWORK_REGIONS;
  public readonly relationChain: ChainRelation<ArtworkRegion>;

  public readonly setPropertySubscriber: Array<SetPropertyEvent<ArtworkRegion, PathString<ArtworkRegion>>>;
  public readonly saveSubscribe: SaveSubscriber<ArtworkRegion, PathString<ArtworkRegion>>

  public searchQuery(searchDto?: any): SelectQueryBuilder<ArtworkRegion> {
    return this.createQueryBuilder(this.alias);
  }
}