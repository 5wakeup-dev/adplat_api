import { TABLE_ALIAS } from "src/config/typeorm.config";
import { SearchEnvironmentDto } from "src/entity/comm/comm.interface";
import { Environment } from "src/entity/comm/environment.entity";
import { ChainRelation, ChainRepository, PathString, SaveSubscriber, SetPropertyEvent } from "src/util/typeorm.util";
import { EntityRepository, SelectQueryBuilder } from "typeorm";
const{
  ENVIRONMENTS
} = TABLE_ALIAS;

@EntityRepository(Environment)
export class EnvironmentRepository extends ChainRepository<Environment> {
  public readonly primaryKeys: Array<keyof Environment> = ['id'];
  public readonly alias: string = ENVIRONMENTS;
  public readonly relationChain: ChainRelation<Environment> = {}
  public readonly setPropertySubscriber: Array<SetPropertyEvent<Environment, PathString<Environment>>>;

  public readonly saveSubscribe: SaveSubscriber<Environment, PathString<Environment>> = {
    events: [
      { // [ALL] INSERT or UPDATE  
        where: entity => !!entity ,
        beforeSave: async ({entity, dataBaseEntity}) => {
          const { type, typeName, order } = entity;
          if( !entity.id && !type ) return;
          
          const [ beforeEnvironemtns, reqEnvironments ] = await Promise.all([
            dataBaseEntity && type && type !== dataBaseEntity.type
            ? this.searchQuery({type: dataBaseEntity.type})
              .andWhere(`${this.alias}.id != :id`, {id: entity.id})
              .orderBy(`${this.alias}.order`, 'ASC')
              .getMany()
              .then( result => {
                result.forEach( (env, i) => env.order = i + 1)
                return result;
              })
            : [] as Array<Environment>,

            this.searchQuery({type: type || dataBaseEntity.type})
            .orderBy(`${this.alias}.order`, 'ASC')
            .getMany()
          ]);

          const { lessThen, moreThen } = reqEnvironments.reduce( (rst, env) => {
            if( order ){
              if( dataBaseEntity && env.id === dataBaseEntity.id )
                return rst;
              else if( env.order >= order)
                rst.moreThen.push(env);
              else if( env.order < order )
                rst.lessThen.push(env);
            }else
              rst.lessThen.push(env);
            return rst;
          }, { moreThen: [] as Array<Environment>, lessThen: [] as Array<Environment> });

          const lessAndMore = [...lessThen, ...moreThen];
          lessThen.forEach( (env, i) => env.order = i+1);
          const modifyOrder = lessThen.length + 1;
          moreThen.forEach ( (env, i) => env.order = modifyOrder + 1 + i);
          
          entity.order = modifyOrder;

          if( !entity.id )
            entity.typeName = typeName || lessAndMore[0]?.typeName || type;
          else
            entity.typeName = type && type !== dataBaseEntity.type 
              ? typeName || lessAndMore[0]?.typeName || type
              : typeName || dataBaseEntity.typeName
          const first = lessAndMore[0];
          if( first && first.typeName !== entity.typeName )
            lessAndMore.forEach( env => env.typeName = typeName )
          

          await this.manager.getRepository(Environment).save([
            ...beforeEnvironemtns.map( ({id, order: ord}) => ({id, order:ord})),
            ...lessAndMore.map( ({id, order: ord, typeName: typNa}) => ({id, order: ord, typeName: typNa}))
          ])
          
        }
      }
    ]
  }

  public searchQuery({
    type, typeName, code, codeName
  }: SearchEnvironmentDto = {}): SelectQueryBuilder<Environment> {

    let query = this.createQueryBuilder(this.alias);

    if( type )
      query = query.andWhere(`${this.alias}.type = :type`, {type})
    if( typeName )
      query = query.andWhere(`${this.alias}.typeName LIKE :typeName`, {typeName: `%${typeName}%`})
    if( code )
      query = query.andWhere(`${this.alias}.code = :code`, {code})
    if( codeName )
      query = query.andWhere(`${this.alias}.codeName LIKE :codeName`, {codeName: `%${codeName}%`})
    
    return query;
  }

}