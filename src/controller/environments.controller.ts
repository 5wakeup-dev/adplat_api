import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { Auth } from "src/decorator/auth.decorator";
import { SearchEnvironmentDto } from "src/entity/comm/comm.interface";
import { Environment, EnvironmentDto } from "src/entity/comm/environment.entity";
import { Manager } from "src/entity/member/manager.entity";
import { dynamicPipe } from "src/pipe/dynamic.pipe";
import { fitPipe } from "src/pipe/fit.pipe";
import { EnvironmentRepository } from "src/repository/comm/environment.repository";
import { EnvironmentsService } from "src/service/environments.service";
import { ListPageRes } from "src/util/entity/listPage";
import { initNumber } from "src/util/index.util";
import { getRepositories } from "src/util/typeorm.util";
import { Connection } from "typeorm";

const ENVIRONMENT_FIT_PIPE = fitPipe<EnvironmentDto>([
  'type', 'typeName', 'code', 'codeName',
  'order'
])

const ENVIRONMENT_SEARCH_NUMBER_PIPE = dynamicPipe<SearchEnvironmentDto>(({value}) => {
  ( ['curPage', 'rowPerPage', 'pagePerBlock'] as Array<keyof SearchEnvironmentDto> )
  .forEach( key => {
    const val = value[key];
    if( val !== undefined )
      value[key] = initNumber(val) as never;
  })
  return value;
} )

const ENVIRONMENT_SEARCH_FIT_PIPE = fitPipe<SearchEnvironmentDto>([
  'type', 'typeName', 'code', 'codeName',
  'curPage', 'rowPerPage', 'pagePerBlock'
])

@Controller('/environments')
export class EnvironmentsController {
  constructor(
    private connection: Connection,
    private environmentsService: EnvironmentsService
  ){}


  @Get('/:environment_type/:environment_code')
  getEnvironment(
    @Param('environment_type') environmentType: string,
    @Param('environment_code') environmentCode: string

  ): Promise<Environment> {

    return this.environmentsService.getEnvironment(environmentType, environmentCode)
  }


  @Get('/page')
  getEnvironmentListPage(
    @Query(
      ENVIRONMENT_SEARCH_FIT_PIPE,
      ENVIRONMENT_SEARCH_NUMBER_PIPE
    ) search: SearchEnvironmentDto
  ): Promise<ListPageRes<Environment>> {

    return this.environmentsService.getListPage(search);
  }


  @Post()
  postEnvironment(
    @Body(
      ENVIRONMENT_FIT_PIPE
    ) body: EnvironmentDto,
    @Auth(Manager) auth: Manager
  ): Promise<Environment> {

    return this.environmentsService.createEnvironment(body, auth);
  }

  @Patch('/:environment_type/:environment_code')
  async patchEnvironment(
    @Param('environment_type') environmentType: string,
    @Param('environment_code') environmentCode: string,
    @Body(
      ENVIRONMENT_FIT_PIPE
    ) body: EnvironmentDto,
    @Auth(Manager) auth: Manager 
  ): Promise<Environment> {
    const repos = getRepositories({
      env: EnvironmentRepository
    }, this.connection.manager)

    const origin: Environment = await repos.env.searchQuery({
      type: environmentType||'NULL', code: environmentCode||'NULL'
    }).getOne();

    return this.environmentsService.patchEnvironment(origin, body, auth);
  }

  @Delete('/:environment_type/:environment_code')
  async deleteEnvironment(
    @Param('environment_type') environmentType: string,
    @Param('environment_code') environmentCode: string,
    @Auth(Manager) auth: Manager 
  ): Promise<number> {

    const repos = getRepositories({
      env: EnvironmentRepository
    }, this.connection.manager)
    
    const origin: Environment = await repos.env.searchQuery({
      type: environmentType||'NULL', code: environmentCode||'NULL'
    }).getOne();

    return this.environmentsService.deleteEnvironment(origin, auth)
    .then( () => 1);
  }
  
}