import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";


@Entity({ name: 'keywords' })
export class Keyword {
  @PrimaryGeneratedColumn({ name: 'keyword_id', type: 'bigint' })
  id: string;

  @Column({ length: 32, nullable: false })
  keyword: string;

  @Column({ length: 32, nullable: false })
  chosung: string;

  @Column({ length: 128, nullable: false })
  syllable: string;
}

export type KeywordDto = Partial<Keyword>;