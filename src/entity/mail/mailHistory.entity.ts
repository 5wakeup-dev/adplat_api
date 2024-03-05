import { Replace } from "src/type/index.type";
import { SearchPage } from "src/util/entity/listPage";
import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Manager, ManagerRes } from "../member/manager.entity";


@Entity({ name: 'mail_histories' })
export class MailHistory {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string

  @Column({ name: "sender_type", length: 12, nullable: false })
  senderType: string; //system,manager,root

  @Column({ length: 64, nullable: true })
  receiver: string; // 받는이(이름)

  @Column({ length: 256, nullable: false })
  title: string;

  @Column({ length: 256, nullable: true })
  address: string; // 주소

  @Column({ nullable: false })
  content: string;

  @CreateDateColumn({name:"reg_date", type: 'timestamp', nullable: false })
  regDate: Date;

}

export type MailHistoryReq = Partial<MailHistory>

export class MailHistoryRes {
  id: string
  title: string;
  receiver?: string;
  senderType: string;
  address: string;
  content: string;
  regDate: number;

  constructor(
    {
      address,content,id,receiver,regDate,senderType,title
    }: MailHistory
  ) {
    this.id = id
    this.title = title
    this.content = content
    this.address = address;
    if (receiver) this.receiver = receiver;
    this.senderType = senderType;
    this.regDate = regDate.getTime()

  }

}
export type SearchMailDto = Partial<{
  id: string;
  ids: Array<number>;
  managerUk: string;
  externalUk:string;
  type: string;
  sender: string;
  receiver: string;
  address: string;
  targetDate: Date;

} & SearchPage>;