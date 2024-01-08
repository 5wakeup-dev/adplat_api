import { Replace } from "src/type/index.type";
import { Column, CreateDateColumn, Entity, JoinColumn, JoinTable, ManyToMany, ManyToOne, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { Attachment, AttachmentRes } from "../comm/attachment.entity";

import { Manager, ManagerRes } from "../member/manager.entity";
import { Menu, MenuRes } from "../menu/menu.entity";
import { User, UserRes } from "../member/user.entity";
import { ProductTheme, ProductThemeDto, ProductThemeRes } from "./productTheme.entity";
import { NetAddress } from "../comm/netAddress.entity";

@Entity({ name: 'products' })
export class Product {
  @PrimaryGeneratedColumn({ name: 'product_id', type: 'bigint' })
  id: string;

  @Column({ length: 256, nullable: false })
  uk: string;

  @Column({ nullable: false })
  title: string;

  @Column({ nullable: false })
  content: string;

  /** 조회수(중복 아이피 제외)
  */
  @Column({ nullable: false })
  view: number;

  //외부 링크 이동 횟수, 광고판 전용
  @Column({ nullable: false })
  move: number;

  @Column({ nullable: false })
  ord: number;
  /**-1:삭제대기, 0:비공개, 1:정상, 2:임시
  */
  @Column({ nullable: false })
  state: number;

  @Column({ nullable: false })
  price: number;

  @UpdateDateColumn({ name: "start_date" })
  startDate?: Date;

  @UpdateDateColumn({ name: "end_date" })
  endDate?: Date;

  @Column({ nullable: true })
  link: string;

  @Column({ nullable: true })
  address: string;

  @Column({ nullable: true })
  days: string;

  @Column({ nullable: true })
  logo: string;

  @UpdateDateColumn({ name: "upt_date", type: 'timestamp' })
  uptDate?: Date;

  @CreateDateColumn({ name: "reg_date", type: 'timestamp' })
  regDate: Date;

  //cascade: inverse entity에 대한 설정
  //기본적으로 false. 브릿지는 당연히 어떠한 상황에서도 CRUD가 이루어짐. 
  @ManyToOne(() => Menu)
  @JoinColumn({ name: 'menu_id', referencedColumnName: 'id' })
  menu?: Menu;

  @ManyToOne(() => Manager)
  @JoinColumn({ name: 'manager_id', referencedColumnName: 'id' })
  manager?: Manager;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id', referencedColumnName: 'id' })
  user?: User;

  @OneToMany(() => ProductTheme, entity => entity.product, { orphanedRowAction: 'delete', cascade: ['insert', 'update'] })
  themes?: Array<ProductTheme>;

  @ManyToMany(() => Attachment)
  @JoinTable({
    name: 'product_and_attachments',
    joinColumn: { name: 'product_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'attachment_id', referencedColumnName: 'id' }
  })
  attachments?: Array<Attachment>;
}

export type ProductDto = Partial<
  Replace<
    Omit<Product, 'title' | 'content' | 'themes'>,
    {
      themes: Array<ProductThemeDto>;
    }
  >
>


export class ProductRes {
  id: string;
  menu?: MenuRes;
  manager?: ManagerRes;
  user?: UserRes;
  uk: string;
  view: number;
  state: number;
  ord: number;
  uptDate?: number;
  regDate: number;
  attachments?: Array<AttachmentRes>;
  title?: string;
  content?: string;
  address: string;
  days: string;
  link: string;
  logo: string;
  move: number;
  price: number;
  endDate: number;
  startDate: number;
  themes?: Array<ProductThemeRes>;

  constructor(
    {
      id, menu, manager, uk,
      view, address, days, link, logo, move, price, endDate, startDate, user,
      state, uptDate, regDate, ord, attachments, title, content, themes,
    }: Product
  ) {
    this.id = id
    if (menu) this.menu = new MenuRes(menu);
    if (manager) this.manager = new ManagerRes(manager);
    if (user) this.user = new UserRes(user);

    this.address = address;
    this.days = days
    this.link = link;
    this.logo = logo;
    this.move = move
    this.price = price
    if (endDate) this.endDate = endDate.getTime()
    if (startDate) this.startDate = startDate.getTime()
    this.uk = uk
    this.view = view

    this.state = state;
    if (uptDate)
      this.uptDate = uptDate.getTime()

    this.regDate = regDate.getTime()


    this.ord = ord;
    if (attachments)
      this.attachments = attachments.map(attc => new AttachmentRes(attc));

    if (themes)
      this.themes = themes.map(t => new ProductThemeRes(t))


    this.title = title
    this.content = content
  }
}

export type ProductReq = Partial<
  Replace<
    Omit<ProductRes, 'upt_date' | 'reg_date' | 'manager' | 'user'>,
    {
      menu: string;
      attachments: Array<string>;
      themes: Array<ProductThemeDto>
    }
  >
>

@Entity({ name: 'product_views' })
export class ProductView {
  @PrimaryGeneratedColumn({ name: 'product_view_id', type: 'bigint' })
  id: string;

  @ManyToOne( () => Product, { nullable: false } )
  @JoinColumn({ name: 'product_id', referencedColumnName: 'id' })
  product?: Product;

  @ManyToOne( () => NetAddress, { nullable: false } )
  @JoinColumn({ name: 'netAddress_id', referencedColumnName: 'id' })
  netAddress?: NetAddress;

  @CreateDateColumn({ type: 'timestamp' })
  reg_date: Date;

}


@Entity({ name: 'product_moves' })
export class ProductMove {
  @PrimaryGeneratedColumn({ name: 'product_move_id', type: 'bigint' })
  id: string;

  @ManyToOne( () => Product, { nullable: false } )
  @JoinColumn({ name: 'product_id', referencedColumnName: 'id' })
  product?: Product;

  @ManyToOne( () => NetAddress, { nullable: false } )
  @JoinColumn({ name: 'netAddress_id', referencedColumnName: 'id' })
  netAddress?: NetAddress;

  @CreateDateColumn({ type: 'timestamp' })
  reg_date: Date;

}