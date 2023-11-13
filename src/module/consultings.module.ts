import { Module } from "@nestjs/common";
import { ConsultingsController } from "src/controller/consultings.controller";
import { ConsultingsService } from "src/service/consultings.service";
import { CommModule } from "./comm.module";
import { MenusModule } from "./menus.module";

@Module({
  imports: [CommModule, MenusModule],
  providers: [ConsultingsService],
  controllers: [ConsultingsController]
})
export class ConsultingsModule {}