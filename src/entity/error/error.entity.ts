import { maxText } from "src/util/format.util";
import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity({name: 'errors'})
export class ErrorEntity {
  @PrimaryGeneratedColumn({
    name: 'error_id',
    type: 'bigint'
  })
  id: number;

  @Column({ nullable: false, length: 32 })
  app: string;

  @Column({ nullable: false, length: 32 })
  version: string;

  @Column({ nullable: false, length: 32 })
  phase: string;

  @Column({ nullable: false, length: 65535 })
  header: string;

  @Column({ length: 65535 })
  body?: string;

  @Column({ nullable: false, length: 65535 })
  host: string;

  @Column({ nullable: false, length: 512 })
  url: string;

  @Column({ length: 65535 })
  member?: string;

  @Column({ nullable: false, length: 4294967295 })
  message: string;

  @CreateDateColumn({ type: 'timestamp'})
  reg_date: Date;
}

export type ErrorDto = Partial<Omit<Error, 'id'|'reg_date'>>;

const MAX: number = 100;
const ELLIPSIS = '...';
export class ErrorListDro {
  id: number;
  app: string;
  version: string;
  phase: string;
  header: string;
  body?: string;
  host: string;
  url: string;
  member?: string;
  message: string;
  reg_date: number;

  constructor({id, app, version, phase, header, body, host, url, member, message, reg_date}: ErrorEntity){
    this.id = id;
    this.app = app;
    this.version = version;
    this.phase = phase;
    this.header = maxText(header, MAX, {ellipsis: ELLIPSIS});
    this.body = body? maxText(body, MAX, {ellipsis: ELLIPSIS}) : undefined;
    this.host = maxText(host, MAX, {ellipsis: ELLIPSIS});
    this.url = maxText(url, MAX, {ellipsis: ELLIPSIS});
    this.member = member ? maxText(member, MAX, {ellipsis: ELLIPSIS}) : undefined;
    this.message = maxText(message, MAX, {ellipsis: ELLIPSIS});
    this.reg_date = reg_date.getTime();
  }
}

export class ErrorDetailDro {
  id: number;
  app: string;
  version: string;
  phase: string;
  header: string;
  body?: string;
  host: string;
  url: string;
  member?: string;
  message: string;
  reg_date: number;

  constructor({id, app, version, phase, header, body, host, url, member, message, reg_date}: ErrorEntity){
    this.id = id;
    this.app = app;
    this.version = version;
    this.phase = phase;
    this.header = header;
    this.body = body;
    this.host = host;
    this.url = url;
    this.member = member;
    this.message = message;
    this.reg_date = reg_date.getTime();
  }
}