import { Column, Entity, PrimaryColumn } from "typeorm";

@Entity("menu_hierarchical")
export class MenuHierarchical {
  
  @PrimaryColumn({ name: 'menu_id', type: 'bigint', primary: true })
  id: string;

  @Column({ name: 'grp_id', nullable: false })
  groupId: string;

  @Column({ name: 'grp_parent', })
  groupParent?: string;

  @Column({ name: 'grp_depth', nullable: false })
  groupDepth: number;

  @Column({ name: 'grp_ord', nullable: false })
  groupOrd: number;

  // @OneToOne(() => Menu, entity => entity.hierarchical )
  // @JoinColumn({ name: 'menu_id'})
  // menu?: Menu;

}

export type MenuHierarchicalDto = Partial<
  // Replace<
    MenuHierarchical
    // { menu: MenuDto }
  // >
>;


export class MenuHierarchicalRes {
  id: string;
  groupId: string;
  groupParent?: string;
  groupDepth: number;
  groupOrd: number;
  constructor({
    id, groupId, groupParent, groupDepth, groupOrd
  }: MenuHierarchical){
    this.id = id
    this.groupId = groupId
    this.groupParent = groupParent
    this.groupDepth = groupDepth
    this.groupOrd = groupOrd
  }
}
