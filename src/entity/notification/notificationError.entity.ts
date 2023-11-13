import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Notification } from "./notification.entity";

@Entity({ name: 'notification_errors'})
export class NotificationError {
  @PrimaryGeneratedColumn({ name: 'notificationError_id', type: 'bigint' })
  id: string;
  
  @Column({ length: 32, nullable: false })
  type: string;
  
  @Column({ length: 16, nullable: false })
  media: string;
  
  @Column({ length: 32, nullable: false })
  method: string;
  
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
  
  @Column({ length: 512,  })
  sended_uk?: string;
  
  @Column({ length: 32, nullable: false })
  title: string;
  
  @Column({ length: 65535, nullable: false })
  content: string;
  
  @Column({ type: 'json' })
  data?: Object;
  
  @Column({ length: 64, nullable: false })
  errorTitle: string;
  
  @Column({ length: 65535, nullable: false })
  error: string;
  
  @CreateDateColumn({ type: 'timestamp', nullable: false })
  reg_date: Date;

  @ManyToOne( () => Notification )
  @JoinColumn({ name: 'notification_id' })
  notification?: Notification;
}

export class NotificationErrorRes {
  id: string;
  type: string;
  media: string;
  method: string;
  key: string;
  templateId: string;
  template: string;
  templateData: Object;
  sended_uk?: string;
  title: string;
  content: string;
  data?: Object;
  errorTitle: string;
  error: string;
  reg_date: number;
  constructor(
    {
      id, type, media, method, key, templateId, template, templateData, 
      sended_uk, title, content, data, errorTitle, error, 
      reg_date
    }: NotificationError
  ){
    this.id = id;
    this.type = type;
    this.media = media;
    this.method = method;
    this.key = key;
    this.templateId = templateId;
    this.template = template;
    this.templateData = templateData;
    this.sended_uk = sended_uk;
    this.title = title;
    this.content = content;
    this.data = data;
    this.errorTitle = errorTitle;
    this.error = error;
    this.reg_date = reg_date.getTime();
  }
}