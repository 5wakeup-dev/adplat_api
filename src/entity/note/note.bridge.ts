import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from "typeorm";
import { KeywordLabel } from "../comm/keywordLabel.entity";
import { Note } from "./note.entity";


@Entity({ name: 'note_and_label' })
export class NoteLabel {
  @PrimaryColumn({ name: 'note_id', nullable: false })
  noteId: string;

  @PrimaryColumn({ name: 'keywordLabel_id', nullable: false })
  keywordLabelId: string;

  @Column({ nullable: false })
  ord: number;

  @ManyToOne( 
    () => Note, 
    entity => entity.labels, 
    { orphanedRowAction: 'delete' } 
  )
  @JoinColumn({ name: 'note_id' })
  note?: Note;

  @ManyToOne(() => KeywordLabel)
  @JoinColumn({ name: 'keywordLabel_id' })
  keywordLabel?: KeywordLabel;
}

export type NoteLabelDto = Partial<NoteLabel>;