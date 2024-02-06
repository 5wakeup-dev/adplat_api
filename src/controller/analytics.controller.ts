import { Controller, Get } from "@nestjs/common";
import * as dayjs from "dayjs";
import { VisitorCount } from "src/entity/analytics/visitorCount.entity";

import { Connection } from "typeorm";

@Controller('/analytics')
export class AnalyticsController {
  constructor(
    private connection: Connection,
  ) { }


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
