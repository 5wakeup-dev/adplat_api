import { Replace } from "src/type/index.type";
import { isUndeclared } from "src/util/format.util";
import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from "typeorm";
import { Artwork, ArtworkDto } from "./artwork.entity";

@Entity({name : 'artwork_i18ns'})
export class ArtworkI18n {

  @PrimaryColumn({name: 'artwork_id', type: 'bigint', nullable: false})
  artworkId: string;

  @PrimaryColumn({ length: 8, nullable: false})
  i18n: string

  @Column({length: 128, nullable: false})
  title: string

  // @Column({length: 4294967295})
  @Column({length: 16777215 })
  content?: string;

  // @Column({length:  4294967295})
  @Column({length: 16777215 })
  search?: string;

  /** orphancedRowAction
  * 루트에서 save했을때 루트 배열에서 제외되면 삭제됨(artwork.i18ns)
  * 
  */
  @ManyToOne( _ => Artwork, entity => entity.i18ns, {orphanedRowAction: 'delete'})
  @JoinColumn({ name: 'artwork_id' })
  artwork?: Artwork

  
}

export type ArtworkI18nDto = Partial<
  Replace<
    ArtworkI18n,
    {
      artwork: ArtworkDto
    }
  >

>;

export class ArtworkI18nRes {
  i18n: string;
  title: string;
  content?: string;
  constructor(
    {
      i18n, title, content
    }: ArtworkI18n
  ){
    this.i18n = i18n;
    this.title = title;
    if( !isUndeclared(content) )
      this.content = content;
  }
}

export type ArtworkI18nReq = Partial<ArtworkI18nRes>;