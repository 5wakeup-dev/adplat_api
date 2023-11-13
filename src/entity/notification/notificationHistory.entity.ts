import { isUndeclared } from "src/util/format.util";
import { entriesTypeGuard } from "src/util/index.util";
import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Notification } from "./notification.entity";

@Entity({ name: 'notification_histories' })
export class NotificationHistory {
  @PrimaryGeneratedColumn({ 
    name: 'notificationHistory_id', type: 'bigint' 
  })
  id: string;
  
  @Column({ length: 16 })
  media?: string;
  
  @Column({ length: 32 })
  method?: string;
  
  /** 템플릿 아이디
  */
  @Column({ length: 64, nullable: false })
  templateId?: string;
 
  /** 템플릿 아이디
  */
  @Column({ length: 65535, nullable: false })
  template?: string;
 
  /** 템플릿 데이터(key, val)
 */
  @Column({ type: 'json', nullable: false })
  templateData?: Object;
  
  @Column({ length: 1024 })
  key?: string;
  
  @Column({ length: 512 })
  sended_uk?: string;
  
  @Column({ length: 32 })
  title?: string;
  
  @Column({ length: 65535 })
  content?: string;
  
  @Column({ type: 'json' })
  data?: Object;
  
  @Column({  })
  state?: number
  
  @Column({  })
  reserve_date?: Date;
  
  @CreateDateColumn({ type: 'timestamp', nullable: false })
  reg_date: Date;

  @ManyToOne( () => Notification )
  @JoinColumn({ name: 'notification_id' })
  notification?: Notification;
}

export class NotificationHistoryRes {
  id: string;
  media?: string;
  method?: string;
  templateId?: string;
  template?: string;
  templateData?: Object;
  key?: string;
  sended_uk?: string;
  title?: string;
  content?: string;
  data?: Object;
  state?: number
  reserve_date?: Date;
  reg_date: number;
  constructor(
    his: NotificationHistory
  ){
    // this.id = his.id;
    entriesTypeGuard( his )
    .filter( ([, val]) => !isUndeclared(val) )
    .forEach( ([k, v]) => {
      if( v instanceof Date )
        this[k] = v.getTime()
      else
        this[k] = v;
    })
  }
}