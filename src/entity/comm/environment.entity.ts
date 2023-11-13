import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";


@Entity({name: 'environments'})
export class Environment {
  @PrimaryGeneratedColumn({ name: 'environment_id' })
  id: number;

  @Column({ length: 32, nullable: false })
  type: string

  @Column({ length: 32, nullable: false })
  typeName: string;

  @Column({ length: 32, nullable: false })
  code: string;

  @Column({ length: 32, nullable: false })
  codeName: string;

  @Column({ nullable: false })
  order: number;
  
}

export type EnvironmentDto = Partial<Environment>
