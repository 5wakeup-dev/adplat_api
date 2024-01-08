import { Column, CreateDateColumn, Entity, JoinColumn, JoinTable, ManyToMany, ManyToOne, OneToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { Manager, ManagerRes } from "../member/manager.entity";
import { User, UserRes } from "../member/user.entity";
import { NegativePoint, NegativePointRes } from "./negativePoint.entity";
import { PositivePointRelation } from "./positivePointRelation.entity";

@Entity({name: 'positive_points'})
export class PositivePoint {

  @PrimaryGeneratedColumn({
    name: 'positive_point_id',
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

  @Column({nullable: false})
  remaining: number;

  @Column()
  expires?: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  upt_date?: Date;

  @CreateDateColumn({ type: 'timestamp' })
  reg_date: Date;

  @ManyToMany( () => NegativePoint)
  @JoinTable({
    name: 'negative_histories',
    joinColumn: { name: 'positive_point_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'negative_point_id', referencedColumnName: 'id' }
  })
  histories: Array<NegativePoint>;

  @OneToOne( () => PositivePointRelation, entity => entity.positive)
  relation: PositivePointRelation;
}

export type PositivePointDto = Partial<
  Omit<PositivePoint, 'reg_date'|'histories'|'remaining'|'expires'>
  & { expires: number }
>

export class PositivePointRes {
  id: number;
  title: string;
  price: number;
  remaining: number;
  upt_date?: number;
  reg_date: number;
  histories: Array<NegativePointRes>;
  user?: UserRes;
  manager?: ManagerRes;

  constructor({id, title, price, remaining, upt_date, reg_date, histories, user, manager}: PositivePoint){
    this.id = id;
    this.title = title;
    this.price = price;
    this.remaining = remaining;
    if(upt_date)
      this.upt_date = upt_date.getTime();
    this.reg_date = reg_date.getTime();
    if(histories)
      this.histories = histories.map( his => new NegativePointRes(his) );

    if(user)
      this.user = new UserRes(user);
    if(manager)
      this.manager = new ManagerRes(manager);
  }
}

// export class PositivePointDro {
//   constructor(
//     {}:PositivePoint
//   ){

//   }
// }