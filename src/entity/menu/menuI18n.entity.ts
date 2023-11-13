import { Replace } from "src/type/index.type";
import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from "typeorm";
import {Menu, MenuDto} from "./menu.entity";

@Entity({name : 'menu_i18ns'})
export class MenuI18n {

  @PrimaryColumn({ name: 'menu_id', nullable: false, type: 'bigint' })
  menuId: string;

  @PrimaryColumn({ nullable: false, length: 8 })
  i18n: string
  
  @Column({ nullable: false, length: 64})
  title: string

  @ManyToOne( _ => Menu, entity => entity.i18ns, {orphanedRowAction: 'delete'} )
  @JoinColumn({ name: 'menu_id' })
  menu?: Menu
}


export type MenuI18nDto = Partial<
  Replace<
    MenuI18n,
    { menu: MenuDto }
  >
>

// export class MenuI18nRes {
//   id: string;
//   i18n: string;
//   title: string;
// }

// export type MenuI18nReq = Partial<MenuI18nRes>
