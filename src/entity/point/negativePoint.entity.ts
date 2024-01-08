import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToMany, OneToOne, PrimaryColumn, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { Manager, ManagerRes } from "../member/manager.entity";
import { User, UserRes} from "../member/user.entity";
import { NegativeHistory } from "./negativeHistory.entity";
import { NegativePointRelation } from "./negativePointRelation.entity";

@Entity({name: 'negative_points'})
export class NegativePoint {

  @PrimaryGeneratedColumn({
    name: 'negative_point_id',
    type: 'bigint'
  })
  id: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id', referencedColumnName: 'id' })
  user?: User;

  @ManyToOne(() => Manager)
  @JoinColumn({ name: 'manager_id', referencedColumnName: 'id' })
  manager?: Manager;


  @Column({length: 128, nullable: false})
  title: string;

  @Column({nullable: false})
  price: number;


  @UpdateDateColumn({ type: 'timestamp' })
  upt_date?: Date;

  @CreateDateColumn({ type: 'timestamp'})
  reg_date: Date;
  @OneToMany(() => NegativeHistory, entity => entity.negativePoint, { orphanedRowAction: 'delete', cascade: ['insert', 'update'] })
  negativeHistories?: Array<NegativeHistory>

  @Column({ name: 'cancel_id' })
  cancelId?: number;


  @OneToOne( () => NegativePointRelation, entity => entity.negative)
  relation: NegativePointRelation;
  
}

export type NegativePointDto = Partial<
  Omit<NegativePoint, 'histories'|'reg_date'>
>

// export type NegativePointDro = Omit<NegativePoint, 'reg_date'|'histories'>
//   & {
//     member: PositivePointMember
//   }

export class NegativePointRes {
  id: number;
  title: string;
  price: number;
  reg_date: number;
  user?: UserRes;
  manager?: ManagerRes;

  constructor({id, title, price, reg_date, user, manager }: NegativePoint){
    this.id = id;
    this.title = title;
    this.price = price;
    this.reg_date = reg_date.getTime();

    if(user)
      this.user = new UserRes(user);
    if(manager)
      this.manager = new ManagerRes(manager);
  }
}