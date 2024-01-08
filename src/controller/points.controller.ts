import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";
import * as dayjs from "dayjs";
import { TABLE_ALIAS, UK_PREFIX } from "src/config/typeorm.config";
import { Auth } from "src/decorator/auth.decorator";
import { Manager } from "src/entity/member/manager.entity";
import { User } from "src/entity/member/user.entity";
import { NegativePointDto, NegativePointRes } from "src/entity/point/negativePoint.entity";
import { SearchNegativePoint, SearchPositivePoint } from "src/entity/point/point.interface";
import { PositivePointDto, PositivePointRes } from "src/entity/point/positivePoint.entity";
import { SearchReserveDto } from "src/entity/reserve/reserveRequest.entity";
import { dividePipe } from "src/pipe/divide.pipe";
import { dynamicPipe } from "src/pipe/dynamic.pipe";
import { fitPipe } from "src/pipe/fit.pipe";
import { selectPipe } from "src/pipe/select.pipe";
import { ManagerRepository } from "src/repository/member/manager.repository";
import { UserRepository } from "src/repository/member/user.repository";
import { NegativePointRepository } from "src/repository/point/negativePoint.repository";
import { PositivePointRepository } from "src/repository/point/positivePoint.repository";
import { PointsService } from "src/service/points.service";
import { ListPageRes } from "src/util/entity/listPage";
import { initNumber, splitToObject } from "src/util/index.util";
import { getRepositories, PathString } from "src/util/typeorm.util";
import { Connection } from "typeorm";
const {
  NEGATIVE_POINTS
} = TABLE_ALIAS;
const NEGATIVE_FIT_PIPE = fitPipe<NegativePointDto>([
  'title', 'price', 'cancelId'
])

const SEARCH_NUMBER_PIPE = dynamicPipe<SearchReserveDto>(({ value }) => {
  (['curPage', 'rowPerPage', 'pagePerBlock'] as Array<keyof SearchReserveDto>)
    .forEach(key => {
      const val = value[key];
      if (val !== undefined) {
        value[key] = initNumber(val) as never;
      }
    })
  return value;
})
const SEARCH_SELECT_PIPE = selectPipe<SearchReserveDto>({
  // state: (_, val) => initArray(val),
  orderBy: (_, val) => {
    const { column, order } = splitToObject(
      val,
      ['column', 'order'],
      {
        limit: [['id', 'view', 'reg_date', 'state'], ['DESC', 'ASC']],
        def: { column: 'reg_date', order: 'DESC' }
      }
    );
    return `${column}-${order}`
  }
  // startRange: ( _, val ) => getRange<Date>(val as string, v => isNumberForm(v) ? dayjs( initNumber(v) ).toDate() : undefined),
  // endRange: ( _, val ) => getRange<Date>(val as string, v => isNumberForm(v) ? dayjs( initNumber(v) ).toDate() : undefined),

})
const POSITIVE_SEARCH_FIT_PIPE = fitPipe<SearchPositivePoint>([
  'curPage', 'rowPerPage', 'pagePerBlock', 'orderBy', 'secondOrderBy', 'isRemaining', 'title', 'ids', 'memberUk'
])

@Controller('points')
export class PointsController {
  constructor(
    private connection: Connection,
    private pointsService: PointsService,
  ) { }


  /**[CREATE] 포인트 생성하기
   * 
   * @param managerUk 생성할 대상(manager 유니크키)
   * @param body 생성할 바디
   * @param manager: 요청자 세션 정보
   * @returns 
   */
  @Post('/users/:user_uk')
  async postUserPoint(
    @Param('user_uk') userUk: string,
    @Body() body: PositivePointDto,
    @Auth(Manager) manager: Manager
  ): Promise<number> {
    const repos = getRepositories({
      user: UserRepository,
      positive: PositivePointRepository
    }, this.connection.manager);
    const target: User = await repos.user.findOne({ where: { uk: userUk } });
    const dto = { ...body }
    if (target)
      dto[target.type.toLowerCase()] = target;

    return this.pointsService.createPoint(dto, manager)
      .then(_ => repos.positive.getRemainingPoint(target)
        .then(pp => pp.map(positivePoint => positivePoint.remaining)
          .reduce((a, b) => a + b, 0))

      );
  }


