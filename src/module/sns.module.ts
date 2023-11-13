import { Module } from "@nestjs/common";
import { SnsController } from "src/controller/sns.controller";
import { SnsService } from "src/service/sns.service";


@Module({
  providers: [ SnsService ],
  controllers: [ SnsController ],
  exports: [ SnsService ] 
})
export class SnsModule {}