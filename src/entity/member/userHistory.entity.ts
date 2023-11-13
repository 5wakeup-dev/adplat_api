import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { User } from "./user.entity";

@Entity({ name: 'user_histories' })
export class UserHistory {
  @PrimaryGeneratedColumn({ name: 'userHistory_id', type: 'bigint' })
  id: string;
  
  @Column({ length: 512,  })
  password?: string;
  
  @Column({ length: 128,  })
  identity?: string;
  
  @Column({ length: 32,  })
  nickname?: string;
  
  @Column({  })
  state?: number;
  
  @Column({ nullable: false })
  reg_date: Date;


  @ManyToOne( () => User, entity => entity.histories )
  @JoinColumn({ name: 'user_id' })
  user?: User;
  
}

export type UserHistoryDto = Partial<UserHistory>;

export class UserHistoryRes {
  id: string;
  // password?: string;
  identity?: string;
  nickname?: string;
  state?: number;
  reg_date: number;

  constructor(
    {
      id, identity, nickname, state, 
      reg_date
    }: UserHistory
  ){
    this.id = id;
    // this.password = password;
    this.identity = identity;
    this.nickname = nickname;
    this.state = state;
    if( reg_date )
      this.reg_date = reg_date.getTime();
  }
}