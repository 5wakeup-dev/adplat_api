import { Replace } from "src/type/index.type";
import { Column, CreateDateColumn, Entity, JoinColumn, JoinTable, ManyToMany, ManyToOne, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { KeywordLabel, KeywordLabelDto, KeywordLabelReq, KeywordLabelRes } from "../comm/keywordLabel.entity";
import { Manager, ManagerRes } from "../member/manager.entity";
import { NoteLabel, NoteLabelDto } from "./note.bridge";
import { NoteLink, NoteLinkRes } from "./noteLink.entity";

@Entity({ name: 'notes' })
export class Note {
  @PrimaryGeneratedColumn({ name: 'note_id', type: 'bigint' })
  id: string;

  @Column({ length: 64, nullable: false, name: 'uix_note_uk' })
  uk: string;

  @Column({ length: 256, nullable: false })
  type: string;

  @Column({ length: 2048, nullable: false })
  content: string;

  @Column({ nullable: false })
  existPeriod: boolean;

  @Column({  })
  start_date?: Date;

  @Column({  })
  end_date?: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  upt_date?: Date;

  @CreateDateColumn({ type: 'timestamp' })
  reg_date: Date;

  // @ManyToMany( () => KeywordLabel )
  // @JoinTable({
  //   name: 'note_and_label',
  //   joinColumn: { name: 'note_id', referencedColumnName: 'id' },
  //   inverseJoinColumn: { name: 'keywordLabel_id', referencedColumnName: 'id' }
  // })
  // labels?: Array<KeywordLabel>;

  @OneToMany(
    () => NoteLabel,
    entity => entity.note,
    { orphanedRowAction: 'delete', cascade: [ 'insert', 'update' ] } 
  )
  labels?: Array<NoteLabel>;

  @OneToMany( () => NoteLink, entity => entity.note, { orphanedRowAction: 'delete', cascade: ['insert', 'update']})
  links?: Array<NoteLink>;

  @ManyToOne( () => Manager, { cascade: false } )
  @JoinColumn({ name: 'manager_id' })
  manager?: Manager
} 

export type NoteDto = Partial<
  Replace<
    Note,
    {
      labels: Array<NoteLabelDto>;
    }
  >
>

export class NoteRes {
  id: string;
  uk: string;
  type: string;
  content: string;
  existPeriod: boolean;
  start_date?: number;
  end_date?: number;
  upt_date?: number;
  reg_date: number;
  labels?: Array<KeywordLabelRes>;
  links?: Array<NoteLinkRes>;
  manager?: ManagerRes

  constructor(
    {
      id, type, content, existPeriod, 
      start_date, end_date, 
      upt_date, reg_date, 
      labels, links,
      manager, uk
    }: Note
  ){

    this.id = id;
    this.uk = uk;
    this.type = type;
    this.content = content;
    this.existPeriod = existPeriod;
    if( start_date )
      this.start_date = start_date.getTime();
    if( end_date )
      this.end_date = end_date.getTime();
    if( upt_date )
      this.upt_date = upt_date.getTime();

    this.reg_date = reg_date.getTime();

    if( labels )
      this.labels = labels.map(({keywordLabel}) => new KeywordLabelRes(keywordLabel) );
      
    if( links?.length > 0 )
      this.links = links.map( lnk => new NoteLinkRes(lnk) );

    if(manager)
      this.manager = new ManagerRes(manager)
  }
}

export type NoteReq = Partial<
  Replace<
    Omit<NoteRes, 'upt_date'|'reg_date'|'manager'|'existPeriod'>,
    {
      labels: Array<KeywordLabelReq>;
    }
  >
>;