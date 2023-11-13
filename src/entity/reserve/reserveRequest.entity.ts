import { Range, Replace } from "src/type/index.type";
import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";

import { SearchPage } from "src/util/entity/listPage";

@Entity({ name: 'reserve_requests' })
export class ReserveRequest {
  @PrimaryGeneratedColumn({
    name: 'reserve_request_id', type: 'bigint'
  })
  id: string;

  @Column({ nullable: false })
  uk: string;

  @Column({ nullable: false })
  business: string;

  @Column({ length: 128, nullable: false })
  name: string;

  @Column({ length: 32, nullable: true })
  tel: string;

  @Column({ length: 128, nullable: true })
  email: string;

  @Column({ length: 32, nullable: false })
  source: string;

  @Column({ nullable: true })
  content: string;

  @Column({ nullable: false })
  state: number;

  @CreateDateColumn({ name: "reg_date", type: 'timestamp' })
  regDate: Date;

}

export type ReserveRequestDto = Partial<
  Replace<ReserveRequest, {}>
>;

export class ReserveRequestRes {
  id: string;
  uk: string;
  name: string;
  business: string;
  email: string;
  tel: string;
  content: string;
  source: string;
  state: number;
  regDate?: number;

  constructor({
    id, content, business, email, source,
    name, regDate, state, tel, uk
  }: ReserveRequest) {
    this.id = id;
    this.email = email;
    this.business = business
    this.source = source;
    this.name = name;
    this.content = content
    if (tel) this.tel = tel;
    this.uk = uk;
    this.state = state;
    if (regDate) {
      this.regDate = regDate.getTime();
    }
  }
}

export type ReserveRequestReq = Partial<
  Replace<Omit<ReserveRequestRes, 'reg_date'>, {
  }>
>;

export type SearchReserveDto = Partial<{
  uk: string;
  uks: Array<string>;
  name: string;
  tel: string
  id: string;
  email: string
  state: number;
  // state: Array<number>;

} & SearchPage>;
