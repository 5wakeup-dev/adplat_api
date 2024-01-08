import { Replace } from "src/type/index.type";
import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Product, ProductDto, ProductRes } from "./product.entity";

@Entity({ name: 'product_themes' })
export class ProductTheme {
  @PrimaryGeneratedColumn({ name: 'product_theme_id', type: 'bigint' })
  id: number;


  @ManyToOne(() => Product, entity => entity.themes, { orphanedRowAction: "delete" })
  @JoinColumn({ name: 'product_id' })
  product?: Product;

  @Column({ nullable: false })
  type: string;

  @Column({ nullable: false })
  title: string;

  @Column({ nullable: false })
  value: string;

}

export type ProductThemeDto = Partial<
  Replace<
    ProductTheme,
    {
      product: ProductDto
    }
  >
>;


export class ProductThemeRes {

  id: number;
  title: string;
  type: string;
  value: string;
  product?: ProductRes;
  constructor(
    {
      id, title, type, value, product
    }: ProductTheme
  ) {
    this.id = id

    if (product)
      this.product = new ProductRes(product)

    this.type = type
    this.value = value;
    this.title = title
  }
}