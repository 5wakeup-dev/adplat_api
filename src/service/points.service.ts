import { Injectable } from "@nestjs/common";
import { TABLE_ALIAS } from "src/config/typeorm.config";
import { BASIC_EXCEPTION } from "src/exception/basic.exception";
import { isUndeclared } from "src/util/format.util";
import { getRepositories, TransactionHelper, TransactionHelperParam } from "src/util/typeorm.util";
import { Connection } from "typeorm";
import { Manager } from "src/entity/member/manager.entity";
import { allowPositiveRelation, isContainRoles, isSameAuth } from "src/util/entity.util";
import { User } from "src/entity/member/user.entity";
import { ListPageRes } from "src/util/entity/listPage";
import PageInfo from "src/util/entity/PageInfo";
import { DEFAULT_ROLE } from "src/entity/role/role.interface";
import { PositivePoint, PositivePointDto } from "src/entity/point/positivePoint.entity";
import { PositivePointRepository } from "src/repository/point/positivePoint.repository";
import { PositivePointRelationForm, SearchNegativePoint, SearchPositivePoint } from "src/entity/point/point.interface";
import { PositivePointRelationRepository } from "src/repository/point/positivePointRelation.repository";
import { PositivePointRelation } from "src/entity/point/positivePointRelation.entity";
import { NegativePoint, NegativePointDto } from "src/entity/point/negativePoint.entity";
import { NegativePointRepository } from "src/repository/point/negativePoint.repository";
import { NegativeHistory } from "src/entity/point/negativeHistory.entity";
import { NegativeHistoryRepository } from "src/repository/point/negativeHistory.repository";
import { Member } from "src/entity/member/member.interface";

const {
  POSITIVE_POINTS, NEGATIVE_POINTS
} = TABLE_ALIAS;

@Injectable()
export class PointsService {
  constructor(
    private connection: Connection,
  ) { }

  @TransactionHelper({ paramIndex: 3})
  async usePointFromRoot(
    dto: NegativePointDto, target: User|Manager, 
    auth: User|Manager,
    transaction: TransactionHelperParam = {connection: this.connection, entityManager: this.connection.manager}
  ): Promise<NegativePoint> {
    const isRoot = isContainRoles(auth, ['root'] as Array<DEFAULT_ROLE>)
    if( !isRoot )
      throw BASIC_EXCEPTION.NOT_ALLOW_AUTH;

    return this.usePoint(dto, target, transaction);
  }

  async getPositivePoints(
    search: SearchPositivePoint, auth: User | Manager
  ): Promise<ListPageRes<PositivePoint>> {
    const repos = getRepositories({
      positive: PositivePointRepository
    }, this.connection.manager);

    if (!auth)
      throw BASIC_EXCEPTION.NOT_ALLOW_AUTH;
    const { curPage, rowPerPage, pagePerBlock } = search;

    const totalRow = await repos.positive.searchQuery(search)
      .getCount();
    if (totalRow === 0)
      throw BASIC_EXCEPTION.EMPTY_CONTENT;
    let queryBuilder = repos.positive.searchQuery(search);
    const page: PageInfo = new PageInfo({ curPage, rowPerPage, totalRow, pagePerBlock });

    const list = await queryBuilder
      .orderBy(`${POSITIVE_POINTS}.id`, 'DESC')
      .skip(page.startRow)
      .take(page.rowPerPage)
      .getMany()

    return { page, list }
  }

  async getNativePoints(
    search: SearchNegativePoint, auth: User | Manager
  ): Promise<ListPageRes<NegativePoint>> {
    const repos = getRepositories({
      negative: NegativePointRepository
    }, this.connection.manager);

    if (!auth)
      throw BASIC_EXCEPTION.NOT_ALLOW_AUTH;
    const { curPage, rowPerPage, pagePerBlock } = search;

    const totalRow = await repos.negative.searchQuery(search)
      .getCount();
    if (totalRow === 0)
      throw BASIC_EXCEPTION.EMPTY_CONTENT;
    let queryBuilder = repos.negative.searchQuery(search);
    const page: PageInfo = new PageInfo({ curPage, rowPerPage, totalRow, pagePerBlock });

    const list = await queryBuilder
      .orderBy(`${NEGATIVE_POINTS}.id`, 'DESC')
      .skip(page.startRow)
      .take(page.rowPerPage)
      .getMany()

    return { page, list }
  }

  @TransactionHelper({ paramIndex: 3 })
  async createPoint(
    dto: PositivePointDto, auth: Manager, { force }: { force: boolean } = { force: false },
    transaction: TransactionHelperParam = { connection: this.connection, entityManager: this.connection.manager }
  ): Promise<PositivePoint> {

    const repos = getRepositories({
      positive: PositivePointRepository,
    }, transaction.entityManager);

    const target = dto?.user || dto?.manager
    const isRoot = isContainRoles(auth, ['root'] as Array<DEFAULT_ROLE>)
    if (!dto || !target)
      throw BASIC_EXCEPTION.NOT_ALLOW_EMPTY_ON_PROCESS;
    else if (!force && !auth)
      throw BASIC_EXCEPTION.NOT_ALLOW_AUTH;
    else if (!force && !isRoot)
      throw BASIC_EXCEPTION.NOT_ALLOW_AUTH;
    const { expires, ...other } = dto;

    const prepareEntity: Partial<PositivePoint> = { ...other, remaining: dto.price, expires: expires && new Date(expires) };
    prepareEntity[target.type.toLowerCase()] = target;
    return await repos.positive.save(prepareEntity);

  }


