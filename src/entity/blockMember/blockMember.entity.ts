import { Replace } from "src/type/index.type";
import { Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Manager, ManagerRes } from "../member/manager.entity";
import { User, UserRes } from "../member/user.entity";

@Entity({ name: 'block_members' })
export class BlockMember {
  @PrimaryGeneratedColumn({
    name: 'blockMember_id',
    type: 'bigint'
  })
  id: string;

  @ManyToOne(() => Manager)
  @JoinColumn({name: 'manager_id'})
  manager?: Manager;

  @ManyToOne(() => User)
  @JoinColumn({name: 'user_id'})
  user?: User;

  @ManyToOne(() => Manager)
  @JoinColumn({name: 'blockManager_id'})
  blockManager?: Manager;

  @ManyToOne(() => User)
  @JoinColumn({name: 'blockUser_id'})
  blockUser?: User;
}

export type BlockMemberDto = Partial<BlockMember>;

export class BlockMemberRes {
  id: string;
  manager?: ManagerRes;
  user?: UserRes;
  blockManager?: ManagerRes;
  blockUser?: UserRes;

  constructor({
    id, manager, user, blockManager, blockUser
  }: BlockMember) {
    this.id = id;
    if(manager) {
      this.manager = new ManagerRes(manager);
    }
    if(user) {
      this.user = new UserRes(user);
    }
    if(blockManager) {
      this.blockManager = new ManagerRes(blockManager);
    }
    if(blockUser) {
      this.blockUser = new UserRes(blockUser);
    }
  }
}

export type BlockMemberReq = Partial<
  Replace<BlockMemberRes, {
    blockManager: string;
    blockUser: string;
  }>
>;