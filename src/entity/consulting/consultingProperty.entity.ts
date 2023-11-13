import { Replace } from "src/type/index.type";
import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Consulting, ConsultingDto } from "./consulting.entity";

@Entity({name : 'consulting_properties'})
export class ConsultingProperty {
  @PrimaryGeneratedColumn({
    name: 'consultingProperty_id',
    type: 'bigint'
  })
  id: string;

  @Column({ name: 'consulting_id', nullable: false })
  consultingId: string;

  @ManyToOne( _ => Consulting, entity => entity.properties, { orphanedRowAction: 'delete' })
  @JoinColumn({name: 'consulting_id'})
  consulting?: Consulting

  @Column({ length: 32, nullable: false })
  key: string;

  @Column({ length: 128, nullable: false })
  val: string;
}

export type ConsultingPropertyDto = Partial<
  Replace<
    ConsultingProperty,
    {
      consulting: ConsultingDto
    }
  >
>;
