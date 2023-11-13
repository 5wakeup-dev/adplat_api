import { Replace } from "src/type/index.type";
import { SearchPage } from "src/util/entity/listPage";
import { Column, CreateDateColumn, Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { Manager, ManagerRes } from "./manager.entity";
import { User, UserRes } from "./user.entity";


@Entity({
  name: 'member_deviceTokens'
})
export class MemberDeviceToken {
  @PrimaryGeneratedColumn({
    name: 'memberDeviceToken_id',
    type: 'bigint'
  })
  id: string;

  @OneToOne( () => User, entity => entity.deviceToken )
  @JoinColumn({ name: 'user_id' })
  user?: User;

  @OneToOne( () => Manager, entity => entity.deviceToken )
  @JoinColumn({ name: 'manager_id' })
  manager?: Manager;

  @Column({length: 512})
  device: string;

  @Column({length: 512})
  token: string;

  @UpdateDateColumn({ type: 'timestamp' })
  upt_date?: Date;

  @CreateDateColumn({type: 'timestamp'})
  reg_date: Date;
}

export type MemberDeviceTokenDto = Partial<MemberDeviceToken>;

export class MemberDeviceTokenRes {
  id: string;
  manager?: ManagerRes;
  user?: UserRes;
  device: string;
  token: string;
  upt_date?: number;
  reg_date: number;

  constructor({
    id, manager, user, device, token,
    upt_date, reg_date
  }: MemberDeviceToken) {
    this.id = id;
    if(manager) {
      this.manager = new ManagerRes(manager);
    }
    if(user) {
      this.user = new UserRes(user);
    }
    this.device = device;
    this.token = token;
    if(upt_date) {
      this.upt_date = upt_date.getTime();
    }
    this.reg_date = reg_date.getTime();
  }
}

export type MemberDeviceTokenReq = Partial<
  Omit<MemberDeviceToken, 'upt_date'|'reg_date'|'manager'|'user'>
>;

export type SearchDeviceTokenDto = Partial<{
  memberUk: string;
  token: string;
  device: string;
} & SearchPage>;