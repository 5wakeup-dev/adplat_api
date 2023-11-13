import { Replace } from "src/type/index.type";
import { Column, Entity, JoinColumn, OneToMany, OneToOne, PrimaryGeneratedColumn } from "typeorm";
import { RecordRoles } from "../role/role.entity";
import { MenuFunction, MenuFunctionDto } from "./menuFunction.entity";
import { MenuHierarchical, MenuHierarchicalDto, MenuHierarchicalRes } from "./menuHierarchical.entity";
import { MenuI18n, MenuI18nDto } from "./menuI18n.entity";
import { MenuMetadata, MenuMetadataDto } from "./menuMetadata.entity";
import { MenuMethod, MenuMethodDto } from "./menuMethod.entity";
import { MenuProperty, MenuPropertyDto } from "./menuProperty.entity";


@Entity({name: 'menus'})
export class Menu {
  @PrimaryGeneratedColumn({ 
    name: 'menu_id', type: 'bigint' 
  })
  id: string;

  @Column({ name: 'menuKey', length: 32, nullable: false })
  key: string;

  @Column({ name: 'uix_menu_uk', length: 512, nullable: false })
  absoluteKey: string;

  @OneToOne( () => MenuHierarchical )
  @JoinColumn({name: 'menu_id'})
  hierarchical?: MenuHierarchical;

  @OneToMany( () => MenuMethod, entity => entity.menu, { orphanedRowAction: 'delete', cascade: ['insert', 'update'] } )
  methods?: Array<MenuMethod>;

  @OneToMany( () => MenuFunction, entity => entity.menu, { orphanedRowAction: 'delete', cascade: ['insert', 'update'] } )
  functions?: Array<MenuFunction>;

  @OneToMany( () => MenuI18n, entity => entity.menu, { orphanedRowAction: 'delete', cascade: ['insert', 'update'] } )
  i18ns?: Array<MenuI18n>;

  @OneToMany( () => MenuMetadata, entity => entity.menu, { orphanedRowAction: 'delete', cascade: ['insert', 'update'] } )
  metadatas?: Array<MenuMetadata>;

  @OneToMany( () => MenuProperty, entity => entity.menu, { orphanedRowAction: 'delete', cascade: ['insert', 'update'] } )
  @JoinColumn({ name: 'menu_id' })
  properties?: Array<MenuProperty>;

  title?: string;
}

export type MenuDto = Partial<
  Replace<
    Omit<Menu, 'title'>,
    { 
      methods: Array<MenuMethodDto>;
      functions: Array<MenuFunctionDto>;
      hierarchical: MenuHierarchicalDto;
      i18ns: Array<MenuI18nDto>;
      metadatas: Array<MenuMetadataDto>;
      properties: Array<MenuPropertyDto>;
    }
  >
>

export class MenuRes { 
  id: string;
  key: string;
  absoluteKey: string;
  hierarchical? : MenuHierarchicalRes;
  methods?: RecordRoles;
  functions? : RecordRoles;
  i18ns?: Record<string, string>;
  metadatas?: Record<string, string>;
  properties?: Array<string>;
  title?: string;
  
  constructor({
    id, key, absoluteKey, hierarchical, 
    methods, functions, i18ns, metadatas, properties,
    title
  }: Menu){
    this.id = id;
    this.key = key;
    this.absoluteKey = absoluteKey;
    if( hierarchical )
      this.hierarchical = new MenuHierarchicalRes(hierarchical);
    if( methods )
      this.methods = methods.reduce( 
        (record, method) => {
          record[method.key] = method.roles.map( ({key: mKey}) => mKey)||[];
          return record;
        }, {} as RecordRoles);

    if( functions )
      this.functions = functions.reduce( 
        (record, func) => {
          record[func.key] = func.roles.map( ({key: fKey}) => fKey)||[];
          return record;
        }, {} as RecordRoles);

    if( i18ns ) {
      this.i18ns = i18ns.reduce( (record, {i18n, title: iTitle}) => {
        record[i18n] = iTitle;
        return record;
      }, {})
      this.title = this.i18ns[process.env.PARAM_VALUE_LANG];
    } else {
      this.title = title;
    }

    if( metadatas )
      this.metadatas = metadatas.reduce( (record, {key: metaKey, val}) => {
        record[metaKey] = val;
        return record;
      }, {})

    if( properties )
      this.properties = properties.map( ({key: pKey}) => pKey );

    // this.title = title;

  }
}

export type MenuReq = Partial<
  Replace<
    Omit<MenuRes, 'hierarchical'|'absoluteKey'>, 
    { 
      methods: RecordRoles;
      functions: RecordRoles;
      properties: Array<string>;
    }
  >
>

