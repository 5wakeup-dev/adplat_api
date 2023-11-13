import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { Manager } from "./manager.entity";
import { User } from "./user.entity";

@Entity({ name: 'member_sns' })
export class MemberSns {
  @PrimaryGeneratedColumn({
    name: 'memberSns_id',
    type: 'bigint'
  })
  id: string;

  @Column({ name: 'uix_sns_uk', length: 256, unique: true, nullable: false })
  uk: string;

  @Column({length: 16, nullable: false})
  type: string;

  @Column({length: 512, nullable: false})
  accessToken: string;

  @UpdateDateColumn({type: 'timestamp'})
  upt_date?: Date;

  @CreateDateColumn({type: 'timestamp'})
  reg_date: Date;

  @ManyToOne( () => User, entity => entity.sns )
  @JoinColumn({name: 'user_id'})
  user?: User;

  @ManyToOne( () => Manager, entity => entity.sns )
  @JoinColumn({name: 'manager_id'})
  manager?: Manager;
}

export type MemberSnsDto = Partial<MemberSns>

// export class UserSnsRes {
//   id: string;
//   uk: string;
//   type: string;
//   accessToken: string;
//   upt_date?: number;
//   reg_date: number;

//   constructor(
//     {}: UserSns
//   ){

//   }
// }