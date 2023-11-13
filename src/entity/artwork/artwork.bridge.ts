import { Replace } from "src/type/index.type";
import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryColumn, PrimaryGeneratedColumn } from "typeorm";
import { KeywordLabel } from "../comm/keywordLabel.entity";
import { NetAddress } from "../comm/netAddress.entity";
import { Artwork, ArtworkDto } from "./artwork.entity";

@Entity({ name: 'artwork_views' })
export class ArtworkView {
  @PrimaryGeneratedColumn({ name: 'artworkView_id', type: 'bigint' })
  id: string;

  @ManyToOne( () => Artwork, { nullable: false } )
  @JoinColumn({ name: 'artwork_id', referencedColumnName: 'id' })
  artwork?: Artwork;

  @ManyToOne( () => NetAddress, { nullable: false } )
  @JoinColumn({ name: 'netAddress_id', referencedColumnName: 'id' })
  netAddress?: NetAddress;

  @CreateDateColumn({ type: 'timestamp' })
  reg_date: Date;

}

@Entity({ name: 'artwork_moves' })
export class ArtworkMove {
  @PrimaryGeneratedColumn({ name: 'artwork_move_id', type: 'bigint' })
  id: string;

  @ManyToOne( () => Artwork, { nullable: false } )
  @JoinColumn({ name: 'artwork_id', referencedColumnName: 'id' })
  artwork?: Artwork;

  @ManyToOne( () => NetAddress, { nullable: false } )
  @JoinColumn({ name: 'netAddress_id', referencedColumnName: 'id' })
  netAddress?: NetAddress;

  @CreateDateColumn({ type: 'timestamp' })
  reg_date: Date;

}

// @Entity({ name: 'artwork_and_attachment'})
// export class ArtworkAttachment {
//   @PrimaryGeneratedColumn({ 
//     name: 'artworkAttachment_id', type: 'bigint' 
//   })
//   id: string;

//   @Column({ name: 'artwork_id', nullable: false })
//   artworkId: string;

//   @Column({ name: 'attachment_id', nullable: false })
//   attachmentId: string;

//   // @ManyToOne(() => Artwork,)
//   // @JoinColumn({ name: 'artwork_id', referencedColumnName: 'id'})
//   // artwork?: Artwork;

//   // @ManyToMany(() => Attachment)
//   // @JoinColumn({ name: 'attachment_id', referencedColumnName: 'id'})
//   // attachment?: Attachment;

//   @Column({nullable: false})
//   ord: number;
// }

// export type ArtworkAttachmentDto = Partial<ArtworkAttachment>;


@Entity({ name: 'artwork_and_label' })
export class ArtworkLabel {
  // @PrimaryGeneratedColumn({
  //   name: 'artworkLabel_id', type: 'bigint'
  // })
  // id: string;

  @PrimaryColumn({ name: 'artwork_id', nullable: false, type: 'bigint' })
  artworkId: string;

  @PrimaryColumn({ name: 'keywordLabel_id', nullable: false, type: 'bigint' })
  keywordLabelId: string;

  // @ManyToOne( () => Artwork, entity => entity.artworkLabels )
  // @JoinColumn({ name: 'artwork_id', referencedColumnName: 'id' })
  // artwork?: Artwork;

  // @ManyToOne( () => KeywordLabel )
  // @JoinColumn({ name: 'keywordLabel_id', referencedColumnName: 'id' })
  // keywordLabel?: KeywordLabel;

  @Column({ nullable: false })
  ord: number;

  // @ManyToOne( () => KeywordLabel, {primary: true} )
  // @JoinColumn({ name: 'keywordLabel_id' })
  keywordLabel?: KeywordLabel;

  @ManyToOne( () => Artwork, entity => entity.labels, { orphanedRowAction: 'delete' })
  @JoinColumn({ name: 'artwork_id'})
  artwork?: Artwork
}

export type ArtworkLabelDto = Partial<
  Replace<
    ArtworkLabel,
    {
      artwork: ArtworkDto
    }
  >

>