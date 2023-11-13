import { Module } from "@nestjs/common";
import { NotesController } from "src/controller/notes.controller";
import { NotesService } from "src/service/notes.service";
import { CommModule } from "./comm.module";

@Module({
  imports: [CommModule],
  providers: [NotesService],
  controllers: [NotesController]
})
export class NotesModule {}