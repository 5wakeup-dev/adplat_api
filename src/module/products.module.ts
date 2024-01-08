import { Module } from "@nestjs/common";
import { CommModule } from "./comm.module";
import { ProductsService } from "src/service/products.service";
import { ProductsController } from "src/controller/products.controller";
import { MenusModule } from "./menus.module";


@Module({
  imports: [CommModule, MenusModule],
  providers: [ProductsService],
  controllers: [ProductsController]
})
export class ProductsModule {

}