  @TransactionHelper({ paramIndex: 2 })
  async createPositiveRelation(
    point: PositivePoint, relation: PositivePointRelationForm,
    transaction: TransactionHelperParam = { connection: this.connection, entityManager: this.connection.manager }
  ): Promise<PositivePointRelation> {
    if (!point)
      throw BASIC_EXCEPTION.NOT_ALLOW_EMPTY_ON_PROCESS;
    else if (!allowPositiveRelation(relation))
      throw BASIC_EXCEPTION.NOT_ALLOW_POINT_TYPE;

    const repos = getRepositories({
      relation: PositivePointRelationRepository,
    }, transaction.entityManager);
    return repos.relation.save({
      id: point.id,
      ...relation
    })
  }



  @TransactionHelper({ paramIndex: 2 })
  async usePoint(
    dto: NegativePointDto, member: User | Manager,
    transaction: TransactionHelperParam = { connection: this.connection, entityManager: this.connection.manager }
  ): Promise<NegativePoint> {
    if (!dto || isUndeclared(dto.price) || dto.price <= 0)
      throw BASIC_EXCEPTION.NOT_ALLOW_EMPTY_ON_PROCESS;
    else if (!member)
      throw BASIC_EXCEPTION.NOT_FOUND_AUTH;

    const repos = getRepositories({
      relation: PositivePointRelationRepository,
      negative: NegativePointRepository,
      history: NegativeHistoryRepository,
      positive: PositivePointRepository
    }, transaction.entityManager);

    const positivePoints: Array<PositivePoint> = await repos.positive.getRemainingPoint(member)
    let remaining: number = dto.price;

    if (positivePoints.length === 0
      || positivePoints.map(point => point.remaining)
        .reduce((a, b) => a + b, 0) < remaining
    )
      throw BASIC_EXCEPTION.INSUFFICIENT_REMAINING_POINT;
    const negaDto = { title: dto.title, price: dto.price, [member.type.toLowerCase()]: member }
    const negativeCreated = await repos.negative.save(negaDto)
    const negativeHistories: Array<NegativeHistory> = [];
    for (const positivePoint of positivePoints) {

      const consumption: number = positivePoint.remaining >= remaining
        ? remaining
        : positivePoint.remaining

      const history: NegativeHistory = {
        id: undefined, price: consumption,
        negativePoint: negativeCreated,
        positivePoint
      };
      negativeHistories.push(history);
      positivePoint.remaining = positivePoint.remaining - consumption;

      const updatedPositive = await repos.positive.save({ id: positivePoint.id, remaining: positivePoint.remaining })
      positivePoint.upt_date = updatedPositive.upt_date;
      await repos.history.save(history)
      // await em.save(NegativeHistory, history);

      remaining = remaining - consumption;
      if (remaining < 1)
        break;
    }

    return {
      ...negativeCreated,
      negativeHistories
    };
  }


  @TransactionHelper({ paramIndex: 3 })
  async cancelPoint(
    negativePoint: NegativePoint, title: string,auth:Member,
    transaction: TransactionHelperParam = { connection: this.connection, entityManager: this.connection.manager }
  ): Promise<PositivePoint> {
    const isRoot = isContainRoles(auth, ['root'] as Array<DEFAULT_ROLE>)

    if(!auth||!isRoot)
    throw BASIC_EXCEPTION.NOT_ALLOW_AUTH;
    if (!negativePoint)
      throw BASIC_EXCEPTION.NOT_ALLOW_EMPTY_ON_PROCESS;
    else if (negativePoint.cancelId || !negativePoint.negativeHistories || negativePoint.negativeHistories.length === 0)
      throw BASIC_EXCEPTION.POINT_HAS_ALREADY_BEAN_CANCELED;

    const repos = getRepositories({
      relation: PositivePointRelationRepository,
      negative: NegativePointRepository,
      history: NegativeHistoryRepository,
      positive: PositivePointRepository
    }, transaction.entityManager);

    const { negativeHistories, manager, user } = negativePoint;

    const { price, expires } = negativeHistories
      .reduce((result, { positivePoint, price: p }) => {
        const { expires: e } = positivePoint;
        result.price += p;
        if (!result.expires || (e && e.getTime() > result.expires.getTime()))
          result.expires = e;

        return result;
      }, { price: 0, expires: undefined } as { price: number, expires?: Date })

    const pointEntity: Partial<PositivePoint> = {
      // manager: negativePoint.manager,
      user, manager,
      // title: `[취소]-${negativePoint.title}`,
      title,
      expires, price,
      remaining: price
    }
    const createdPositive = await repos.positive.save(pointEntity)
    await repos.negative.save({ id: negativePoint.id, cancelId: createdPositive.id })

    return createdPositive;
  }

  @TransactionHelper({ paramIndex: 2 })
  async getRemaining(
    target: User | Manager, auth: User | Manager,
    transaction: TransactionHelperParam = { connection: this.connection, entityManager: this.connection.manager }
  ): Promise<number> {
    const isRoot = isContainRoles(auth, ['root'] as Array<DEFAULT_ROLE>)
    const isOwner = isSameAuth(target, auth);
    if (!target)
      throw BASIC_EXCEPTION.NOT_FOUND_AUTH;
    else if (!auth || (!isRoot && !isOwner))
      throw BASIC_EXCEPTION.NOT_ALLOW_AUTH;

    const repos = getRepositories({
      positive: PositivePointRepository
    }, transaction.entityManager);

    const remaining=await repos.positive.getRemainingPoint(target).then(positivePoints =>
      positivePoints.map(positivePoint =>typeof(positivePoint.remaining)==="string"?parseInt(positivePoint.remaining): positivePoint.remaining)
        .reduce((a, b) => a + b, 0)
    )

    return remaining
  }
}