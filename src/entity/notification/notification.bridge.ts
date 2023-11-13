import { Column, Entity, PrimaryColumn } from "typeorm";

@Entity({ name: 'notification_and_attachment'})
export class NotificationAttachment {
  @PrimaryColumn({ name: 'notification_id', type: 'bigint' })
  notificationId: bigint;

  @PrimaryColumn({ length: 32, nullable: false })
  attachmentId: string;

  @Column({ nullable: false })
  ord: number;

}