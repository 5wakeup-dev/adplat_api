import { Module } from "@nestjs/common";
import { CommModule } from "./comm.module";
import { AnalyticsController } from "src/controller/analytics.controller";


@Module({
  imports: [CommModule],
  providers: [],
  controllers: [AnalyticsController]
})
export class AnalyticsModule {

}