import { Injectable, Param } from "@nestjs/common";
import { TABLE_ALIAS } from "src/config/typeorm.config";
import { SearchEnvironmentDto } from "src/entity/comm/comm.interface";
import { Environment, EnvironmentDto } from "src/entity/comm/environment.entity";
import { Manager } from "src/entity/member/manager.entity";
import { DEFAULT_ROLE } from "src/entity/role/role.interface";
import { BASIC_EXCEPTION } from "src/exception/basic.exception";
import { EnvironmentRepository } from "src/repository/comm/environment.repository";
import { getProject } from "src/singleton/project.singleton";
import { isContainRoles } from "src/util/entity.util";
import { ListPageRes } from "src/util/entity/listPage";
import PageInfo from "src/util/entity/PageInfo";
import { equals, isUndeclared } from "src/util/format.util";
import { deepClone, filterVariable } from "src/util/index.util";
import { getRepositories, TransactionHelper, TransactionHelperParam } from "src/util/typeorm.util";
import { Connection } from "typeorm";

const {
  ENVIRONMENTS
} = TABLE_ALIAS;
@Injectable()
export class EnvironmentsService {
  constructor(
    private connection: Connection
  ){}
  

  async getEnvironment(
    environmentType: string, environmentCode: string,
  ): Promise<Environment> {
    if( !environmentType || !environmentCode )
      throw BASIC_EXCEPTION.EMPTY_CONTENT;

    const env = await this.connection.getCustomRepository(EnvironmentRepository)
    .searchQuery({type: environmentType, code: environmentCode})
    .getOne()

    if( !env )
      throw BASIC_EXCEPTION.EMPTY_CONTENT;

    return env;
  }

  async getListPage(
    search: SearchEnvironmentDto
  ): Promise<ListPageRes<Environment>> {
    const repos = getRepositories({
      environment: EnvironmentRepository
    }, this.connection.manager)
    const totalRow: number = await repos.environment.searchQuery(search)
    .getCount();
    if( totalRow === 0 )
      throw BASIC_EXCEPTION.EMPTY_CONTENT;

    const { curPage, rowPerPage, pagePerBlock } = search;
    const page: PageInfo = new PageInfo({curPage, rowPerPage, totalRow, pagePerBlock});
    const list: Array<Environment> = await repos.environment.searchQuery(search)
    .skip(page.startRow)
    .take(page.rowPerPage)
    .orderBy(`${ENVIRONMENTS}.type`, 'ASC')
    .addOrderBy(`${ENVIRONMENTS}.order`, 'ASC')
    .getMany();

    return { page, list };
  }

  @TransactionHelper({ paramIndex: 2 })
  async createEnvironment(
    dto: EnvironmentDto, auth: Manager,
    { entityManager: em }: TransactionHelperParam = {connection: this.connection, entityManager: this.connection.manager}
  ): Promise<Environment> {
    const prj = getProject();
    const isRoot = isContainRoles(auth, ['root'] as Array<DEFAULT_ROLE> );
    if( prj.EXIST_ROOT && !isRoot )
      throw BASIC_EXCEPTION.NOT_ALLOW_AUTH;
    else if( !dto || !dto.type || !dto.code )
      throw BASIC_EXCEPTION.NOT_ALLOW_EMPTY_ON_PROCESS;

    const repos = getRepositories({
      environment: EnvironmentRepository
    }, em)

    if( !dto.code )
      dto.code = dto.codeName;
    else if( !dto.codeName )
      dto.codeName = dto.code;
    

    return repos.environment.save(dto)
    .then( 
      ({id}) => repos.environment.searchQuery()
        .where(`${ENVIRONMENTS}.id = :id`, {id})
        .getOne()
    )
  }

  @TransactionHelper({ paramIndex: 3 })
  async patchEnvironment(
    origin: Environment, dto: EnvironmentDto, auth: Manager,
    transaction: TransactionHelperParam = {connection: this.connection, entityManager: this.connection.manager}
  ): Promise<Environment> {

    const prj = getProject();
    const isRoot = isContainRoles(auth, ['root'] as Array<DEFAULT_ROLE> );
    if( prj.EXIST_ROOT && !isRoot )
      throw BASIC_EXCEPTION.NOT_ALLOW_AUTH;
    else if( !origin || !dto )
      throw BASIC_EXCEPTION.NOT_ALLOW_EMPTY_ON_PROCESS;

    const { entityManager: em } = transaction;
    const repos = getRepositories({
      env: EnvironmentRepository
    }, em)

    dto.id = origin.id;

    return repos.env.save(dto)
    .then( 
      () => repos.env.searchQuery()
        .where(`${ENVIRONMENTS}.id = :id`, {id: origin.id})
        .getOne()
    )
  }


  @TransactionHelper({ paramIndex: 2 })
  async deleteEnvironment(
    origin: Environment, auth: Manager,
    { entityManager: em }: TransactionHelperParam = {connection: this.connection, entityManager: this.connection.manager}
  ): Promise<Environment> {
    const prj = getProject();
    const isRoot = isContainRoles(auth, ['root'] as Array<DEFAULT_ROLE> );
    if( prj.EXIST_ROOT && !isRoot )
      throw BASIC_EXCEPTION.NOT_ALLOW_AUTH;
    else if( !origin )
      throw BASIC_EXCEPTION.NOT_ALLOW_EMPTY_ON_PROCESS;

    const cloneOrg = deepClone(origin);

    return em.getCustomRepository(EnvironmentRepository)
    .remove(origin)
    .then( () => cloneOrg );

  }
}