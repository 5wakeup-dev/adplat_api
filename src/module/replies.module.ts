import { Module } from "@nestjs/common";
import { RepliesController } from "src/controller/replies.controller";
import { RepliesService } from "src/service/replies.service";
import { CommModule } from "./comm.module";


@Module({
  imports: [ CommModule ],
  providers: [ RepliesService ],
  controllers: [RepliesController ]
})
export class RepliesModule {}