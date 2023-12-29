import { Replace } from "src/type/index.type";
import { Column, CreateDateColumn, Entity, JoinColumn, OneToMany, OneToOne, PrimaryGeneratedColumn } from "typeorm";
import { StoreMemo, StoreMemoReq, StoreMemoRes } from "./storeMemo.entity";
import { User } from "./user.entity";
import { Attachment, AttachmentRes } from "../comm/attachment.entity";

@Entity({ name: 'stores' })
export class Store {

  @PrimaryGeneratedColumn({ name: 'user_id', type: 'bigint' })
  id: string;

  /** 사업자명
*/
  @Column({ nullable: false })
  business: string;

  /** 사업자번호
  */
  @Column({ name: 'business_number', nullable: false })
  businessNumber: string;


  /** 대표자
  */
  @Column({ nullable: true })
  ceo: string;


  /** 주소1
  */
  @Column({ nullable: true })
  address1: string;

  /** 주소2(나머지 주소)
  */
  @Column({ nullable: true })
  address2: string;


  @Column({ nullable: true })
  email: string;

  @Column({ nullable: true })
  tel: string;

  @Column({ nullable: true })
  url: string;

  @Column({ name: "reject_memo", nullable: true })
  rejectMemo: string;

  /** [-2:정지, -1:반려,0:신청,1:정상,2:탈퇴대기 ]
  */
  @Column({ nullable: false })
  state: number;

  @OneToOne(() => Attachment)
  @JoinColumn({ name: 'attachment_id' })
  attachment?: Attachment;

  @OneToMany(() => StoreMemo, entity => entity.store, { cascade: ["insert", "update", "remove"] })
  storeMemo?: Array<StoreMemo>;

  @OneToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user?: User;

  @CreateDateColumn({ name: "reg_date", type: 'timestamp' })
  regDate: Date;


  @Column({ name: "apply_date", type: 'timestamp' })
  applyDate: Date;

}

export type StoreDto = Partial<Store>;


export class StoreRes {
  id: string;
  address1: string
  address2: string
  business: string
  businessNumber: string
  ceo: string
  email: string
  state: number
  tel: string
  url: string
  rejectMemo: string;
  storeMemo?: Array<StoreMemoRes>;
  attachment?: AttachmentRes;
  applyDate: number;
  regDate: number;
  constructor(
    { storeMemo, attachment, rejectMemo, applyDate, regDate,
      id, address1, address2, business, businessNumber, ceo, email, state, tel, url,
    }: Store
  ) {
    this.id = id;
    this.address1 = address1;
    this.address2 = address2;
    this.business = business
    this.businessNumber = businessNumber;
    this.ceo = ceo;
    this.email = email;
    this.state = state;
    this.tel = tel;
    this.url = url
    this.rejectMemo = rejectMemo
    if(regDate)
    this.regDate = regDate.getTime()
    if (applyDate) this.applyDate = applyDate.getTime()
    if (attachment) this.attachment = new AttachmentRes(attachment)
    if (storeMemo) this.storeMemo = storeMemo.map(s => new StoreMemoRes(s))

  }
}

export type StoreReq = Partial<
  Replace<
    Omit<StoreRes, 'storeMemo'>,
    {
      attachment: string
      applyDate:number;
      storeMemo: Array<StoreMemoReq>
    }
  >
>