import { Replace } from "src/type/index.type";
import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";

import { Store, StoreRes } from "./store.entity";

@Entity({ name: 'store_memos' })
export class StoreMemo {
  @PrimaryGeneratedColumn({
    name: 'store_memo_id', type: 'bigint'
  })
  id: string;

  @Column({ nullable: false })
  type: string;

  @Column({ nullable: false })
  value: string;

  @ManyToOne(() => Store, { orphanedRowAction: 'delete' })
  @JoinColumn({ name: 'user_id' })
  store?: Store;


}

export type StoreMemoDto = Partial<StoreMemo>;
export class StoreMemoRes {
  id: string;
  store?: StoreRes
  type: string;
  value: string;

  constructor(
    { id, type, value, store }: StoreMemo
  ) {
    this.id = id;
    this.type = type;
    this.value = value;
    if (store) {
      this.store = new StoreRes(store);
    }

  }

}

export type StoreMemoReq = Partial<
  Replace<
    StoreMemoRes,
    {

    }
  >
>