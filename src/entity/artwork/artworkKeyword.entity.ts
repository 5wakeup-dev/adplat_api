import { Replace } from "src/type/index.type";
import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Keyword } from "../comm/keyword.entity";
import { Artwork, ArtworkDto } from "./artwork.entity";

@Entity({ name: 'artwork_keywords' })
export class ArtworkKeyword {
  @PrimaryGeneratedColumn({ name: 'artworkKeyword_id', type: 'bigint' })
  id: string;

  @Column({ length: 8, nullable: false })
  i18n: string;

  @Column({ name: 'artwork_id', nullable: false })
  artworkId: string;

  @ManyToOne( () => Artwork, entity => entity.i18nKeywords, { orphanedRowAction: 'delete' })
  @JoinColumn({ name: 'artwork_id' })
  artwork?: Artwork;

  @Column({ name: 'keyword_id', nullable: false })
  keywordId: string;

  @ManyToOne( () => Keyword )
  @JoinColumn({ name: 'keyword_id'})
  keyword?: Keyword;

  @Column({ nullable: false })
  ord: number;

}

export type ArtworkKeywordDto = Partial<
  Replace<
    ArtworkKeyword,
    {
      artwork: ArtworkDto
    }
  >
>;