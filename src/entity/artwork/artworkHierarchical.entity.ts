import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity("artwork_hierarchical")
export class ArtworkHierarchical{
  
  @PrimaryGeneratedColumn({
    name: 'artwork_id',
    type: 'bigint'
  })
  id: string;

  @Column({ name: 'grp_id', nullable: false })
  groupId: string;

  @Column({ name: 'grp_parent', })
  groupParent?: string;

  @Column({ name: 'grp_depth', nullable: false })
  groupDepth: number;

  @Column({ name: 'grp_ord', nullable: false })
  groupOrd: number;
}

export type ArtworkHierarchicalDto = Partial<ArtworkHierarchical>;

export class ArtworkHierarchicalRes {
  id: string;
  groupId: string;
  groupParent?: string;
  groupDepth: number;
  groupOrd: number;
  constructor({
    id, groupId, groupParent, groupDepth, groupOrd
  }: ArtworkHierarchical){
    this.id = id
    this.groupId = groupId
    this.groupParent = groupParent
    this.groupDepth = groupDepth
    this.groupOrd = groupOrd
  }
}