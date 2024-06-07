import { Controller, Get, Query } from "@nestjs/common";
import * as dayjs from "dayjs";
import { VisitorCount } from "src/entity/analytics/visitorCount.entity";
import { ConsultingRepository } from "src/repository/consulting/consulting.repository";
import { StoreRepository } from "src/repository/member/store.repository";
import { UserRepository } from "src/repository/member/user.repository";
import { ProductRepository } from "src/repository/product/product.repository";
import { MenusService } from "src/service/menus.service";
import { getRepositories } from "src/util/typeorm.util";

import { Connection } from "typeorm";

@Controller('/analytics')
export class AnalyticsController {
  constructor(
    private connection: Connection,
    private menusService: MenusService

  ) { }

  @Get("/main")
  async mainCountings(
  ): Promise<{ total: number, today: number, products: number, store: number, user: number, qna: number }> {
    const visitor = this.connection.getRepository(VisitorCount)

    const toDayresult = await visitor.findOne({ where: { type: "TODAY", targetDate: dayjs().startOf("date").toDate() } })
    const totalResult = await visitor.findOne({ type: "TOTAL" })
    const repos = getRepositories({
      product: ProductRepository,
      user: UserRepository,
      store: StoreRepository,
      consulting: ConsultingRepository
    }, this.connection.manager);
    const storeCount = await repos.store.count();
    const userCount = await repos.user.count();
    const productCount = await repos.product.count()
    const menuIds = (await this.menusService.getMenus({
      absoluteKey: "qna", branchType: "deep",
      self: true,
    })).map(({ id }) => id);
    const qnaCount = await repos.consulting.searchQuery({ menuIds: menuIds }).getCount()

    return { today: toDayresult?.count || 0, total: totalResult.count, products: productCount, qna: qnaCount, store: storeCount, user: userCount }
  }

  @Get("/visitor/calendar")
  async getVisitorCalendar(
    @Query('today') today: string,
    @Query('limit') limit: number = 10, // 기본값을 10으로 설정
  ): Promise<any[]> {
    const visitor = this.connection.getRepository(VisitorCount)
    // const monthDay = dayjs().add(-7, 'day').toDate()
    // const rowData = await visitor
    //   .createQueryBuilder()
    //   .select("DATE_FORMAT(target_date, '%Y-%m-%d')", 'targetDate')
    //   .addSelect('count', 'count')
    //   .andWhere(`target_date >=:monthDay`, { monthDay })
    //   .andWhere(`type = "today"`)
    //   .orderBy(`targetDate`, "DESC")
    //   .getRawMany();

      const todayDate = today ? dayjs(parseInt(today)).startOf('day').toDate() : dayjs().startOf('day').toDate();
      const weekAgoDate = dayjs(todayDate).add(-7, 'days').toDate();
      const rowData = await visitor
        .createQueryBuilder()
        .select("DATE_FORMAT(target_date, '%Y-%m-%d')", 'targetDate')
        .addSelect('count', 'count')
        .where(`target_date BETWEEN :weekAgoDate AND :todayDate`, { weekAgoDate, todayDate })
        .andWhere(`type = "today"`)
        .orderBy(`targetDate`, "DESC")
        .getRawMany();
    return rowData
  }
  @Get()
  async counting(
  ): Promise<any> {
    const visitor = this.connection.getRepository(VisitorCount)
    const toDayresult = await visitor.findOne({ where: { type: "TODAY", targetDate: dayjs().startOf("date").toDate() } })

    if (toDayresult) {
      const { count } = toDayresult
      const parseCount = typeof (count) === "string" ? parseInt(count) : count
      toDayresult.count = parseCount + 1
      await visitor.save(toDayresult)
    } else {
      await visitor.save({ type: "TODAY", count: 1, targetDate: dayjs().startOf("date").toDate() })
    }
    const totalResult = await visitor.findOne({ type: "TOTAL" })
    if (totalResult) {
      const { count } = totalResult;
      const parseCount = typeof (count) === "string" ? parseInt(count) : count
      totalResult.count = parseCount + 1
      await visitor.save(totalResult)
    } else {
      await visitor.save({ count: 1, type: "TOTAL" })
    }
    return await visitor.findOne()

  }


}
