import { Replace } from "src/type/index.type";
import { Entity, JoinColumn, ManyToOne, PrimaryColumn } from "typeorm";
import { Menu, MenuDto } from "./menu.entity";


@Entity({ name: 'menu_properties' })
export class MenuProperty {
  @PrimaryColumn({ name: 'menu_id', nullable: false, type: 'bigint' })
  menuId: string;

  @PrimaryColumn({ name: 'propertyKey', nullable: false, length: 64 })
  key: string;

  @ManyToOne( _ => Menu, entity => entity.properties, {orphanedRowAction: 'delete'} )
  @JoinColumn({ name: 'menu_id' })
  menu?: Menu
}

export type MenuPropertyDto = Partial<
  Replace<
    MenuProperty,
    { menu: MenuDto }
  >
>