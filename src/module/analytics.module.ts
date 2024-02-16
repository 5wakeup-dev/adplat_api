import { Module } from "@nestjs/common";
import { CommModule } from "./comm.module";
import { AnalyticsController } from "src/controller/analytics.controller";
import { MenusService } from "src/service/menus.service";


@Module({
  imports: [CommModule],
  providers: [MenusService],
  controllers: [AnalyticsController]
})
export class AnalyticsModule {

}