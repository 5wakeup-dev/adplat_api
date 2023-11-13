import { Module } from "@nestjs/common";
import { ArtworksController } from "src/controller/artworks.controller";
import { ArtworksService } from "src/service/artworks.service";
import { CommModule } from "./comm.module";
import { MenusModule } from "./menus.module";


@Module({
  imports: [ CommModule, MenusModule ],
  providers: [ ArtworksService ],
  controllers: [ ArtworksController ]
})
export class ArtworksModule {

}