import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Manager } from "../member/manager.entity";
import { User } from "../member/user.entity";


@Entity({ name: 'anythings' })
export class AnythingEntity { 
  @PrimaryGeneratedColumn({ name: 'anything_id', type: 'bigint' })
  id: string;
  
  @Column({ length: 64, nullable: false })
  type: string;
  
  @Column({ nullable: false, type: 'json' })
  data: Object;

  @ManyToOne( () => User )
  @JoinColumn({ name: 'user_id' })
  user?: User;

  @ManyToOne( () => Manager )
  @JoinColumn({ name: 'user_id' })
  manager?: Manager;
}

export type AnythingEntityDto = Partial<
  AnythingEntity
>

export class AnythingRes {
  id: string;
  type: string;
  data: Object;
  constructor(
    { id, type, data }: AnythingEntity
  ){
    this.id = id;
    this.type = type;
    this.data = data;
  }
}

export type anythingReq = Partial<
  AnythingRes
>