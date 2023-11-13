import { Body, Controller, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { Auth } from "src/decorator/auth.decorator";
import { Manager } from "src/entity/member/manager.entity";
import { User } from "src/entity/member/user.entity";
import { Notification, NotificationDto, NotificationReq, NotificationRes } from "src/entity/notification/notification.entity";
import { SearchNotificationDto } from "src/entity/notification/notification.interface";
import { dividePipe } from "src/pipe/divide.pipe";
import { dynamicPipe } from "src/pipe/dynamic.pipe";
import { fitPipe } from "src/pipe/fit.pipe";
import { selectPipe } from "src/pipe/select.pipe";
import { NotificationRepository } from "src/repository/notification/notification.repository";
import { AttachmentsService } from "src/service/attachments.service";
import { NotificationsService } from "src/service/notifications.service";
import { entityOtherDelete, notificationUtil } from "src/util/entity.util";
import { ListPageRes } from "src/util/entity/listPage";
import { initArray, initBoolean, initNumber } from "src/util/index.util";
import { getRepositories, PathString } from "src/util/typeorm.util";
import { Connection } from "typeorm";

const NOTIFICATION_FIT_PIPE = fitPipe<NotificationReq>([
  "attachments", "buttons", "creator", "data",
  "key", "media", "method",
  "receiverManager", "receiverName", "receiverUser",
  "reserve_date", "templateId", "title", "type", "templateData", "relation", "relationUk"
])

const NOTIFICATION_SEARCH_NUMBER_PIPE = dynamicPipe<SearchNotificationDto>(({value}) => {
  (['curPage', 'rowPerPage', 'pagePerBlock'] as Array<keyof SearchNotificationDto>)
    .forEach(key => {
      const val = value[key];
      if(val !== undefined) {
        value[key] = initNumber(val) as never;
      }
    })
  return value;
})
const NOTIFICATION_SEARCH_SELECT_PIPE = selectPipe<SearchNotificationDto>({
  state: (_, val) => initArray(val),
  uks: (_, val) => initArray<string>(val, v => !!v)
})
const NOTIFICATION_SEARCH_FIT_PIPE = fitPipe<SearchNotificationDto>([
  'curPage', 'rowPerPage', 'pagePerBlock', 'orderBy',
  'uk', 'state', 'managerUk', 'receiverManagerUk',
  'receiverUserUk', 'receiverContractorUk', 'creator',
  'type', 'media', 'reserve_date', 'uks'
])

@Controller('/notifications')
export class NotificationsController {
  constructor(
    private connection: Connection,
    private notificationsService: NotificationsService,
    private attachmentsService: AttachmentsService
  ){}

  @Post()
  async postNotification(
    @Body(NOTIFICATION_FIT_PIPE) body: NotificationReq,
    @Auth(Manager) auth: Manager
  ): Promise<NotificationRes> {
    const dto: NotificationDto = await notificationUtil.reqToDto(
      body, auth,
      {
        attachmentsService: this.attachmentsService,
        entityManager: this.connection.manager
      }
    )

    return this.notificationsService.postNotification(dto, auth)
      .then(noti => new NotificationRes(noti));
  }

  @Get('/:notification_uk')
  async getNotification(
    @Param('notification_uk') notificationUk: string,
    @Auth() auth: User|Manager,
    @Query('detail', dividePipe()) details: Array<PathString<Notification>>,
  ): Promise<NotificationRes> {
    
    return this.notificationsService.getNotification(notificationUk)
    .then( async notf => {
      await this.connection.getCustomRepository(NotificationRepository)
      .setProperty( { details, data: {auth} }, [notf] )
      return new NotificationRes(notf)
    });

  }

  @Get('notification/page')
  async getNotificationListPage(
    @Query(
      NOTIFICATION_SEARCH_NUMBER_PIPE,
      NOTIFICATION_SEARCH_FIT_PIPE,
      NOTIFICATION_SEARCH_SELECT_PIPE
    ) search: SearchNotificationDto,
    @Auth() auth: Manager,
    @Query(
      'detail', dividePipe()
    ) details: Array<PathString<Notification>>,
    @Query(
      'removeDetail', 
      dynamicPipe(({value}) => value === '' ? true : initBoolean(value))
    ) isRemoveDetail: boolean
  ): Promise<ListPageRes<NotificationRes>> {
    return this.notificationsService.getNotificationListPage(search, auth)
      .then(async ({page, list}) => {
        await this.connection.manager.getCustomRepository(NotificationRepository)
          .setProperty({details, data: {auth}}, list);
        if(isRemoveDetail) {
          entityOtherDelete(list, details);
        }

        return {
          page,
          list: list.map(noti => new NotificationRes(noti))
        }
      });
  }

  @Post('/:notification_uk')
  async postSendNotification(
    @Param('notification_uk') notificationUk: string,
    @Body() uks: string[]
  ): Promise<Array<NotificationRes>> {
    const repos = getRepositories({
      notification: NotificationRepository
    }, this.connection.manager)
    const notification = await repos.notification
    .getOne(
      undefined,
      ctx => ctx.searchQuery()
      .where(`${ctx.alias}.uk = :uk`, {uk: notificationUk})
    );

    const notifications = await repos.notification.getMany(
      undefined,
      ctx => ctx.searchQuery()
      .where(`${ctx.alias}.uk IN (:uks)`, {uks})
    );

    return this.notificationsService.sendNotifications([...notifications, notification])
      .then(notis => notis.map(noti => new NotificationRes(noti)));
    
    // const conn = getConnection();
    // const arr = this.notificationsService.sendMails([...notifications, notification])
    // arr.then( result => {
    //   console.log(result);
    // })
    // return null;
  }

  @Patch('/:notification_uk')
  async patchNotification(
    @Param('notification_uk') notificationUk: string,
    @Body(NOTIFICATION_FIT_PIPE) body: NotificationReq,
    @Auth(Manager) auth: Manager
    ): Promise<NotificationRes> {
    const repos = getRepositories({
      notification: NotificationRepository
    }, this.connection.manager)
    const notification = await repos.notification
    .getOne(
      ['manager', 'buttons'],
      ctx => ctx.searchQuery()
      .where(`${ctx.alias}.uk = :uk`, {uk: notificationUk})
    )

    const dto: NotificationDto = await notificationUtil.reqToDto(
      body, auth,
      {
        origin: notification,
        attachmentsService: this.attachmentsService,
        entityManager: this.connection.manager
      }
    )

    return this.notificationsService.patchNotification(notification, dto, auth)
      .then(noti => new NotificationRes(noti));
  }

}