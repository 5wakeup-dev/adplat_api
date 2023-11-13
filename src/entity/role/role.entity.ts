import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity({ name: 'roles' })
export class Role {
  @PrimaryGeneratedColumn({
    name: 'role_id'
  })
  id: number;

  @Column({
    name: 'uix_role_uk',
    nullable: false, length: 32
  })
  key: string;

  @Column({ length: 64 })
  name: string;
}

export type RoleDto = Partial<Role>;

export type RecordRoles = Record<string, Array<string>>;