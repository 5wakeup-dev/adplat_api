import { Replace } from "src/type/index.type";
import { entriesTypeGuard, getPick } from "src/util/index.util";
import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Note, NoteDto } from "./note.entity";


@Entity({ name: 'note_links' })
export class NoteLink {
  @PrimaryGeneratedColumn({ name: 'noteLink_id', type: 'bigint' })
  id: string;
  
  
  
  @Column({ length: 32, nullable: false })
  title: string;
  
  @Column({ length: 512, nullable: false })
  link: string;
  
  @Column({  })
  ord?: number;


  // @Column({ nullable: false })
  // note_id: bigint;
  @ManyToOne(() => Note, entity => entity.links, { orphanedRowAction: 'delete' } )
  @JoinColumn({ name: 'note_id' })
  note?: Note;
}
export type NoteLinkDto = Partial<
  Replace<
    Note,
    { note: NoteDto }
  >
>

export class NoteLinkRes {
  id: string;
  title: string;
  link: string;
  ord?: number;
  constructor(
    entity: NoteLink
  ){
    entriesTypeGuard(
      getPick(entity, [
        'id', 'title', 'link', 'ord'
      ])
    )
    .forEach( ([k, v]) => {
      this[k] = v as never;
    })
  }
}

export type NoteLinkReq = Partial<
  Omit<NoteLinkRes, 'ord'>
>