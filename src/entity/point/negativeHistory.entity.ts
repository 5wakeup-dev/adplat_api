
import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { NegativePoint } from "./negativePoint.entity";
import { PositivePoint } from "./positivePoint.entity";

@Entity({name: 'negative_histories'})
export class NegativeHistory {

  @PrimaryGeneratedColumn({
    name: 'negative_histories_id',
    type: 'bigint'
  })
  id: number;

  @Column({nullable: false})
  price: number;


  @ManyToOne(() => PositivePoint)
  @JoinColumn({ name: 'positive_point_id', referencedColumnName: 'id' })
  positivePoint: PositivePoint;

  @ManyToOne( () => NegativePoint, entity => entity.negativeHistories, {orphanedRowAction: 'delete'})
  @JoinColumn({ name: 'negative_point_id'})
  negativePoint?: NegativePoint;
}

export type NegativeHistoryDto = Partial<Omit<NegativeHistory, 'id'>>;