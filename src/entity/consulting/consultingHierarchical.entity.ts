import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity({ name: 'consulting_hierarchical' })
export class ConsultingHierarchical {
  @PrimaryGeneratedColumn({
    name: 'consulting_id',
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

export type ConsultingHierarchicalDto = Partial<ConsultingHierarchical>;

export class ConsultingHierarchicalRes {
  id: string;
  groupId: string;
  groupParent?: string;
  groupDepth: number;
  groupOrd: number;
  constructor({
    id, groupId, groupParent, groupDepth, groupOrd
  }: ConsultingHierarchical){
    this.id = id
    this.groupId = groupId
    this.groupParent = groupParent
    this.groupDepth = groupDepth
    this.groupOrd = groupOrd
  }
}