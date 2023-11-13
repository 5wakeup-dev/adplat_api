import { Module } from "@nestjs/common";
import { NotificationsService } from "src/service/notifications.service";
import { CommModule } from "./comm.module";
import { ReserveRequestService } from "src/service/reserveRequest.service";
import { ReserveRequestController } from "src/controller/reserveRequest.controller";

@Module({
  imports: [CommModule],
  providers: [ReserveRequestService, NotificationsService],
  controllers: [ReserveRequestController]
})
export class ReserveRequestModule {}