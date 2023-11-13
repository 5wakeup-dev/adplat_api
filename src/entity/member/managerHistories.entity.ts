import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Manager } from "./manager.entity";

@Entity({ name: 'manager_histories' })
export class ManagerHistory {
  @PrimaryGeneratedColumn({ name: 'managerHistory_id', type: 'bigint' })
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


  @ManyToOne( () => Manager, entity => entity.histories )
  @JoinColumn({ name: 'manager_id' })
  manager?: Manager;
  
}

export type ManagerHistoryDto = Partial<ManagerHistory>;

export class ManagerHistoryRes {
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
    }: ManagerHistory
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