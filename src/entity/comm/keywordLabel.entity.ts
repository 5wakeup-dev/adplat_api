import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Manager, ManagerRes } from "../member/manager.entity";
import { Keyword } from "./keyword.entity";

@Entity({ name: 'keyword_labels' })
export class KeywordLabel {
  @PrimaryGeneratedColumn({ name: 'keywordLabel_id', type: 'bigint' })
  id: string;

  // @PrimaryColumn( { name: 'keyword_id', nullable: false } )
  @Column({ name: 'keyword_id', nullable: false })
  keywordId: string;

  // @PrimaryColumn( { name: 'manager_id', nullable: false } )
  // managerId: string;

  @Column({ length: 64, nullable: false, name: 'uix_keywordLabel_uk' })
  uk: string;

  @Column( { length: 256, nullable: false } )
  type: string;
  
  @ManyToOne( () => Keyword )
  @JoinColumn( { name: 'keyword_id', referencedColumnName: 'id' } )
  keyword?: Keyword;

  @ManyToOne( () => Manager )
  @JoinColumn( { name: 'manager_id', referencedColumnName: 'id' } )
  manager?: Manager;

  /** HEX 코드 (#포함)
  */
  @Column( { length: 9, nullable: false } )
  color: string;

  @Column( { nullable: false } )
  ord: number;

}

export type KeywordLabelDto = Partial<KeywordLabel>;

export class KeywordLabelRes {
  id: string;
  keyword: string;
  uk: string;
  type: string;
  color: string;
  ord: number;
  manager?: ManagerRes;
  constructor({
    id, keyword, type, color, ord, uk, manager
  }: KeywordLabel){
    this.id = id
    this.keyword = keyword.keyword;
    this.uk = uk;
    this.type = type;
    this.color = color;
    this.ord = ord;

    if(manager) {
      this.manager = new ManagerRes(manager);
    }
  }
}

export type KeywordLabelReq = Partial<Omit<KeywordLabelRes, 'manager'>>;