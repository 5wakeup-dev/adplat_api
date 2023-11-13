import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { NetAddress } from "../comm/netAddress.entity";
import { Consulting } from "./consulting.entity";

@Entity({ name: 'consulting_views' })
export class ConsultingView {
  @PrimaryGeneratedColumn({ name: 'consultingView_id', type: 'bigint' })
  id: string;

  @ManyToOne(() => Consulting, { nullable: false })
  @JoinColumn({ name: 'consulting_id', referencedColumnName: 'id' })
  consulting?: Consulting;

  @ManyToOne(() => NetAddress, { nullable: false })
  @JoinColumn({ name: 'netAddress_id', referencedColumnName: 'id' })
  netAddress?: NetAddress;

  @CreateDateColumn({ type: 'timestamp' })
  reg_date: Date;
}

// @Entity({ name: 'consulting_and_attachment' })
// export class ConsultingAttachment {
//   @PrimaryGeneratedColumn({ name: 'consultingAttachment_id', type: 'bigint' })
//   id: string;

//   @Column({ name: 'consulting_id' })
//   consultingId: string;

//   @Column({ name: 'attachment_id' })
//   attachmentId: string;

//   @Column({ nullable: false })
//   ord: number;
// }

// export type ConsultingAttachmentDto = Partial<ConsultingAttachment>;