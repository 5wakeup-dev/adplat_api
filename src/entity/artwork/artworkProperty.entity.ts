import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from "typeorm";
import { Artwork } from "./artwork.entity";

@Entity({ name: 'artwork_properties' })
export class ArtworkProperty {
  @PrimaryColumn({ name: 'artwork_id', type: 'bigint' })
  artworkId: string;

  @PrimaryColumn({ length: 64, nullable: false })
  key: string;

  @Column({ length: 512, nullable: false })
  val: string;

  @ManyToOne( () => Artwork, entity => entity.properties, {orphanedRowAction: 'delete'})
  @JoinColumn({ name: 'artwork_id'})
  artwork?: Artwork;
}

export type ArtworkPropertyDto = Partial<ArtworkProperty>