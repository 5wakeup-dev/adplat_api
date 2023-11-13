import { Replace } from "src/type/index.type";
import { entriesTypeGuard, getPick } from "src/util/index.util";
import { Column, CreateDateColumn, Entity, JoinColumn, JoinTable, ManyToMany, ManyToOne, OneToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { Artwork, ArtworkRes } from "../artwork/artwork.entity";
import { Attachment, AttachmentRes } from "../comm/attachment.entity";
import { Consulting, ConsultingRes } from "../consulting/consulting.entity";
import { Manager, ManagerRes } from "../member/manager.entity";
import { User, UserRes } from "../member/user.entity";
import { ReplyHierarchical, ReplyHierarchicalDto } from "./replyHierarchical.entity";


@Entity({ name: 'replies' })
export class Reply {
  @PrimaryGeneratedColumn({ name: 'reply_id', type: 'bigint' })
  id: string;

  @Column({ name: 'uix_reply_uk', length: 32, nullable: false })
  uk: string;

  @Column({ length: 128 })
  password?: string;

  @Column({ length: 65535, nullable: false })
  content: string;

  @Column({ length: 32, nullable: false })
  writer: string;

  @Column({ nullable: false })
  state: number;  

  @Column({ nullable: false })
  isUnlock: boolean;  

  @UpdateDateColumn({ type: 'timestamp' })
  upt_date?: Date;

  @CreateDateColumn({ type: 'timestamp' })
  reg_date: Date;

  @OneToOne( () => ReplyHierarchical )
  @JoinColumn({ name: 'reply_id' })
  hierarchical?: ReplyHierarchical;

  @ManyToOne( () => User )
  @JoinColumn({ name: 'user_id' })
  user?: User;

  @ManyToOne( () => Manager )
  @JoinColumn({ name: 'manager_id' })
  manager?: Manager;

  @ManyToMany( () => Attachment )
  @JoinTable({
    name: 'reply_and_attachment',
    joinColumn: { name: 'reply_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'attachment_id', referencedColumnName: 'id' }
  })
  attachments?: Array<Attachment>;

  @OneToOne( () => Artwork, {} )
  @JoinColumn({ name: 'artwork_id'})
  // @JoinTable({ 
  //   name: 'reply_and_artwork',
  //   joinColumn: { name: 'reply_id', referencedColumnName: 'id' },
  //   inverseJoinColumn: { name: 'artwork_id', referencedColumnName: 'id' }
  // })
  artwork?: Artwork;

  @OneToOne( () => Consulting )
  @JoinColumn({ name: 'consulting_id'})
  // @JoinTable({ 
  //   name: 'reply_and_consulting',
  //   joinColumn: { name: 'reply_id', referencedColumnName: 'id' },
  //   inverseJoinColumn: { name: 'consulting_id', referencedColumnName: 'id' }
  // })
  consulting?: Consulting;

  @Column({ nullable: false })
  repliesCount: number; // 하위 reply 개수
}

export type ReplyDto = Partial<
  Replace<
    Reply,
    { hierarchical: ReplyHierarchicalDto }
  >
>

export class ReplyRes {
  id: string;
  uk: string;
  password?: string;
  content: string;
  writer: string;
  state: number;
  isUnlock: boolean;
  upt_date?: number;
  reg_date: number;

  hierarchical?: ReplyHierarchical;
  user?: UserRes;
  manager?: ManagerRes;

  attachments?: Array<AttachmentRes>;

  repliesCount: number;
  artwork?: ArtworkRes;
  consulting?: ConsultingRes;

  constructor( entity: Reply ) {

    const { 
      upt_date, reg_date,
      user, manager, hierarchical, attachments,
      repliesCount, artwork, consulting
    } = entity;
    entriesTypeGuard(
      getPick(entity, [
        'id', 'uk', 'content', 'writer', 'state', 'isUnlock'
      ])
    ).forEach( ([key, val]) => {
      this[key] = val as never;
    })

    if( upt_date )
      this.upt_date = upt_date.getTime();

    this.reg_date = reg_date.getTime();

    if( hierarchical )
      this.hierarchical = hierarchical;

    if( user )
      this.user = new UserRes(user);
    if( manager )
      this.manager = new ManagerRes(manager);

    if( attachments?.length > 0 )
      this.attachments = attachments.map( attc => new AttachmentRes(attc) );

    this.repliesCount = repliesCount;

    if(artwork) {
      this.artwork = new ArtworkRes(artwork);
    }

    if(consulting) {
      this.consulting = new ConsultingRes(consulting);
    }

    }

}

export type ReplyReq = Partial<
  Replace<
    Omit<ReplyRes, 'user'|'manager'|'upt_date'|'reg_date'|'uk'|'hierarchical'|'repliesCount'|'artwork'|'consulting'>,
    { 
      checkPassword: string; 
      attachments: Array<string>;
    }
  >
>