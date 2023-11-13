import { Module } from "@nestjs/common";
import { AttachmentsService } from "src/service/attachments.service";
import { KeywordsService } from "src/service/keywords.service";
import { NetAddressesService } from "src/service/netAddress.service";


@Module({
  providers: [ AttachmentsService, NetAddressesService, KeywordsService ],
  exports: [ AttachmentsService, NetAddressesService, KeywordsService ]
})
export class CommModule {
  constructor(){}
}