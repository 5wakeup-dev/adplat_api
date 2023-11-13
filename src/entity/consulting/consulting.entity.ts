import { Replace } from "src/type/index.type";
import { Column, CreateDateColumn, Entity, JoinColumn, JoinTable, ManyToMany, ManyToOne, OneToMany, OneToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { Attachment, AttachmentRes } from "../comm/attachment.entity";
import { Manager, ManagerRes } from "../member/manager.entity";
import { User, UserRes } from "../member/user.entity";
import { Menu, MenuRes } from "../menu/menu.entity";
import { ConsultingHierarchical, ConsultingHierarchicalDto, ConsultingHierarchicalRes } from "./consultingHierarchical.entity";
import { ConsultingProperty, ConsultingPropertyDto } from "./consultingProperty.entity";
import { ConsultingRelation, ConsultingRelationDto, ConsultingRelationReq, ConsultingRelationRes } from "./consultingRelation.entity";
import { ConsultingSave, ConsultingSaveDto } from "./consultingSave.entity";

@Entity({ name: 'consultings' })
export class Consulting {
  @PrimaryGeneratedColumn({ name: 'consulting_id', type: 'bigint' })
  id: string;

  @Column({ name: 'uix_consulting_uk', length: 32, nullable: false })
  uk: string;

  @Column({ length: 128 })
  password?: string;

  @Column({ length: 128, nullable: false })
  title: string;

  @Column({ length: 16777215, nullable: false })
  content: string;

  @Column({ length: 16777215, nullable: false })
  search: string;

  @Column({ length: 32, nullable: false })
  writer: string;

  @Column({ nullable: false })
  view: number;

  @Column({ nullable: false })
  reply: number;

  @Column({ nullable: false })
  reactionPositive: number;

  @Column({ nullable: false })
  reactionNegative: number;

  @Column({ name: "is_hidden", nullable: false })
  isHidden: boolean;

  @UpdateDateColumn({ type: 'timestamp' })
  upt_date?: Date;

  @CreateDateColumn({ type: 'timestamp' })
  reg_date: Date;

  @ManyToOne(() => Menu)
  @JoinColumn({ name: 'menu_id', referencedColumnName: 'id' })
  menu?: Menu;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id', referencedColumnName: 'id' })
  user?: User;

  @ManyToOne(() => Manager)
  @JoinColumn({ name: 'manager_id', referencedColumnName: 'id' })
  manager?: Manager;


  @OneToOne(() => ConsultingHierarchical)
  @JoinColumn({ name: 'consulting_id' })
  hierarchical?: ConsultingHierarchical;

  @ManyToMany(() => Attachment)
  @JoinTable({
    name: 'consulting_and_attachment',
    joinColumn: { name: 'consulting_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'attachment_id', referencedColumnName: 'id' }
  })
  attachments?: Array<Attachment>;

  @OneToMany(() => ConsultingProperty, entity => entity.consulting, { orphanedRowAction: 'delete', cascade: ['insert', 'update'] })
  properties?: Array<ConsultingProperty>;

  @OneToMany(
    () => ConsultingSave,
    entity => entity.consulting,
    { orphanedRowAction: 'delete', cascade: ['insert', 'update'] }
  )
  saves?: Array<ConsultingSave>;

  branch?: number;

  @OneToOne(() => ConsultingRelation, entity => entity.self, { cascade: true })
  relation?: ConsultingRelation;


}

export type ConsultingDto = Partial<
  Replace<
    Consulting,
    {
      hierarchical: ConsultingHierarchicalDto;
      properties: Array<ConsultingPropertyDto>;
      saves: Array<ConsultingSaveDto>;
      relation: ConsultingRelationDto;
    }
  >
>;

export class ConsultingRes {
  id: string;
  menu?: MenuRes;
  user?: UserRes;
  manager?: ManagerRes;
  uk: string;
  title: string;
  content: string;
  writer: string;
  view: number;
  reply: number;
  isHidden: boolean;
  reactionPositive: number;
  reactionNegative: number;
  upt_date?: number;
  reg_date: number;

  hierarchical?: ConsultingHierarchicalRes;
  attachments?: Array<AttachmentRes>;
  properties?: Record<string, string>;
  saves: Array<ConsultingSave>
  branch?: number;

  relation?: ConsultingRelationRes;

  constructor({
    id, menu, user, manager, uk,
    title, content, writer, view, reply,
    reactionNegative, reactionPositive,
    upt_date, reg_date, isHidden, saves,
    hierarchical, attachments, properties,
    branch, relation
  }: Consulting) {
    this.id = id;
    if (menu) {
      this.menu = new MenuRes(menu);
    }
    if (user) {
      this.user = new UserRes(user);
    }
    if (manager) {
      this.manager = new ManagerRes(manager);
    }

    this.isHidden = isHidden
    this.uk = uk;
    this.title = title;
    this.content = content;
    this.view = view;
    this.reply = reply;
    this.reactionPositive = reactionPositive;
    this.reactionNegative = reactionNegative;
    if (upt_date) {
      this.upt_date = upt_date.getTime()
    }
    this.reg_date = reg_date.getTime()
    if (hierarchical) {
      this.hierarchical = hierarchical;
    }
    if (attachments) {
      this.attachments = attachments.map(attc => new AttachmentRes(attc));
    }
    if (properties) {
      this.properties = properties.reduce((record, property) => {
        record[property.key] = property.val;
        return record;
      }, {})
    }
    this.branch = branch;
    this.saves = saves
    this.writer = writer;
    if (relation) {
      this.relation = new ConsultingRelationRes(relation);
    }
  }
}

export type ConsultingReq = Partial<
  Replace<
    Omit<ConsultingRes, 'hierarchical' | 'upt_date' | 'reg_date' | 'user' | 'manager'>,
    {
      menu: string;
      attachments: Array<string>;
      password: string;
      relation: ConsultingRelationReq;
      receiverManager: string;
    }
  >
>;