import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

@Entity({ name: "attachments" })
export class Attachment {
  @PrimaryGeneratedColumn({
    name: 'attachment_id'
  })
  id: string;

  @Column({ nullable: false, length: 32})
  state: 'UPLOADING' | 'UPLOADED' | 'ERROR';

  @Column({ nullable: false, length: 256 })
  mimeType: string

  @Column({ nullable: false, length: 24 })
  extension: string

  @Column({ nullable: false, length: 512 })
  pathRoot: string

  @Column({ nullable: false, length: 512 })
  pathSub: string

  @Column({ nullable: false, length: 256 })
  originName: string

  @Column({ nullable: false, length: 256 })
  storeName: string

  @Column({ nullable: false })
  size: number

  @Column()
  width?: number
  @Column()
  height?: number

  @UpdateDateColumn({ type: 'timestamp'})
  upt_date?: Date;

  @CreateDateColumn({ type: 'timestamp'})
  reg_date?: Date;
}

export class AttachmentRes {
  id: string;
  state: 'UPLOADING' | 'UPLOADED' | 'ERROR';
  mimeType: string
  extension: string
  pathRoot: string
  pathSub: string
  originName: string
  storeName: string
  size: number
  width?: number
  height?: number
  upt_date?: number;
  reg_date: number;
  constructor(
    {
      id, state, mimeType, extension, pathRoot, pathSub, 
      originName, storeName, size, width, height, 
      upt_date, reg_date
    }: Attachment
  ) {
    this.id = id
    this.state = state
    this.mimeType = mimeType
    this.extension = extension
    this.pathRoot = pathRoot
    this.pathSub = pathSub
    this.originName = originName
    this.storeName = storeName
    this.size = size
    this.width = width
    this.height = height
    if( upt_date )
      this.upt_date = upt_date.getTime()
    
    this.reg_date = reg_date.getTime();
  }
}