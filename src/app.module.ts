import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { envFilePath } from 'src/config/booting.config'
import { BasicTypeormModule } from './module/basicTypeorm.module'
import { MenusModule } from './module/menus.module';
import { loggingInterceptorProvider } from './interceptor/logging.interceptor';
import { allExceptionFilter } from './filter/all-exception.filter';
import { basicExceptionFilter } from './filter/basic-exception.filter';
import { catchMustBeEntityErrorFilter, catchQueryFiledErrorFilter } from './filter/typeorm-exception.filter';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ErrorEntity } from './entity/error/error.entity';
import { MenuSubscriber } from './interceptor/menu.subscriber';
import { MembersModule } from './module/members.module';
import { ManagerHistorySubscriber, ManagerSubscriber, RoleSubscriber, UserHistorySubscriber, UserSubscriber } from './interceptor/member.subscriber';
import { ArtworksModule } from './module/artworks.module';
import { ArtworkI18nSubscriber } from './interceptor/artwork.subscriber';
import { CommModule } from './module/comm.module';
import { ConsultingsModule } from './module/consultings.module';
import { ConsultingSubscriber } from './interceptor/consulting.subscriber';
import { EnvironmentsModule } from './module/environments.module';
import { TestController } from './controller/test.controller';
import { NotificationModule } from './module/notifications.module';
import { NotificationErrorSubscriber, NotificationSubscriber } from './interceptor/notification.subscriber';
import { SnsModule } from './module/sns.module';
import { NotesModule } from './module/notes.module';
import { KeywordsModule } from './module/keywords.module';
import { RepliesModule } from './module/replies.module';
import { ReplyHierarchicalSubscriber, ReplySubscriber } from './interceptor/reply.subscriber';
import { ScheduleModule } from '@nestjs/schedule';
import { AttachmentsModule } from './module/attachment.module';

import { BlockMembersModule } from './module/blockMembers.module';
import { MailerModule } from '@nestjs-modules/mailer';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter';
import * as path from 'path';
import { NotificationsService } from './service/notifications.service';
import { ReserveRequestModule } from './module/reserveRequest.module';
import { CronTasksModule } from './module/cronTasks.module';
import { NetAddressSubscriber } from './interceptor/netAddress.subscriber';


@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath,
      isGlobal: true
    }),
    ScheduleModule.forRoot(),
    BasicTypeormModule,
    TypeOrmModule.forFeature([ErrorEntity]),
    MailerModule.forRoot({
      template: {
        adapter: new HandlebarsAdapter(),
        // dir: path.join( path.normalize(`${__dirname}/../`), '/template/email/' )
        dir: path.join( process.env.PATH_PROJECT, '/src/template/' )
      },
      defaults: {
        from: `"${process.env.MAIL_SENDER_NAME}" <${process.env.MAIL_SENDER_ADDRESS}>`
      },
      transport: {
        connectionTimeout: 15000,
        host: process.env.MAIL_HOST,
        port: Number(process.env.MAIL_PORT),
        auth: {
          user: process.env.MAIL_USER,
          pass: process.env.MAIL_PASSWORD
        },
        tls: {
          rejectUnauthorized: false
        }
      }
    }),
    NotificationModule,
    AttachmentsModule,
    CommModule,
    SnsModule,
    EnvironmentsModule,
    MenusModule,
    MembersModule,
    ArtworksModule,
    ConsultingsModule,
    RepliesModule,
    NotesModule,
    CronTasksModule,
    // IamportModule,
    KeywordsModule,
    
    BlockMembersModule,
    ReserveRequestModule
  ],
  controllers: [ TestController ],
  providers: [
    loggingInterceptorProvider,
    /** Error Filter START */
    allExceptionFilter,
    basicExceptionFilter,
    catchMustBeEntityErrorFilter,
    catchQueryFiledErrorFilter,
    /** Error Filter E N D */
    


    /** typeorm subscribers START */
    RoleSubscriber,
    MenuSubscriber,
    ManagerSubscriber, ManagerHistorySubscriber, UserSubscriber, UserHistorySubscriber,
    ArtworkI18nSubscriber,
    ConsultingSubscriber,
    NetAddressSubscriber,
    NotificationSubscriber,
    NotificationErrorSubscriber,
    ReplySubscriber,
    ReplyHierarchicalSubscriber,
    /** typeorm subscribers E N D */


    /** subscriber용 알림 관련 service START */
    // FirebaseService,
    NotificationsService,
    // SharpProductsService,
    /** subscriber용 알림 관련 service END */

  ],
})
export class AppModule {}
