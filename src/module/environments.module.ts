import { Module } from "@nestjs/common";
import { EnvironmentsController } from "src/controller/environments.controller";
import { EnvironmentsService } from "src/service/environments.service";


@Module({
  imports: [],
  controllers: [ EnvironmentsController ],
  providers: [ EnvironmentsService ]
})
export class EnvironmentsModule {}