import { Module } from "@nestjs/common";
import { MenusController } from "src/controller/menus.controller";
import { MenusService } from "src/service/menus.service";

@Module({
  // imports: [],
  providers: [ MenusService ],
  controllers: [ MenusController ],
  exports: [ MenusService ]
})
export class MenusModule {

}