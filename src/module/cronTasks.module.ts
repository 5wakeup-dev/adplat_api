import { Module } from "@nestjs/common";
import { CronTasksService } from "src/service/cronTasks.service";
import { MenusService } from "src/service/menus.service";

import { NotificationsService } from "src/service/notifications.service";


@Module({
  providers: [CronTasksService,MenusService, NotificationsService]
})
export class CronTasksModule {}