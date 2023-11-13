import { Replace } from "src/type/index.type";
import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from "typeorm";
import { Menu, MenuDto } from "./menu.entity";

@Entity({ name: 'menu_metadatas' })
export class MenuMetadata {
  // @PrimaryGeneratedColumn({
  //   name: 'menuMetadata_id',
  //   type: 'bigint'
  // })
  // id: number;

  @PrimaryColumn({ name: 'menu_id', nullable: false, type: 'bigint' })
  menuId: string;

  @PrimaryColumn({ nullable: false, length: 32 })
  key: string

  @Column({ length: 128 })
  val?: string


  @ManyToOne( _ => Menu, entity => entity.metadatas, {orphanedRowAction: 'delete'} )
  @JoinColumn({ name: 'menu_id' })
  menu?: Menu
}


export type MenuMetadataDto = Partial<
  Replace<
    MenuMetadata,
    { menu: MenuDto }
  >
>