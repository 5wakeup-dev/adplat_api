import { Module } from "@nestjs/common";
import { AttachmentsController } from "src/controller/attachments.controller";
import { AttachmentsService } from "src/service/attachments.service";


@Module({
  // imports: [
    
  // ]

  providers: [
    AttachmentsService
  ],
  controllers: [
    AttachmentsController
  ]
})
export class AttachmentsModule {

}