import { Replace } from "src/type/index.type";
import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Consulting, ConsultingDto } from "./consulting.entity";
import { NetAddress } from "../comm/netAddress.entity";

@Entity({ name: 'consulting_saves' })
export class ConsultingSave {
  @PrimaryGeneratedColumn({
    name: 'consultingSave_id',
    type: 'bigint'
  })
  id: number;

  @Column({ name: 'consulting_id', nullable: false })
  consultingId: string;

  @ManyToOne(() => Consulting, { nullable: false })
  @JoinColumn({ name: 'consulting_id', referencedColumnName: 'id' })
  consulting?: Consulting;

  @Column({ name: 'netAddress_id', nullable: false })
  netAddressId: string;

  @ManyToOne(() => NetAddress, { nullable: false })
  @JoinColumn({ name: 'netAddress_id', referencedColumnName: 'id' })
  netAddress?: NetAddress;

  
  @CreateDateColumn({ type: 'timestamp' })
  reg_date: Date;
}

export type ConsultingSaveDto = Partial<
  Replace<
    ConsultingSave,
    {
      consulting: ConsultingDto
    }
  >
>;