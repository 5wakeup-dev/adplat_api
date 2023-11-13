import { Injectable } from "@nestjs/common";
import { Manager } from "src/entity/member/manager.entity";
import { ManagerHistory, ManagerHistoryDto } from "src/entity/member/managerHistories.entity";
import { User } from "src/entity/member/user.entity";
import { UserHistory, UserHistoryDto } from "src/entity/member/userHistory.entity";
import { Role } from "src/entity/role/role.entity";
import { DEFAULT_ROLE } from "src/entity/role/role.interface";
import { ArtworkRepository } from "src/repository/artwork/artwork.repository";

import { ReplyRepository } from "src/repository/reply/reply.repository";
import { getProject } from "src/singleton/project.singleton";
import { isContainRoles } from "src/util/entity.util";
import { deepClone, filterVariable } from "src/util/index.util";
import { aesDec, aesEnc, oneWayEnc } from "src/util/secret.util";
import { getRepositories } from "src/util/typeorm.util";
import { Connection, EntitySubscriberInterface, EventSubscriber, InsertEvent, LoadEvent, RemoveEvent, UpdateEvent } from "typeorm";


// const {

// } = TABLE_ALIAS;

@Injectable()
@EventSubscriber()
export class ManagerSubscriber implements EntitySubscriberInterface<Manager> {
  constructor(
    connection: Connection
  ){
    connection.subscribers.push(this);
  }

  listenTo(): any {
    return Manager;
  }

  beforeInsert( {entity}: InsertEvent<Manager>): void | Promise<any> {
    // console.log('[!!!!]', entity);
    entity.password = entity.password ? oneWayEnc( entity.password ) : undefined;
    entity.identity = entity.identity ? aesEnc( entity.identity ) : undefined;
  }

  beforeUpdate( { entity, databaseEntity }: UpdateEvent<Manager>): void | Promise<any> {
    const {
      password, identity
    } = filterVariable(databaseEntity, entity);

    entity.password = password ? oneWayEnc(password) : undefined
    entity.identity = identity ? aesEnc(identity) : undefined


  }

  async afterInsert( { manager, entity }: InsertEvent<Manager>): Promise<any> {
    const project = getProject();
    if( !project.EXIST_ROOT && isContainRoles(entity, ['root'] as Array<DEFAULT_ROLE> ) )
      await project.initExistRoot({connection: manager.connection, entityManager: manager})

  }

  afterLoad( entity: Manager, _event?: LoadEvent<Manager> ): void | Promise<any> {
    if(entity.identity)
      entity.identity = aesDec(entity.identity);
    entity.type = 'Manager';
  }

  async afterUpdate( event: UpdateEvent<Manager>): Promise<any> {
    const { entity, databaseEntity, manager } = event;
    const project = getProject();
    const { roles: variableRoles, state: variableState } = filterVariable(databaseEntity, entity);
    const promises: Array<Promise<any>> = []
    if( variableRoles && !isContainRoles({roles: variableRoles}, ['root'] as Array<DEFAULT_ROLE>) )
      promises.push(
        project.initExistRoot({connection: manager.connection, entityManager: manager})
      )
    
    promises.push(
      recordModifiedIfModified( event )
    )

    await Promise.all(promises);

    if(variableState === -1) {
      const repos = getRepositories({
        artwork: ArtworkRepository,
        reply: ReplyRepository
      }, manager);
      
      const artworks = await repos.artwork.getMany(
        undefined,
        ctx => ctx.searchQuery({managerUk: databaseEntity.uk})
      );
      artworks.forEach(artwork => artwork.state = -1);
      
      const replies = await repos.reply.getMany(
        undefined,
        ctx => ctx.searchQuery({managerUk: databaseEntity.uk})
      );
      replies.forEach(reply => reply.state = -1);

      await Promise.all([
        repos.artwork.save(artworks),
        repos.reply.save(replies)
      ]);
    }
  }

  async afterRemove( { manager }: RemoveEvent<Manager>): Promise<any> {
    const project = getProject();
    if( project.EXIST_ROOT )
      await project.initExistRoot({connection: manager.connection, entityManager: manager})

  }
  
}




@Injectable()
@EventSubscriber()
export class UserSubscriber implements EntitySubscriberInterface<User> {
  
  constructor(
    connection: Connection
  ){
    connection.subscribers.push(this);
  }
  listenTo(): any {
    return User;
  }

  beforeInsert( {entity}: InsertEvent<User>): void | Promise<any> {
    
    entity.password = entity.password ? oneWayEnc( entity.password ) : undefined;
    entity.identity = entity.identity ? aesEnc( entity.identity ) : undefined;
  }

