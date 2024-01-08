import { Module } from "@nestjs/common";
import { CommModule } from "./comm.module";
import { PointsService } from "src/service/points.service";
import { PointsController } from "src/controller/points.controller";


@Module({
  imports: [ CommModule ],
  providers: [ PointsService ],
  controllers: [ PointsController ]
})
export class PointsModule {

}