import { Replace } from "src/type/index.type";
import { Column, CreateDateColumn, Entity, JoinColumn, JoinTable, ManyToMany, ManyToOne, OneToMany, OneToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { Attachment, AttachmentRes } from "../comm/attachment.entity";
import { Manager, ManagerRes } from "../member/manager.entity";
import { User, UserRes } from "../member/user.entity";
import { NotificationButton, NotificationButtonDto, NotificationButtonReq, NotificationButtonRes } from "./notificationButton.entity";
import { NotificationError, NotificationErrorRes } from "./notificationError.entity";
import { NotificationHistory, NotificationHistoryRes } from "./notificationHistory.entity";
import { NotificationRelation, NotificationRelationDto, NotificationRelationReq, NotificationRelationRes } from "./notificationRelation.entity";


@Entity({ name: 'notifications' })
export class Notification {
  @PrimaryGeneratedColumn({ name: 'notification_id', type: 'bigint' })
  id: string;

  @Column({ name: 'uix_notification_uk', length: 32, nullable: false })
  uk: string;
  
  /** [ SYSTEM: 자동 생성, SOURCE: 발신자 ]
  */
  @Column({ length: 32, nullable: false })
  creator: string;
  
  /** [ TOUR-*: 투어 관련, NOTIFICATION: 공지 관련, MEMO-*: 메모 알림, AUTH-*: 계정 정보 관련 ]
  */
  @Column({ length: 32, nullable: false })
  type: string;
  
  /** [ KAKAO: 카카오, SMS: 문자, EMAIL: 이메일 ]
  */
  @Column({ length: 16, nullable: false })
  media: string;
  
  /** 매체의 따른 방식명
  */
  @Column({ length: 32, nullable: false })
  method: string;

  /** 종착지
  */
  @Column({ length: 1024, nullable: false })
  key: string;

  /** 템플릿 아이디
  */
  @Column({ length: 64, nullable: false })
  templateId: string;

  /** 템플릿 아이디
  */
  @Column({ length: 65535, nullable: false })
  template: string;

  /** 템플릿 데이터(key, val)
  */
  @Column({ type: 'json', nullable: false })
  templateData: Object;
  
  
  /** 발송 후 키
  */
  @Column({ length: 512,  })
  sended_uk?: string;
  
  /** 수신자 명
  */
  @Column({ length: 32, nullable: false })
  receiverName: string;
  
  @Column({ length: 64, nullable: false })
  title: string;
  
  @Column({ length: 65535, nullable: false })
  content: string;
  
  @Column({ type: 'json' })
  data?: Object;
  
  /** [ -2: 수신거부, -1: 발송 실패, 0: 준비중, 1: 발송 요청, 2: 발송중, 3: 발송완료 ]
  */
  @Column({ nullable: false })
  state: number;
  
  @Column({  })
  reserve_date?: Date;

  @Column({
    length: 512
  })
  relationUk: string;
  
  @UpdateDateColumn({ type: 'timestamp' })
  upt_date?: Date;
  
  @CreateDateColumn({ type: 'timestamp', nullable: false })
  reg_date: Date;
  

  @ManyToOne( () => Manager )
  @JoinColumn({ name: 'manager_id' })
  manager?: Manager;

  @ManyToOne( () => Manager )
  @JoinColumn({ name: 'receiverManager_id' })
  receiverManager?: Manager;
  
  @ManyToOne( () => User )
  @JoinColumn({ name: 'receiverUser_id' })
  receiverUser?: User;
  
  // @Column({  })
  // receiverContractor_id?: string;

  @ManyToMany( () => Attachment )
  @JoinTable({
    name: 'notification_and_attachment',
    joinColumn: { name: 'notification_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'attachment_id', referencedColumnName: 'id' }
  })
  attachments?: Array<Attachment>;

  @OneToMany( () => NotificationHistory, entity => entity.notification )
  histories?: Array<NotificationHistory>;

  @OneToMany( () => NotificationButton, entity => entity.notification, { orphanedRowAction: 'delete', cascade: [ 'insert', 'update' ] } )
  buttons?: Array<NotificationButton>;

  @OneToMany( () => NotificationError, entity => entity.notification )
  errors?: Array<NotificationError>;

  @OneToOne(() => NotificationRelation, entity => entity.notification, { orphanedRowAction: 'delete', cascade: [ 'insert', 'update' ] })
  relation?: NotificationRelation
}

// export type NotificationDto = Partial<Notification>;

export type NotificationDto = Partial<
  Replace<
    Omit<Notification, 'upt_date'|'reg_date'|'errors'|'histories'>, {
      attachments: Array<Attachment>;
      buttons: Array<NotificationButtonDto>;
      relation: NotificationRelationDto;
    }
  >
>

export class NotificationRes {
  id: string;
  uk: string;
  creator: string;
  type: string;
  media: string;
  method: string;
  key: string;
  templateId: string;
  template: string;
  templateData: Object;
  sended_uk?: string;
  receiverName: string;
  title: string;
  content: string;
  data?: Object;
  state: number;
  reserve_date?: number;
  relationUk: string;
  upt_date?: number;
  reg_date: number;

  manager?: ManagerRes;
  receiverManager?: ManagerRes;
  receiverUser?: UserRes;
  attachments?: Array<AttachmentRes>;
  histories?: Array<NotificationHistoryRes>;
  buttons?: Array<NotificationButtonRes>;
  errors?: Array<NotificationErrorRes>;
  relation?: NotificationRelationRes;

  constructor(
    {
      id, uk, creator, type, media, method, key, 
      templateId, template, templateData, 
      sended_uk, receiverName, title, content, 
      data, state, reserve_date, upt_date, reg_date, 

      manager, receiverManager, receiverUser, attachments, histories, buttons, errors, relation, relationUk
    }: Notification
  ){
    this.id = id;
    this.uk = uk;
    this.creator = creator;
    this.type = type;
    this.media = media;
    this.method = method;
    this.key = key;
    this.templateId = templateId;
    this.template = template;
    this.templateData = templateData;
    this.sended_uk = sended_uk;
    this.receiverName = receiverName;
    this.title = title;
    this.content = content;
    this.data = data;
    this.state = state;
    if( reserve_date )
      this.reserve_date = reserve_date.getTime();
    this.relationUk = relationUk;
    if( upt_date )
      this.upt_date = upt_date.getTime();
    
    this.reg_date = reg_date.getTime();

    if( manager )
      this.manager = new ManagerRes(manager);
    if( receiverManager )
      this.receiverManager = new ManagerRes(receiverManager);
    if( receiverUser )
      this.receiverUser = new UserRes(receiverUser)
    if( attachments )
      this.attachments = attachments.map( attc => new AttachmentRes(attc) );
    if( histories )
      this.histories = histories.map( his => new NotificationHistoryRes(his) );
    if( buttons )
      this.buttons = buttons.map( btn => new NotificationButtonRes(btn) );
    if( errors )
      this.errors = errors.map( err => new NotificationErrorRes(err) );

    if(relation) {
      this.relation = new NotificationRelationRes(relation);
    }
  }
}

export type NotificationReq = Partial<
  Replace<
    Omit<NotificationRes, 'upt_date'|'reg_date'|'manager'|'errors'|'histories'>, {
      reserve_date: number;
      attachments: Array<string>;
      receiverManager: string;
      receiverUser: string;
      buttons: Array<NotificationButtonReq>;
      relation: NotificationRelationReq;
    }
  >
>