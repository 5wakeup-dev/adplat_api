import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Artwork } from "./artwork.entity";

@Entity({ name: 'artwork_ranges' })
export class ArtworkRange {

  @PrimaryGeneratedColumn({ name: 'artworkRange_id', type: 'bigint' })
  id: string;

  @ManyToOne( () => Artwork, entity => entity.ranges, {orphanedRowAction: 'delete'} )
  @JoinColumn({ name: 'artwork_id' })
  artwork?: Artwork;

  @Column({ name: 'start_date' })
  startDate?: Date;

  @Column({ name: 'end_date' })
  endDate?: Date;

}

export type ArtworkRangeDto = Partial<ArtworkRange>;

export class ArtworkRangeRes {
  id: string;
  startDate?: number;
  endDate?: number;
  constructor({id, startDate, endDate}: ArtworkRange){
    this.id = id;

    if( startDate )
      this.startDate = startDate.getTime();

    if( endDate )
      this.endDate = endDate.getTime();
  }
}

export type ArtworkRangeReq = Partial<
  ArtworkRangeRes
>