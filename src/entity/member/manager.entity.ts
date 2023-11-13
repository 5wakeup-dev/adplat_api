import { Replace } from "src/type/index.type";
import { Column, CreateDateColumn, Entity, JoinTable, ManyToMany, OneToMany, OneToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { Role } from "../role/role.entity";
import { ManagerHistory, ManagerHistoryRes } from "./managerHistories.entity";
import { MemberBasic, MemberBasicDto, MemberBasicReq, MemberBasicRes } from "./memberBasic.entity";
import { MemberDeviceToken, MemberDeviceTokenRes } from "./memberDeviceToken.entity";
import { MemberSns } from "./memberSns.entity";

@Entity({ name: 'managers' })
export class Manager {

  @PrimaryGeneratedColumn({ name: 'manager_id', type: 'bigint' })
  id: string;

  @Column({ name: 'uix_manager_uk', length: 64, nullable: false })
  uk: string;

  /** 접속용 아이디
  */
  @Column({ name: 'uix_identity', length: 128, nullable: false })
  identity: string;

  @Column({ length: 512, nullable: false })
  password: string;

  /** 외부에 보여질 회원명
  */
  @Column({ name: 'uix_nickname', length: 32, nullable: true })
  nickname: string;

  /** [ -1: 정지, 0: 휴면, 1: 정상 ]
  */
  @Column({ nullable: false })
  state: number;

  @UpdateDateColumn({ type: 'timestamp' })
  upt_date?: Date;

  @CreateDateColumn({ type: 'timestamp' })
  reg_date: Date;


  @ManyToMany(_ => Role, {eager: true})
  @JoinTable({
    name: 'manager_and_role',
    joinColumn: {name: 'manager_id', referencedColumnName: 'id'},
    inverseJoinColumn: {name: 'role_id', referencedColumnName: 'id'}
  })
  roles: Array<Role>;

  @OneToMany( () => MemberSns, entity => entity.manager )
  sns?: Array<MemberSns>;
  
  type: 'Manager';

  @OneToOne( () => MemberBasic, entity => entity.manager, { cascade: ['insert', 'update'] } )
  basic: MemberBasic;


  @OneToMany( () => ManagerHistory, entity => entity.manager )
  histories?: Array<ManagerHistory>;
  

  @OneToOne( () => MemberDeviceToken, entity => entity.manager, { cascade: ['insert', 'update'] } )
  deviceToken?: MemberDeviceToken;
}


export type ManagerDto = Partial<
  Replace<
    Omit<Manager, 'sns'|'histories'>,
    {
      // roles: Array<Role>;
      basic: MemberBasicDto;
    }
  >
>

export class ManagerRes {
  id: string;
  uk: string
  identity: string
  password: string
  nickname: string
  state: number;
  upt_date?: number;
  reg_date: number;
  
  roles?: Array<string>;
  sns?: Array<string>;
  basic?: MemberBasicRes;
  histories?: Array<ManagerHistoryRes>;


  type: 'Manager';

  deviceToken?: MemberDeviceTokenRes;

  constructor(
    {
      id, uk, identity, nickname, state, 
      upt_date, reg_date,
      roles, sns, basic, histories,
      type,
      deviceToken
    }: Manager
  ) {
    this.id = id;
    this.uk = uk;
    this.identity = identity;
    // this.password = password;
    this.nickname = nickname;
    this.state = state;
    if( upt_date )
      this.upt_date = upt_date.getTime()

    this.reg_date = reg_date.getTime();
    
    if( roles )
      this.roles = roles.map( ({key: rKey}) => rKey);
    if( sns )
      this.sns = sns.map( ({type: sType}) => sType);
    if( basic )
      this.basic = new MemberBasicRes(basic);
  

    if( histories )
      this.histories = histories.map( his => new ManagerHistoryRes(his) );

    this.type = type;

    if(deviceToken) {
      this.deviceToken = new MemberDeviceTokenRes(deviceToken);
    }
  }
}

export type ManagerReq = Partial<
  Replace<
    Omit<ManagerRes, 'type'|'sns'|'histories'|'deviceToken'>, 
    {
      checkPassword: string;
      basic: MemberBasicReq;
    
    }
  >
>