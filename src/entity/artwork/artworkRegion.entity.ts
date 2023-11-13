import { Column, Entity, JoinColumn, OneToOne, PrimaryColumn } from "typeorm";
import { Artwork } from "./artwork.entity";

@Entity({ name: 'artwork_regions' })
export class ArtworkRegion {
  @PrimaryColumn({
    name: 'artwork_id', type: 'bigint'
  })
  id: string;

  @OneToOne( () => Artwork, entity => entity.region, {orphanedRowAction: 'delete'})
  @JoinColumn({name: 'artwork_id'})
  artwork?: Artwork;

  @Column({
    nullable: false, length: 256
  })
  address: string;

  @Column({
    nullable: false
  })
  longitude: number;

  @Column({
    nullable: false
  })
  latitude: number;
}

export type ArtworkRegionDto = Partial<ArtworkRegion>;

export class ArtworkRegionRes {
  address: string;
  longitude: number;
  latitude: number;
  constructor({
    address, longitude, latitude
  }: ArtworkRegion) {
    this.address = address;
    this.longitude = longitude;
    this.latitude = latitude;
  }
}

export type ArtworkRegionReq = Partial<ArtworkRegionRes>;