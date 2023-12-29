import { Replace } from "src/type/index.type";
import { Column, CreateDateColumn, Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { Attachment, AttachmentRes } from "../comm/attachment.entity";
import { Manager } from "./manager.entity";
import { User } from "./user.entity";

@Entity({ name: 'member_basics' })
export class MemberBasic {
  @PrimaryGeneratedColumn({ 
    name: 'memberBasic_id', type: 'bigint' 
  })
  id: string;
  
  // @Column({  })
  // userOrManager?: string
  
  @Column({ length: 32, nullable: false })
  tel: string;
  
  @Column({ length: 128, nullable: false })
  email: string;
  
  @Column({ length: 128 })
  primaryAddress?: string;
  
  @Column({ length: 64 })
  secondaryAddress?: string;
  
  @Column({ length: 32, nullable: false })
  name: string;
  
  /** [ 1: male, 2: female ]
  */
  @Column({  })
  gender?: number;
  
  /** 4자리 고정
  */
  @Column({  })
  year?: number;
  
  @Column({  })
  birth?: Date;
  
  /** 알림 허용
  */
  @Column({ nullable: false })
  allowNotification: boolean;

  @Column({ length: 1024 })
  memo: string;

  // @Column({ length: 512 })
  // connectingInfo: string;


  @Column({ length: 256 })
  withdrawalReason: string;

  @UpdateDateColumn({ type: 'timestamp' })
  upt_date?: Date;
  
  @CreateDateColumn({ type: 'timestamp' })
  reg_date: Date;
  

  @OneToOne( () => User, entity => entity.basic )
  @JoinColumn({ name: 'user_id' })
  user?: User;

  @OneToOne( () => Manager, entity => entity.basic )
  @JoinColumn({ name: 'manager_id' })
  manager?: Manager;

  @OneToOne( () => Attachment )
  @JoinColumn({ name: 'attachmentProfile_id'})
  attachmentProfile?: Attachment;
}

export type MemberBasicDto = Partial<
  MemberBasic
>

export class MemberBasicRes {
  id: string;
  tel: string;
  email: string;
  primaryAddress?: string;
  secondaryAddress?: string;
  name: string;
  gender?: number;
  year?: number;
  birth?: number;
  allowNotification: boolean;
  memo?: string;
  withdrawalReason: string;
  upt_date?: number;
  reg_date: number;
  attachmentProfile?: AttachmentRes;

  constructor(
    {
      id, tel, email, primaryAddress, secondaryAddress, 
      name, gender, year, birth, 
      allowNotification, memo,
      upt_date, reg_date, 
      attachmentProfile,
     withdrawalReason
    }: MemberBasic
  ){
    this.id = id;
    this.tel = tel;
    this.email = email;
    if( primaryAddress )
      this.primaryAddress = primaryAddress;
    if( secondaryAddress )
      this.secondaryAddress = secondaryAddress;
    this.name = name;
    this.gender = gender;
    this.year = year;
    if( birth )
      this.birth = birth.getTime();
    this.allowNotification = allowNotification;
    this.memo = memo;

    this.withdrawalReason = withdrawalReason;
    if( upt_date )
      this.upt_date = upt_date.getTime();
    if( reg_date )
      this.reg_date = reg_date.getTime();
    if( attachmentProfile )
      this.attachmentProfile = new AttachmentRes(attachmentProfile);
  }
}

export type MemberBasicReq = Partial<
  Replace< 
    MemberBasicRes,
    {
      attachmentProfile: string
    }
  >
>