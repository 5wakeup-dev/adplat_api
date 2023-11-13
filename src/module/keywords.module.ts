import { Module } from "@nestjs/common";
import { KeywordsController } from "src/controller/keywords.controller";
import { KeywordsService } from "src/service/keywords.service";

@Module({
  imports: [],
  providers: [KeywordsService],
  controllers: [KeywordsController]
})
export class KeywordsModule {}