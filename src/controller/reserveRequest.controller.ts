import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";
import * as dayjs from "dayjs";
import { UK_PREFIX } from "src/config/typeorm.config";
import { Auth } from "src/decorator/auth.decorator";
import { Manager } from "src/entity/member/manager.entity";
import { User } from "src/entity/member/user.entity";
import { ReserveRequest, ReserveRequestDto, ReserveRequestReq, ReserveRequestRes, SearchReserveDto } from "src/entity/reserve/reserveRequest.entity";
import { dividePipe } from "src/pipe/divide.pipe";
import { dynamicPipe } from "src/pipe/dynamic.pipe";
import { fitPipe } from "src/pipe/fit.pipe";
import { selectPipe } from "src/pipe/select.pipe";
import { ReserveRequestRepository } from "src/repository/reserve/reserveRequest.repository";
import { ReserveRequestService } from "src/service/reserveRequest.service";
import { ListPageRes } from "src/util/entity/listPage";
import { createUuid, isNumberForm, YYYYMMDDHHmmss } from "src/util/format.util";
import { getRange, initNumber, splitToObject } from "src/util/index.util";
import { getRepositories, PathString, TransactionHelperParam } from "src/util/typeorm.util";
import { Connection } from "typeorm";

const RESERVE_FIT_PIPE = fitPipe<ReserveRequestReq>([
  "name", "state", "tel", 'content', 'business', 'email'
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
const RESERVE_SEARCH_FIT_PIPE = fitPipe<SearchReserveDto>([
  'curPage', 'rowPerPage', 'pagePerBlock', 'orderBy', 'secondOrderBy',
  'uk', 'uks', 'state', "name", "email", "tel"
])

@Controller('reserve')
export class ReserveRequestController {
  constructor(
    private connection: Connection,
    private reserveService: ReserveRequestService,
  ) { }


  @Post()
  async postReserve(
    @Body(RESERVE_FIT_PIPE) body: ReserveRequestReq
  ): Promise<ReserveRequestRes> {



    const dto: ReserveRequestDto = await reserveUtil.reqToDto(body, {
      transaction: { connection: this.connection, entityManager: this.connection.manager }
    })

    return this.reserveService.createReserve(dto)
      .then(rst => new ReserveRequestRes(rst));
  }

  @Delete(':uk')
  async deleteSharpProduct(
    @Param('uk') uk: string,
    @Auth(Manager) auth: Manager
  ): Promise<string> {
    const repos = getRepositories({
      reserve: ReserveRequestRepository
    }, this.connection.manager);

    const reserve: ReserveRequest = await repos.reserve.searchQuery({ uk }).getOne();

    return this.reserveService.delete(reserve, auth);
  }

  @Get('/page')
  async getSharpProductListPage(
    @Auth() auth: Manager | User,
    @Query(
      RESERVE_SEARCH_FIT_PIPE,
      SEARCH_NUMBER_PIPE,
      SEARCH_SELECT_PIPE
    ) search: SearchReserveDto,
    @Query(
      'detail', dividePipe()
    ) details: Array<PathString<ReserveRequest>>
  ): Promise<ListPageRes<ReserveRequestRes>> {

    return this.reserveService.readReserveListPage(search, auth)
      .then(async ({ page, list }) => {
        await this.connection.manager
          .getCustomRepository(ReserveRequestRepository)
          .setProperty({ details, data: { auth } }, list);
        return {
          page,
          list: list.map(sp => new ReserveRequestRes(sp))
        }
      });
  }

  @Get(':uk')
  async getSharpProduct(
    @Param('uk') uk: string,
    @Auth() auth: Manager,
    @Query(
      'detail', dividePipe()
    ) details: Array<PathString<ReserveRequest>>,
    // @ClientIp() ip: string
  ): Promise<ReserveRequestRes> {


    return this.reserveService.readReserve(uk, auth)
      .then(async sp => {
        await Promise.all([
          this.connection.manager.getCustomRepository(ReserveRequestRepository)
            .setProperty({ details, data: { auth } }, [sp]),
        ])
        return new ReserveRequestRes(sp);
      })
  }

  @Patch(':id')
  async patchSharpProduct(
    @Param('id') id: string,
    @Body(RESERVE_FIT_PIPE) body: ReserveRequestReq,
    @Auth(Manager) auth: Manager
  ): Promise<ReserveRequestRes> {
    const repos = getRepositories({
      reserve: ReserveRequestRepository
    }, this.connection.manager);

    const reserve: ReserveRequest = await repos.reserve.searchQuery({ uk: id }).getOne()


    const dto: ReserveRequestDto = await reserveUtil.reqToDto(
      body, {
      origin: reserve,
      transaction: { connection: this.connection, entityManager: this.connection.manager }
    }
    );


    return this.reserveService.updateReserve(reserve, dto, auth)
      .then(result => new ReserveRequestRes(result));
  }
}



type ReserveUtilOption = {
  origin?: ReserveRequest;
  transaction?: TransactionHelperParam;
}
export const reserveUtil = {
  reqToDto: async (
    req: ReserveRequestReq,
    {
      origin, transaction,
    }: ReserveUtilOption = {}
  ): Promise<ReserveRequestDto> => {
    const { regDate, ...other
    } = req;

    const dto: ReserveRequestDto = { ...other };

    if (origin) {
      dto.id = origin.id;
    } else {
      dto.uk = createUuid({ prefix: `${UK_PREFIX.RESERVE}-${dayjs().format(YYYYMMDDHHmmss)}`, length: 24 })
    }
    return dto;
  }
}