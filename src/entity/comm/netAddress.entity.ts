import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity({ name: 'net_addresses' })
export class NetAddress {
  @PrimaryGeneratedColumn({name: 'netAddress_id', type: 'bigint'})
  id: string;

  @Column({ length: 192, nullable: false})
  ip: string;
}