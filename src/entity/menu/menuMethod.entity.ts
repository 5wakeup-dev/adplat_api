import { Replace } from "src/type/index.type";
import { Entity, JoinColumn, JoinTable, ManyToMany, ManyToOne, PrimaryColumn } from "typeorm";
import { Role } from "../role/role.entity";
import {Menu, MenuDto} from "./menu.entity";

@Entity("menu_methods")
export class MenuMethod {
  // @PrimaryGeneratedColumn({
  //   name: 'menuMethod_id',
  //   type: 'bigint'
  // })
  // id: string;

  @PrimaryColumn({ name: 'menu_id'})
  menuId: string;

  @PrimaryColumn({ name: 'methodKey', length: 32 })
  key: string;

  @ManyToOne( _ => Menu, entity => entity.methods, {orphanedRowAction: 'delete'} )
  @JoinColumn({ name: 'menu_id' })
  menu?: Menu;

  @ManyToMany( _ => Role, {eager: true})
  @JoinTable({
    name: 'method_and_role',
    joinColumns: [
      { name: 'menu_id', referencedColumnName: 'menuId' },
      { name: 'methodKey', referencedColumnName: 'key'}
    ],
    inverseJoinColumns: [
      {name: 'role_id', referencedColumnName: 'id' }
    ]
    // joinColumn: {name: 'menuMethod_id', referencedColumnName: 'id'},
    // inverseJoinColumn: {name: 'role_id', referencedColumnName: 'id' }
  })
  roles?: Array<Role>
}

export type MenuMethodDto = Partial<
  Replace<
    MenuMethod,
    { 
      menu: MenuDto,
      roles: Array<Role> 
    }
  >
>;

// export class MenuMethodRes {
//   // id: string;
//   key: string;
//   roles: Array<string>;
//   constructor(
//     { key, roles }: MenuMethod
//   ){
//     // this.id = id;
//     this.key = key;
//     if( roles )
//       this.roles = roles.map( ({key: k}) => k);
//   }
// }

// export type MenuMethodReq = Partial<MenuMethodRes>

