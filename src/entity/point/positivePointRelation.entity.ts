import { Column, Entity, JoinColumn, ManyToOne, OneToOne, PrimaryColumn } from "typeorm";
import { Artwork } from "../artwork/artwork.entity";
import { Consulting } from "../consulting/consulting.entity";
import { Manager } from "../member/manager.entity";
import { User } from "../member/user.entity";
import { PositivePoint } from "./positivePoint.entity";

@Entity({ name: 'positive_point_relations'})
export class PositivePointRelation {
  @PrimaryColumn({ 
    name: 'positive_point_id', type: 'bigint' 
  })
  id: number;

  @OneToOne( () => PositivePoint , entity => entity.relation)
  @JoinColumn({
    name: 'positive_point_id',
    referencedColumnName: 'id'
  })
  positive: PositivePoint;

  @Column({ length: 128, nullable: false })
  type: string;


  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id', referencedColumnName: 'id' })
  user?: User;

  @ManyToOne(() => Manager)
  @JoinColumn({ name: 'manager_id', referencedColumnName: 'id' })
  manager?: Manager;

  @ManyToOne( () => Consulting)
  @JoinColumn({ name: 'consulting_id' })
  consulting?: Consulting;

}
