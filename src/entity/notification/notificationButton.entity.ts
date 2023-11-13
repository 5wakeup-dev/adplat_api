import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Notification } from "./notification.entity";

@Entity({ name: 'notification_buttons' })
export class NotificationButton {
  @PrimaryGeneratedColumn({ 
    name: 'notificationData_id', type: 'bigint' 
  })
  id: string;
  
  @Column({ length: 16, nullable: false })
  title: string;
  
  @Column({ length: 1024 })
  link: string;

  @Column({ length: 128 })
  androidScheme: string;

  @Column({ length: 1024 })
  iosScheme: string;
  
  @ManyToOne( () => Notification )
  @JoinColumn({ name: 'notification_id' })
  notification?: Notification;
}

export type NotificationButtonDto = Partial<NotificationButton>;

export class NotificationButtonRes {
  id: string;
  title: string;
  link: string;
  androidScheme: string;
  iosScheme: string;

  constructor(
    {
      id, title, link, androidScheme, iosScheme
    }: NotificationButton
  ){
    this.id = id;
    this.title = title;
    this.link = link;
    this.androidScheme = androidScheme;
    this.iosScheme = iosScheme;
  }
}

export type NotificationButtonReq = Partial<NotificationButtonRes>