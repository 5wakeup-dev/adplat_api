import { Replace } from "src/type/index.type";
import { Entity, JoinColumn, JoinTable, ManyToMany, ManyToOne, PrimaryColumn } from "typeorm";
import { Role } from "../role/role.entity";
import {Menu, MenuDto} from "./menu.entity";

@Entity("menu_functions")
export class MenuFunction {
  
  @PrimaryColumn({ name: 'menu_id', nullable: false, type: 'bigint'})
  menuId: string;

  @PrimaryColumn({ name: 'functionKey', nullable: false, length: 32 })
  key: string;

  @ManyToOne( _ => Menu, entity => entity.methods, {orphanedRowAction: 'delete'})
  @JoinColumn({ name: 'menu_id' })
  menu?: Menu;

  @ManyToMany( _ => Role, {eager: true})
  @JoinTable({
    name: 'function_and_role',
    joinColumns: [
      { name: 'menu_id', referencedColumnName: 'menuId' },
      { name: 'functionKey', referencedColumnName: 'key'}
    ],
    inverseJoinColumns: [
      {name: 'role_id', referencedColumnName: 'id' }
    ]
    // joinColumn: {name: 'menuMethod_id', referencedColumnName: 'id'},
    // inverseJoinColumn: {name: 'role_id', referencedColumnName: 'id' }
  })
  roles?: Array<Role>
}

export type MenuFunctionDto = Partial<
  Replace<
    MenuFunction,
    { 
      menu: MenuDto,
      roles: Array<Role> 
    }
  >
>;
