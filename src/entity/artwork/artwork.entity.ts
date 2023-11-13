import { Replace } from "src/type/index.type";
import { isUndeclared } from "src/util/format.util";
import { Column, CreateDateColumn, Entity, JoinColumn, JoinTable, ManyToMany, ManyToOne, OneToMany, OneToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { Attachment, AttachmentRes } from "../comm/attachment.entity";
import { Keyword } from "../comm/keyword.entity";
import { KeywordLabelReq, KeywordLabelRes } from "../comm/keywordLabel.entity";
import { Manager, ManagerRes } from "../member/manager.entity";
import { Menu, MenuRes } from "../menu/menu.entity";
import { ArtworkLabel, ArtworkLabelDto } from "./artwork.bridge";
import { ArtworkHierarchical, ArtworkHierarchicalDto, ArtworkHierarchicalRes } from "./artworkHierarchical.entity";
import { ArtworkI18n, ArtworkI18nDto, ArtworkI18nRes, ArtworkI18nReq } from "./artworkI18n.entity";
import { ArtworkKeyword, ArtworkKeywordDto } from "./artworkKeyword.entity";
import { ArtworkProperty, ArtworkPropertyDto } from "./artworkProperty.entity";
import { ArtworkRange, ArtworkRangeDto, ArtworkRangeReq, ArtworkRangeRes } from "./artworkRange.entity";
import { ArtworkRegion, ArtworkRegionDto, ArtworkRegionReq, ArtworkRegionRes } from "./artworkRegion.entity";

@Entity({ name: 'artworks' })
export class Artwork {
  @PrimaryGeneratedColumn({ name: 'artwork_id', type: 'bigint' })
  id: string;



  @Column({ name: 'uix_artwork_uk', length: 32, nullable: false })
  uk: string;

  @Column({ length: 32, nullable: false })
  writer: string;

  /** 조회수(중복 아이피 제외)
  */
  @Column({ nullable: false })
  view: number;

  //외부 링크 이동 횟수, 광고판 전용
  @Column({ nullable: false })
  move: number;

  @Column({ nullable: false })
  reply: number;

  @Column({ nullable: false })
  ord: number;

  @Column({ nullable: false })
  reactionPositive: number;

  @Column({ nullable: false })
  reactionNegative: number;

  /** [ -1: 숨김, 0: 준비중, 1: 공개 ]
  */
  @Column({ nullable: false })
  state: number;

  @UpdateDateColumn({ type: 'timestamp' })
  upt_date?: Date;

  @CreateDateColumn({ type: 'timestamp' })
  reg_date: Date;


  //cascade: inverse entity에 대한 설정
  //기본적으로 false. 브릿지는 당연히 어떠한 상황에서도 CRUD가 이루어짐. 
  @ManyToOne(() => Menu)
  @JoinColumn({ name: 'menu_id', referencedColumnName: 'id' })
  menu?: Menu;

  @ManyToOne(() => Manager)
  @JoinColumn({ name: 'manager_id', referencedColumnName: 'id' })
  manager?: Manager;

  @OneToOne(() => ArtworkHierarchical)
  @JoinColumn({ name: 'artwork_id' })
  hierarchical?: ArtworkHierarchical;

  @OneToMany(() => ArtworkI18n, entity => entity.artwork, { orphanedRowAction: 'delete', cascade: ['insert', 'update'] })
  i18ns?: Array<ArtworkI18n>;

  @ManyToMany(() => Attachment)
  @JoinTable({
    name: 'artwork_and_attachment',
    joinColumn: { name: 'artwork_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'attachment_id', referencedColumnName: 'id' }
  })
  attachments?: Array<Attachment>;

  @OneToMany(() => ArtworkProperty, entity => entity.artwork, { orphanedRowAction: 'delete', cascade: ['insert', 'update'] })
  properties?: Array<ArtworkProperty>

  @OneToMany(() => ArtworkKeyword, entity => entity.artwork, { orphanedRowAction: 'delete', cascade: ['insert', 'update'] })
  // @JoinTable({
  //   name: 'artwork_and_keyword',
  //   joinColumn: { name: 'artwork_id', referencedColumnName: 'id' },
  //   inverseJoinColumn: { name: 'keyword_id', referencedColumnName: 'id' }
  // })
  i18nKeywords?: Array<ArtworkKeyword>

  // @ManyToMany( () => KeywordLabel )
  // @JoinTable({
  //   name: 'artwork_and_label',
  //   joinColumn: { name: 'artwork_id', referencedColumnName: 'id' },
  //   inverseJoinColumn: { name: 'keywordLabel_id', referencedColumnName: 'id' }
  // })
  // labels?: Array<KeywordLabel>;
  @OneToMany(
    () => ArtworkLabel,
    entity => entity.artwork,
    { orphanedRowAction: 'delete', cascade: ['insert', 'update'] }
  )
  labels?: Array<ArtworkLabel>;

  @OneToMany(() => ArtworkRange, entity => entity.artwork, { orphanedRowAction: 'delete', cascade: ['insert', 'update'] })
  ranges?: Array<ArtworkRange>;

  @OneToOne(() => ArtworkRegion, entity => entity.artwork, { orphanedRowAction: 'delete', cascade: ['insert', 'update'], eager: true })
  region?: ArtworkRegion;

  title?: string;
  content?: string;
  keywords?: Array<Keyword>;

}

export type ArtworkDto = Partial<
  Replace<
    Omit<Artwork, 'title' | 'content' | 'keywords'>,
    {
      i18ns: Array<ArtworkI18nDto>;
      hierarchical: ArtworkHierarchicalDto;
      properties: Array<ArtworkPropertyDto>;
      i18nKeywords: Array<ArtworkKeywordDto>;
      // keywords: Array<KeywordDto>;
      labels: Array<ArtworkLabelDto>;
      ranges: Array<ArtworkRangeDto>;
      region: ArtworkRegionDto;
    }
  >
>


export class ArtworkRes {
  id: string;
  menu?: MenuRes;
  manager?: ManagerRes;
  uk: string;
  writer: string;
  view: number;
  reply: number;
  reactionPositive: number;
  reactionNegative: number;
  state: number;
  upt_date?: number;
  reg_date: number;
  ord: number;
  hierarchical?: ArtworkHierarchicalRes;
  i18ns?: Record<string, ArtworkI18nRes>;
  attachments?: Array<AttachmentRes>;
  properties?: Record<string, string>;

  i18nKeywords?: Record<string, Array<string>>;
  keywords?: Array<string>;
  labels?: Array<KeywordLabelRes>;
  ranges?: Array<ArtworkRangeRes>;

  title?: string;
  content?: string;

  region?: ArtworkRegionRes;

  constructor(
    {
      id, menu, manager, uk, writer,
      view, reply, reactionPositive, reactionNegative,
      state, upt_date, reg_date, ord,
      hierarchical, i18ns, attachments, properties, i18nKeywords, keywords, labels, ranges,
      title, content,
      region
    }: Artwork
  ) {
    this.id = id
    if (menu)
      this.menu = new MenuRes(menu);
    if (manager)
      this.manager = new ManagerRes(manager);
    this.uk = uk
    this.writer = writer
    this.view = view
    this.reply = reply
    this.reactionPositive = reactionPositive
    this.reactionNegative = reactionNegative
    this.state = state;
    if (upt_date)
      this.upt_date = upt_date.getTime()

    this.reg_date = reg_date.getTime()

    if (hierarchical)
      this.hierarchical = hierarchical

    if (i18ns)
      this.i18ns = i18ns.reduce((record, i18nEntity) => {
        record[i18nEntity.i18n] = new ArtworkI18nRes(i18nEntity);
        return record;
      }, {})
    this.ord = ord;
    if (attachments)
      this.attachments = attachments.map(attc => new AttachmentRes(attc));

    if (properties)
      this.properties = properties.reduce((record, property) => {
        record[property.key] = property.val;
        return record;
      }, {})

    if (i18nKeywords)
      this.i18nKeywords = i18nKeywords.reduce((record, { i18n, keyword }) => {
        if (keyword) {
          if (!record[i18n])
            record[i18n] = [];

          record[i18n].push(keyword.keyword)
        }
        return record;
      }, {} as Record<string, Array<string>>)

    if (keywords)
      this.keywords = keywords.map(({ keyword }) => keyword)

    if (labels)
      this.labels = labels.map(kwdLb => new KeywordLabelRes(kwdLb.keywordLabel))

    if (ranges?.length > 0)
      this.ranges = ranges.map(rng => new ArtworkRangeRes(rng));

    if (!isUndeclared(title))
      this.title = title
    if (!isUndeclared(content))
      this.content = content

    if (region) {
      this.region = new ArtworkRegionRes(region);
    }
  }
}

export type ArtworkReq = Partial<
  Replace<
    Omit<ArtworkRes, 'hierarchical' | 'upt_date' | 'reg_date' | 'manager'>,
    {
      menu: string;
      i18ns: Record<string, ArtworkI18nReq>;
      attachments: Array<string>;
      labels: Array<KeywordLabelReq>;
      ranges: Array<ArtworkRangeReq>;
      region: ArtworkRegionReq;
    }
  >
>