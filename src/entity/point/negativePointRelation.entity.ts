import { Column, Entity, JoinColumn, OneToOne, PrimaryColumn } from "typeorm";
import { NegativePoint } from "./negativePoint.entity";


@Entity({ name: 'negative_point_relations' })
export class NegativePointRelation {

  @PrimaryColumn({ name: 'negative_point_id', type: 'bigint' })
  id: number;

  @OneToOne( () => NegativePoint, entity => entity.relation)
  @JoinColumn({
    name: 'negative_point_id',
    referencedColumnName: 'id'
  })
  negative: NegativePoint;

  @Column({ length: 128, nullable: false })
  type: string;

}