  @Post('/negative/users/:user_uk')
  async useUserPoint(
    @Param('user_uk') userUk: string,
    @Body(NEGATIVE_FIT_PIPE) body: NegativePointDto,
    @Auth(Manager) auth: Manager
  ): Promise<number> {

    const repos = getRepositories({
      user: UserRepository,
      positive: PositivePointRepository
    }, this.connection.manager);

    const user: User = await repos.user.getOne(
      [],
      ctx => ctx.searchQuery()
        .where(`${ctx.alias}.uk = :userUk`, { userUk })
    )

    return this.pointsService.usePointFromRoot(body, user, auth)
      .then(async (_) => await repos.positive.getRemainingPoint(user)
        .then(positivePoints =>
          positivePoints.map(positivePoint => positivePoint.remaining)
            .reduce((a, b) => a + b, 0)
        )

      )
  }

  @Get('/positive')
  getPositivePoints(
    @Auth() auth: Manager | User,
    @Query(
      POSITIVE_SEARCH_FIT_PIPE,
      SEARCH_NUMBER_PIPE,
      SEARCH_SELECT_PIPE
    ) search: SearchPositivePoint,
    @Query(
      'detail', dividePipe()
    ) details: Array<PathString<PositivePointDto>>
  ): Promise<ListPageRes<PositivePointRes>> {

    return this.pointsService.getPositivePoints(search, auth)
      .then(async ({ list, page }) => {

        await this.connection.manager
          .getCustomRepository(PositivePointRepository)
          .setProperty(details, list);
        return {
          page,
          list: list.map(positivePoint => new PositivePointRes(positivePoint))
        }
      });
  }


  @Get('/negative')
  getNegativePoints(
    @Auth() auth: Manager | User,
    @Query(
      POSITIVE_SEARCH_FIT_PIPE,
      SEARCH_NUMBER_PIPE,
      SEARCH_SELECT_PIPE
    ) search: SearchNegativePoint,
    @Query(
      'detail', dividePipe()
    ) details: Array<PathString<NegativePointDto>>
  ): Promise<ListPageRes<NegativePointRes>> {

    return this.pointsService.getNativePoints(search, auth)
      .then(async ({ list, page }) => {

        await this.connection.manager
          .getCustomRepository(NegativePointRepository)
          .setProperty(details, list);
        return {
          page,
          list: list.map(negative => new NegativePointRes(negative))
        }
      })

  }


  @Delete('/negative/:negative_id')
  async deleteNegativePoint(
    @Param('negative_id') negativeId: number,
    @Auth() auth: Manager | User,
  ): Promise<PositivePointRes> {

    const repos = getRepositories({
      negative: NegativePointRepository,
      positive: PositivePointRepository
    }, this.connection.manager);

    // const negative = await repos.negative
    //   .searchQuery({ids:[negativeId]})
    //   .where(`${NEGATIVE_POINTS}.id = :id`, { id: negativeId })
    //   .getOne();
    const negative = await repos.negative.getOne(["negativeHistories.positivePoint", "user", "manager"], ctx => ctx.searchQuery({ ids: [negativeId] }))
    // if (negative)
    //   await repos.negative.setProperty(['negativeHistories.positivePoint', 'manager', 'user'], [negative]);

    // const negative = await this.pointsSupporter.negativePoints.findOne({relations: ['negativeHistories'], where:{id: negativeId}});

    return this.pointsService.cancelPoint(negative, `[취소] ${negative.title}`, auth)
      .then(positive => new PositivePointRes(positive));
  }


  @Get(['/remaining', '/remaining/:memberType/:memberUk'])
  async getRemaining(
    @Param('memberType') memberType: 'users' | 'managers' | undefined,
    @Param('memberUk') memberUk: string | undefined,
    @Auth() auth: User | Manager
  ): Promise<number> {

    const repos = getRepositories({
      user: UserRepository,
      manager: ManagerRepository,
      positive: PositivePointRepository
    }, this.connection.manager);
    let target: User | Manager = null;
    if (memberType !== undefined) {
      if (!['users', 'managers'].includes(memberType))
        memberType = undefined;
    } else {
      memberType = auth.type === 'User' ? 'users' : 'managers'
      memberUk = auth.uk;
    }

    if (memberType === 'users')
      target = await repos.user.getOne(
        [],
        ctx => ctx.searchQuery()
          .where(`${ctx.alias}.uk = :userUk`, { userUk: memberUk })
      )
    else if (memberType === 'managers')
      target = await repos.manager.getOne(
        [],
        ctx => ctx.searchQuery()
          .where(`${ctx.alias}.uk = :managerUk`, { managerUk: memberUk })
      )


    return this.pointsService.getRemaining(target, auth)
  }
}