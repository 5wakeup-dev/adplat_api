
import { Module } from "@nestjs/common";
import { NotificationsController } from "src/controller/notifications.controller";
import { AttachmentsService } from "src/service/attachments.service";
import { NotificationsService } from "src/service/notifications.service";

@Module({
  imports: [
    // MailerModule.forRoot({
    //   template: {
    //     adapter: new HandlebarsAdapter(),
    //     // dir: path.join( path.normalize(`${__dirname}/../`), '/template/email/' )
    //     dir: path.join( process.env.PATH_PROJECT, '/src/template/' )
    //   },
    //   defaults: {
    //     from: `"${process.env.MAIL_SENDER_NAME}" <${process.env.MAIL_SENDER_ADDRESS}>`
    //   },
    //   transport: {
    //     connectionTimeout: 15000,
    //     host: process.env.MAIL_HOST,
    //     port: Number(process.env.MAIL_PORT),
    //     auth: {
    //       user: process.env.MAIL_USER,
    //       pass: process.env.MAIL_PASSWORD
    //     },
    //     tls: {
    //       rejectUnauthorized: false
    //     }
    //   }
    // })
  ],
  providers: [ NotificationsService, AttachmentsService ],
  controllers: [ NotificationsController ]
})
export class NotificationModule {}