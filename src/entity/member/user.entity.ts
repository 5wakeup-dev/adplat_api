import { Replace } from "src/type/index.type";
import { Column, CreateDateColumn, Entity, JoinTable, ManyToMany, OneToMany, OneToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { Role } from "../role/role.entity";
import { MemberBasic, MemberBasicDto, MemberBasicReq, MemberBasicRes } from "./memberBasic.entity";
import { MemberDeviceToken, MemberDeviceTokenDto, MemberDeviceTokenRes } from "./memberDeviceToken.entity";
import { MemberSns } from "./memberSns.entity";
import { UserHistory, UserHistoryRes } from "./userHistory.entity";

@Entity({ name: 'users' })
export class User {
  @PrimaryGeneratedColumn({ name: 'user_id', type: 'bigint' })
  id: string;

  @Column({ name: 'uix_user_uk', length: 128, nullable: false })
  uk: string

  @Column({ name: 'uix_identity', length: 128, nullable: false })
  identity: string

  @Column({ length: 512, nullable: false })
  password: string

  @Column({ name: 'uix_nickname', length: 512, nullable: true })
  nickname: string

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
    name: 'user_and_role',
    joinColumn: {name: 'user_id', referencedColumnName: 'id'},
    inverseJoinColumn: {name: 'role_id', referencedColumnName: 'id'}
  })
  roles: Array<Role>;

  @OneToMany(() => MemberSns, entity => entity.user)
  sns?: Array<MemberSns>;

  type: 'User';

  @OneToOne( () => MemberBasic, entity => entity.user, { cascade: ['insert', 'update'] } )
  basic: MemberBasic;

  @OneToMany( () => UserHistory, entity => entity.user)
  histories?: Array<UserHistory>;


  @OneToOne( () => MemberDeviceToken, entity => entity.user, { cascade: ['insert', 'update'] } )
  deviceToken?: MemberDeviceToken;
}

export type UserDto = Partial<
  Replace<
    Omit<User, 'sns'|'histories'>,
    {
      // roles: Array<RoleDto>;
      basic: MemberBasicDto;
      // deviceToken: MemberDeviceTokenDto;
    }
  >
>

export class UserRes {
  id: string;
  uk: string
  identity: string
  nickname: string
  state: number;
  upt_date: number;
  reg_date: number;
  
  roles?: Array<string>;
  sns?: Array<string>;
  basic?: MemberBasicRes;
  histories?: Array<UserHistoryRes>;

  type: 'User';

  deviceToken?: MemberDeviceTokenRes;

  constructor(
    {
      id, uk, identity, nickname, state, 
      upt_date, reg_date,
      sns, roles, basic, histories,
      type,
      deviceToken
    }: User
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
      
    if( histories && histories.length > 0 )
      this.histories = histories.map( his => new UserHistoryRes(his) );

    this.type = type;

    if(deviceToken) {
      this.deviceToken = new MemberDeviceTokenRes(deviceToken);
    }
  }
}

export type UserReq = Partial<
  Replace<
    Omit<UserRes, 'type'|'sns'|'his'|'deviceToken'>,
    {
      checkPassword: string;
      password: string;
      basic: MemberBasicReq;
    }
  >
>