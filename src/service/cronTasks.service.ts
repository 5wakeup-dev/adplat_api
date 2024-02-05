import { Injectable, Logger } from "@nestjs/common";
import { TABLE_ALIAS } from "src/config/typeorm.config";
import { Connection } from "typeorm";
import { NotificationsService } from "./notifications.service";
import { Cron, SchedulerRegistry } from "@nestjs/schedule";
import { TransactionHelper, TransactionHelperParam, getRepositories } from "src/util/typeorm.util";
import { ArtworkRepository } from "src/repository/artwork/artwork.repository";
import { MenusService } from "./menus.service";
import * as dayjs from "dayjs";
import { getRange, initNumber } from "src/util/index.util";
import { Range } from "src/type/index.type";
import { isNumberForm } from "src/util/format.util";
import { ProductRepository } from "src/repository/product/product.repository";

const {
  MANAGERS
} = TABLE_ALIAS;

@Injectable()
export class CronTasksService {
  private readonly logger = new Logger(CronTasksService.name);
  constructor(
    private connection: Connection,
    private notificationsService: NotificationsService,
    private menuService: MenusService,
  ) { }
  @Cron('0 5 0 * * *', {
  // @Cron('0/10 * * * * *', {
    name: 'updateEndTime',
    timeZone: 'Asia/Seoul'
  })
  @TransactionHelper({ paramIndex: 0 })
  async updateArtworkAdState(
    transaction: TransactionHelperParam = { connection: this.connection, entityManager: this.connection.manager }
  ) {
    const repos = getRepositories({
      artworks: ProductRepository
    }, transaction.entityManager);

    const menuIds = (await this.menuService.getMenus({
      absoluteKey: "travel.ad", branchType: "deep",
      self: true, metaKey: undefined, metaVal: undefined
    })).map(({ id }) => id);
    const range = `,${dayjs().startOf("d").valueOf()}`
    const parseRange = getRange<Date>(range as string, v => isNumberForm(v) ? dayjs(initNumber(v)).toDate() : undefined)
    const arts = await repos.artworks.getMany(["menu"], ctx => ctx.searchQuery({ menuIds, range: parseRange, state: [1, 2] }))

    if (arts && arts.length > 0) {
      arts.forEach(a => {
        a.state = 0
      })
      
      await repos.artworks.save(arts)
    }
  }


  @Cron('0 0 9 * * *', {
    name: 'checkEndTime',
    timeZone: 'Asia/Seoul'
  })
  @TransactionHelper({ paramIndex: 0 })
  async checkArtworkAdEnd(
    transaction: TransactionHelperParam = { connection: this.connection, entityManager: this.connection.manager }
  ) {
    const repos = getRepositories({
      artworks: ProductRepository
    }, transaction.entityManager);

    const menuIds = (await this.menuService.getMenus({
      absoluteKey: "travel.ad", branchType: "deep",
      self: true, metaKey: undefined, metaVal: undefined
    })).map(({ id }) => id);

    // const targetEnd = dayjs().add(1, "month").format("YYYY-MM-DD 23:59:59")
    const targetEnd = dayjs().add(1, "month").endOf("d").valueOf()
    //range로 짜서 해당 한달 이전 모든 artworks체크하기
    //하루하루 알림이 갈테니 이미 보낸 artworks체크하기
    const range = `,${targetEnd}`
    const parseRange = getRange<Date>(range as string, v => isNumberForm(v) ? dayjs(initNumber(v)).toDate() : undefined)
    // const arts = await repos.artworks.getMany(["ranges", "menu"], ctx => ctx.searchQuery({ menuIds, state: [1], targetEnd }))
    const arts = await repos.artworks.getMany(["menu"], ctx => ctx.searchQuery({ menuIds, state: [1], range: parseRange }))
    if (arts && arts.length > 0) {
      //알림 짜기
      // arts.forEach(a => {
      //   a.state = 2;
      // })

      // await repos.artworks.save(arts)
    }
  }
}

