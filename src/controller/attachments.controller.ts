import { Controller, Get, Param, Post, Query, Res, UploadedFiles, UseInterceptors } from "@nestjs/common";
import { Response } from 'express'
import { AnyFilesInterceptor } from "@nestjs/platform-express";
import { Attachment, AttachmentRes } from "src/entity/comm/attachment.entity";
import { dynamicPipe } from "src/pipe/dynamic.pipe";
import { AttachmentsService } from "src/service/attachments.service";
import { isNumberForm } from "src/util/format.util";
import { initBoolean } from "src/util/index.util";
import { Connection } from "typeorm";
import { RequestAttachmentType } from "src/entity/comm/comm.interface";
import { Manager } from "src/entity/member/manager.entity";
import { Auth } from "src/decorator/auth.decorator";
import { BASIC_EXCEPTION } from "src/exception/basic.exception";


const BOOLEAN_PIPE = dynamicPipe<any, boolean>(({ value: val }) => {
  return val === '' ? true : initBoolean(val)
})

const NUMBER_PIPE = dynamicPipe<any, number>(({ value: val }) =>
  isNumberForm(val) ? Number(val) : undefined
)
const ATTACHMENT_REQIEST_TYPE_PIPE = dynamicPipe<RequestAttachmentType>(({ value: val }) =>
  ['attachments', 'form-data'].includes(val) ? val : undefined
)
@Controller('/attachments')
export class AttachmentsController {
  constructor(
    private connection: Connection,
    private attachmentsService: AttachmentsService
  ) { }


  /**[CREATE] 파일 저장하기
  ** force 쿼리를 통해 저장될 수 없는 파일을 무시할 수 있다.
  ** 그외에는 저장될 수 없는 파일이 존재하는 경우 모든 파일을 업로드하지 않음.
  ** 
  ** @param files: multipart
  ** @param force: 존재여부를 확인.(아무 값이나 넣으면 활성화)
  ** @returns 
  */
  @Post()
  @UseInterceptors(AnyFilesInterceptor({
    fileFilter: (_req: any, _file, cb) => {
      /**요청자측에서 변조 가능. 
       * 실질적인 부분은 buffer의 메타데이터 파싱 필요.
       * 1차적으로 간단한 필터 기능
       */
      cb(null, true); //통과
      // cb(null, false); //불가
      // cb(new Error()) //throws

    }
  }))
  async postAttachments(
    @UploadedFiles() files: Array<Express.Multer.File>,
    @Query('force', BOOLEAN_PIPE) force: any,
    // @Auth() auth: User|Manager
  ): Promise<Array<AttachmentRes>> {

    return this.attachmentsService.createAttachments(files, force)
      .then(attcs => attcs.map(attc => new AttachmentRes(attc)));
  }

  /**[READ] 파일 정보 가져오기
  ** 
  ** @param id: 파일 고유키
  ** @returns: 파일 정보
  **/
  @Get('/info/:attachment_id')
  async getAttachment(
    @Param('attachment_id') id: string,
  ): Promise<AttachmentRes> {

    return this.attachmentsService.getAttachments(id ? [id] : undefined)
      .then(attcs => new AttachmentRes(attcs[0]));
  }

  /**[READ] 실제 파일 가져오기
  ** 
  ** @param id: 파일 고유키
  ** @returns: 실제 파일.
  **/
  @Get(':attachment_id')
  async getFile(
    @Auth(Manager) auth: Manager,
    @Param('attachment_id') id: string,
    @Res() res: Response,
    @Query('size', NUMBER_PIPE) size?: number,
    @Query('type', ATTACHMENT_REQIEST_TYPE_PIPE) type?: string
  ) {
    //  type = ['attachments', 'form-data'].includes(type) ? `${type}; ` : undefined
    if (id === "reserve" && !auth)
      throw BASIC_EXCEPTION.NOT_ALLOW_AUTH;

    type = type ? `${type};` : undefined;
    const attachment: Attachment = (await this.attachmentsService.getAttachments(id ? [id] : undefined))[0];
    const readStream = await this.attachmentsService.findFileAndCreateIfNotFoundSize(attachment, size);
    // res.setHeader('Content-Disposition', `attachment; filename="${encodeURI(attachment.originName)}"`)
    res.setHeader('Content-Disposition', `${type || ''}filename="${encodeURI(attachment.originName)}"`)
    res.contentType(attachment.mimeType);
    if (!size)
      res.setHeader('Content-Length', attachment.size)

    readStream.pipe(res);
  }
}