  beforeUpdate( { entity, databaseEntity }: UpdateEvent<User>): void | Promise<any> {
    const {
      password, identity
    } = filterVariable(databaseEntity, entity);

    entity.password = password ? oneWayEnc(password) : undefined
    entity.identity = identity ? aesEnc(identity) : undefined

  }

  async afterUpdate( event: UpdateEvent<User>): Promise<any> {
    // const { entity, databaseEntity, manager } = event;
    const promises: Array<Promise<any>> = []
    
    promises.push(
      recordModifiedIfModified( event )
    )

    await Promise.all(promises);
  }

  afterLoad( entity: User, _event?: LoadEvent<User> ): void | Promise<any> {
    if(entity.identity)
      entity.identity = aesDec(entity.identity);
    entity.type = 'User';
  }
}

@Injectable()
@EventSubscriber()
export class RoleSubscriber implements EntitySubscriberInterface<Role> {

  constructor(
    connection: Connection
  ){
    connection.subscribers.push(this);
  }

  listenTo(): any {
    return Role;
  }

  async afterInsert({ manager }: InsertEvent<Role>): Promise<any> {
    const project = getProject();
    await project.initRoles({connection: manager.connection, entityManager: manager})
  }

  async afterUpdate( { manager }: UpdateEvent<Role>): Promise<any> {
    const project = getProject();
    await project.initRoles({connection: manager.connection, entityManager: manager})
      
  }

  async afterRemove({ manager }: RemoveEvent<Role>): Promise<any> {
    const project = getProject();
    await project.initRoles({connection: manager.connection, entityManager: manager})
  }
}

// @Injectable()
// @EventSubscriber()
// export class MemberBasicSubscriber implements EntitySubscriberInterface<MemberBasic> {
//   constructor(
//     connection: Connection
//   ){
//     connection.subscribers.push(this);
//   }

//   listenTo(): any {
//     return MemberBasic;
//   }

//   afterInsert(event: InsertEvent<MemberBasic>): void | Promise<any> {
//     const { entity } = event;
//     initMemberBasicEntity(entity);
//   }

//   beforeUpdate(event: UpdateEvent<MemberBasic>): void | Promise<any> {
//     const { entity } = event;
//     initMemberBasicEntity(entity);
//   }
// }
// const INIT_BOOLEAN = (val) => isUndeclared(val) ? initBoolean(val) : undefined;
// const initMemberBasicEntity = (entity: MemberBasicDto) => {
//   if( !entity )
//     return null;
  
//   deepSelectMap(entity, {
//     allowNotification: ({val}) => INIT_BOOLEAN(val)
//   })
// }

@Injectable()
@EventSubscriber()
export class ManagerHistorySubscriber implements EntitySubscriberInterface<ManagerHistory> {

  constructor(
    connection: Connection
  ){
    connection.subscribers.push(this);
  }
  listenTo(): any {
    return ManagerHistory;
  }

  afterLoad( entity: ManagerHistory, _event?: LoadEvent<ManagerHistory> ): void | Promise<any> {
    if(entity.identity)
      entity.identity = aesDec(entity.identity);
  }
}

@Injectable()
@EventSubscriber()
export class UserHistorySubscriber implements EntitySubscriberInterface<UserHistory> {

  constructor(
    connection: Connection
  ){
    connection.subscribers.push(this);
  }
  listenTo(): any {
    return UserHistory;
  }

  afterLoad( entity: UserHistory, _event?: LoadEvent<UserHistory> ): void | Promise<any> {
    if(entity.identity)
      entity.identity = aesDec(entity.identity);
  }
}

const recordModifiedIfModified = (
  { entity, databaseEntity, manager: em }: UpdateEvent<Manager|User>
): Promise<ManagerHistoryDto|UserHistoryDto> => {
  const {
    identity, password, nickname, state
  } = entity;

  const compare = { identity, password, nickname, state }
  const cloneDatabaseEntity = deepClone(databaseEntity);
  cloneDatabaseEntity.identity = aesEnc(cloneDatabaseEntity.identity);

  const variables = filterVariable(cloneDatabaseEntity, compare);
  // let repo: Repository<User|ManagerHistory>;
  if( 
    !variables || Object.keys(variables).length === 0 
    || Object.keys(variables).filter( k => databaseEntity[k] !== null ).length === 0 
  )
    return ;

  const records = Object.keys(variables).reduce( (rst, k) => {
    rst[k] = cloneDatabaseEntity[k];
    return rst;
  }, {});
  if( databaseEntity instanceof Manager ) 
    return em.getRepository(ManagerHistory)
    .save({ manager: databaseEntity, ...records })

  else if( databaseEntity instanceof User )
    return em.getRepository(UserHistory)
    .save({ user: databaseEntity, ...records })

  
}
