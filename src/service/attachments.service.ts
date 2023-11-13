import { Injectable, NotFoundException } from "@nestjs/common";
import { Attachment } from "src/entity/comm/attachment.entity";
import { BASIC_EXCEPTION } from "src/exception/basic.exception";
import { AttachmentRepository } from "src/repository/comm/attachment.repository";
import { getRepositories } from "src/util/typeorm.util";
import { Connection } from "typeorm";
import * as dayjs from 'dayjs';
import { createUuid, YYYYMMDDHHmmss } from "src/util/format.util";
import * as FileType from 'file-type';
import { imageSize } from 'image-size';
import * as fs from 'fs';
import * as sharp from 'sharp';
import * as heicConvert from 'heic-convert'
import * as arrayBufferToBuffer from 'arraybuffer-to-buffer'
const BUFFER_SIZE = 1024 * 1024

@Injectable()
export class AttachmentsService {
  constructor(
    private connection: Connection
  ){}

  async getAttachmentsAndSort( ids: Array<string>): Promise<Array<Attachment>> {
    if( !ids || ids.length === 0 )
      return undefined;

    const repos = getRepositories({
      attachment: AttachmentRepository
    }, this.connection.manager )

    const attachments = await repos.attachment.getMany(
      undefined, 
      ctx => ctx.searchQuery()
        .where(`${ctx.alias}.id IN (:ids)`, {ids})
    )
    attachments.sort( ({id: aId}, {id: bId}) => 
      ids.findIndex( id => id === aId)
      - ids.findIndex( id => id === bId)
    )
    
    return attachments;
  }

  async createAttachments(
    files: Array<Express.Multer.File>, force?: boolean
  ): Promise<Array<Attachment>> {
    if(!files || files.length === 0)
      throw BASIC_EXCEPTION.NOT_ALLOW_EMPTY_ON_PROCESS;

    const repos = getRepositories({
      attachment: AttachmentRepository
    }, this.connection.manager)
    
    const pathSub: string = dayjs().format('YYYY/MM/DD');
    const pathRoot: string = process.env.PATH_EXT_STORAGE;
    const directPath: string = `${pathRoot}/${pathSub}`;
    const attachmentsAndBuffer: Array<Attachment&{buffer: Buffer}> = (await Promise.all(
      files
        .map(async ({buffer, originalname, mimetype, size}) => {
          if(originalname.indexOf("heic")>-1){
            originalname.replace("heic","png")
            mimetype="image/png";
          }
          const innerBuffer=originalname.indexOf("heic")>-1?
          arrayBufferToBuffer(await heicConvert({buffer,format:"PNG"})) :buffer
          
          const fileType = await FileType.fromBuffer(innerBuffer);
          const id: string = createUuid({prefix: `ATTCH-${dayjs().format(YYYYMMDDHHmmss)}`, length: 32})
          let metadata = null;
          try {
            metadata = fileType.mime.indexOf('image/') > -1 ? imageSize(innerBuffer) : null
          } catch (error) { }
          return {
            id, size,
            mimetype,
            originName: originalname,
            fileType, 
            metadata,
            buffer:innerBuffer
          }
        })
      )).filter(({originName, mimetype, fileType}) => 
        originName.lastIndexOf('.') > 0 && mimetype === fileType.mime
      ).map(({id, originName, fileType, size, metadata, buffer}) =>({
        id,
        state: 'UPLOADING',
        mimeType: fileType.mime,
        pathRoot,
        pathSub: `${pathSub}/${fileType.ext}`,
        originName,
        // storeName: `${id}.${fileType.ext}`,
        storeName: id,
        extension: fileType.ext,
        size,
        width: metadata?.width || null,
        height: metadata?.height || null,
        buffer
      }))
    if(!force && files.length !== attachmentsAndBuffer.length)
      throw BASIC_EXCEPTION.NOT_ALLOW_UPLOAD_FILES;

    const promises:Array<Promise<unknown>> = [];
    const attachments: Array<Attachment> = await Promise.all( attachmentsAndBuffer.map( async attachmentAndBuffer => {
        const {buffer, ...other} = attachmentAndBuffer;
        const attachment = await repos.attachment.save(other);
        const localDirect = `${directPath}/${other.extension}`;
        if( !fs.existsSync(localDirect) )
          fs.mkdirSync(localDirect, {recursive: true})
        promises.push(
          new Promise<void>((resolve, reject) => {
            fs.writeFile(
              `${localDirect}/${other.storeName}`, buffer, 
              err => {
                if(err) reject();
                else resolve();
              }
            )
          })
          .then( () => attachment.state = 'UPLOADED' )
          .catch( () => attachment.state = 'ERROR' )
          .finally( () => repos.attachment.save(attachment) )
        );
        return attachment;
      })
    )
    await Promise.all(promises);
   
    return attachments;
  }

  async findFileAndCreateIfNotFoundSize(
    attachment: Attachment,
    size: number
  ):Promise<fs.ReadStream> {
    const extentionFlag=["jpg","png","jpeg","webp"].includes(attachment.extension)
    if(!attachment)
      throw new NotFoundException();
    if(!extentionFlag) size=undefined
    const basePath = `${attachment.pathRoot}/${attachment.pathSub}`;
    const customBasePath = `${basePath}${size? `/${size}`: ''}`;

    if(!fs.existsSync(`${basePath}/${attachment.storeName}`))
      throw new NotFoundException();
    if (size) {
      if(attachment.width <= size)
        return fs.createReadStream(
          `${basePath}/${attachment.storeName}`,
          {highWaterMark: BUFFER_SIZE}
        )
      
      if(!fs.existsSync(`${customBasePath}/${attachment.storeName}`)){

        if(!fs.existsSync(customBasePath))
          fs.mkdirSync(customBasePath, {recursive: true});

        fs.writeFileSync(
          `${customBasePath}/${attachment.storeName}`,
          await sharp(`${basePath}/${attachment.storeName}`, { failOnError: false })
          .rotate()
          .resize({width: size})
          .toBuffer()
        )
        
      }
    }
    if(!fs.existsSync(`${customBasePath}/${attachment.storeName}`))
      throw new NotFoundException();
    return fs.createReadStream(
      `${customBasePath}/${attachment.storeName}`,
      {highWaterMark: BUFFER_SIZE}
    )
  }

  getAttachments( attachmentIds: Array<string> ): Promise<Array<Attachment>> {
    if(!attachmentIds || attachmentIds.length === 0)
      throw BASIC_EXCEPTION.EMPTY_CONTENT;

    
    return this.connection.getCustomRepository(AttachmentRepository)
    .findByIds(attachmentIds)
    .then(result => {
      if(result.length !== attachmentIds.length) 
        throw BASIC_EXCEPTION.EMPTY_CONTENT;

      result.sort((a,b) => {
        return attachmentIds.findIndex(attcId => attcId === a.id)
          - attachmentIds.findIndex(attcId => attcId === b.id)
      })  
      return result;
    });
    

  }
}