import { Module } from "@nestjs/common";
import { ManagersController } from "src/controller/managers.controller";
import { MembersController } from "src/controller/members.controller";
import { UsersController } from "src/controller/users.controller";
import { AttachmentsService } from "src/service/attachments.service";
import { ConsultingsService } from "src/service/consultings.service";
import { ManagersService } from "src/service/managers.service";
import { MembersService } from "src/service/members.service";
import { MenusService } from "src/service/menus.service";
import { NotificationsService } from "src/service/notifications.service";
import { UsersService } from "src/service/users.service";


@Module({
  imports: [],
  providers: [  AttachmentsService, MembersService, ManagersService, UsersService, NotificationsService, ConsultingsService, MenusService ],
  controllers: [ MembersController, ManagersController, UsersController ],
})
export class MembersModule {}