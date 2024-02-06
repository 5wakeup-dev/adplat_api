
import { SearchPage } from "src/util/entity/listPage";
import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";


@Entity({ name: 'visitor_count' })
export class VisitorCount {

  @PrimaryGeneratedColumn({
    name: 'id', type: 'bigint'
  })
  id: string;
  @Column()
  type?: string;
  @Column({name:"external_uk"})
  externalUk?: string;
  @Column({ name: 'target_date' })
  targetDate?: Date;
  @Column()
  count?: number;
}

export type VisitorCountDto =  Partial<{
  type:string;
  externalUk:string
  targetDate:Date

} & SearchPage>


