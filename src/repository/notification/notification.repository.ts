import { TABLE_ALIAS } from "src/config/typeorm.config";
import { Attachment } from "src/entity/comm/attachment.entity";
import { Notification } from "src/entity/notification/notification.entity";
import { ChainRelation, ChainRepository, PathString, SaveSubscriber, SetPropertyEvent } from "src/util/typeorm.util";
import { EntityRepository, SelectQueryBuilder } from "typeorm";
import { AttachmentRepository } from "../comm/attachment.repository";
import { NotificationAttachment } from "src/entity/notification/notification.bridge";
import { NotificationError } from "src/entity/notification/notificationError.entity";
import { NotificationHistory } from "src/entity/notification/notificationHistory.entity";
import { NotificationButton } from "src/entity/notification/notificationButton.entity";
import { Manager } from "src/entity/member/manager.entity";
import { ManagerRepository } from "../member/manager.repository";
import { User } from "src/entity/member/user.entity";
import { UserRepository } from "../member/user.repository";
import { isContainRoles, isSameAuth } from "src/util/entity.util";
import { DEFAULT_ROLE } from "src/entity/role/role.interface";
import { isUndeclared, UNKNOWN } from "src/util/format.util";
import { keysTypeGuard } from "src/util/index.util";
import { SearchNotificationDto } from "src/entity/notification/notification.interface";

const{
  NOTIFICATIONS,
  NOTIFICATION_ERRORS,
  NOTIFICATION_HISTORIES,
  NOTIFICATION_BUTTONS,
  NOTIFICATION_ATTACHMENT,
  MANAGERS, USERS
} = TABLE_ALIAS;

const MANAGER_REG = /^manager|manager\..+/;
const RECEIVER_MANAGER_REG = /^receiverManager|receiverManager\..+/;
const RECEIVER_USER_REG = /^receiverUser|receiverUser\..+/;

// const OBJECT_KEYS: Array<keyof Notification> = [ 'manager', 'receiverUser', 'receiverManager', 'attachments', 'buttons', 'errors', 'histories' ];
// const STRING_KEYS: Array<keyof Notification> = [ 'title', 'content', 'type', 'media', '' ];

@EntityRepository(Notification)
export class NotificationRepository extends ChainRepository<Notification> {
  public readonly primaryKeys: Array<keyof Notification> = ['id'];
  public readonly alias: string = NOTIFICATIONS;
  public readonly relationChain: ChainRelation<Notification> = {
    manager: {
      Entity: Manager, Repository: ManagerRepository,
      getBridges: ({selfEntities}) =>
        this.createQueryBuilder(this.alias)
        .select(`${this.alias}.id AS self`)
        .addSelect(`${this.alias}.manager AS inverse`)
        .andWhere(`${this.alias}.id IN (:ids)`, {ids: selfEntities.map( ({id}) => id)})
        .getRawMany()
        .then( result => result.map( ({self, inverse}) => ({self: {id: self}, inverse: {id: inverse}})))
    },
    receiverManager: {
      Entity: Manager, Repository: ManagerRepository,
      getBridges: ({selfEntities}) =>
        this.createQueryBuilder(this.alias)
        .select(`${this.alias}.id AS self`)
        .addSelect(`${this.alias}.receiverManager AS inverse`)
        .andWhere(`${this.alias}.id IN (:ids)`, {ids: selfEntities.map( ({id}) => id)})
        .getRawMany()
        .then( result => result.map( ({self, inverse}) => ({self: {id: self}, inverse: {id: inverse}})))
    },
    receiverUser: {
      Entity: User, Repository: UserRepository,
      getBridges: ({selfEntities}) =>
        this.createQueryBuilder(this.alias)
        .select(`${this.alias}.id AS self`)
        .addSelect(`${this.alias}.receiverUser AS inverse`)
        .andWhere(`${this.alias}.id IN (:ids)`, {ids: selfEntities.map( ({id}) => id)})
        .getRawMany()
        .then( result => result.map( ({self, inverse}) => ({self: {id: self}, inverse: {id: inverse}})))
    },
    attachments: {
      Entity: Attachment, Repository: AttachmentRepository,
      fieldIsMany: true,
      getBridges: ({entityManager: em, selfEntities}) => 
        em.getRepository(NotificationAttachment)
        .createQueryBuilder(NOTIFICATION_ATTACHMENT)
        .where(`${NOTIFICATION_ATTACHMENT}.notificationId IN (:ids)`, {ids: selfEntities.map( ({id}) => id)})
        .orderBy(`${NOTIFICATION_ATTACHMENT}.ord`, 'ASC')
        .getMany()
        .then( result => result.map( ({notificationId, attachmentId}) => ({self: {id: notificationId}, inverse: {id: attachmentId}})))
    },
    errors: {
      Entity: NotificationError, fieldIsMany: true,
      getBridges: ({entityManager: em, selfEntities}) => 
        em.getRepository(NotificationError)
        .createQueryBuilder(NOTIFICATION_ERRORS)
        .select(`${NOTIFICATION_ERRORS}.notification_id AS self`)
        .addSelect(`${NOTIFICATION_ERRORS}.id AS inverse`)
        .where(`${NOTIFICATION_ERRORS}.notification_id IN (:ids)`, {ids: selfEntities.map( ({id}) => id)})
        .getRawMany()
        .then( result => result.map( ({self, inverse}) => ({self: {id: self}, inverse: {id: inverse}})))
      ,
      getDatas: ({entityManager: em, selfEntities}) => 
        em.getRepository(NotificationError)
        .createQueryBuilder(NOTIFICATION_ERRORS)
        .where(`${NOTIFICATION_ERRORS}.notification_id IN (:ids)`, {ids: selfEntities.map( ({id}) => id)})
        .getMany()
    },
    histories: {
      Entity: NotificationHistory, fieldIsMany: true,
      getBridges: ({entityManager: em, selfEntities}) => 
        em.getRepository(NotificationHistory)
        .createQueryBuilder(NOTIFICATION_HISTORIES)
        .select(`${NOTIFICATION_HISTORIES}.notification_id AS self`)
        .addSelect(`${NOTIFICATION_HISTORIES}.id AS inverse`)
        .where(`${NOTIFICATION_HISTORIES}.notification_id IN (:ids)`, {ids: selfEntities.map( ({id}) => id)})
        .getRawMany()
        .then( result => result.map( ({self, inverse}) => ({self: {id: self}, inverse: {id: inverse}})))
      ,
      getDatas: ({entityManager: em, selfEntities}) => 
        em.getRepository(NotificationHistory)
        .createQueryBuilder(NOTIFICATION_HISTORIES)
        .where(`${NOTIFICATION_HISTORIES}.notification_id IN (:ids)`, {ids: selfEntities.map( ({id}) => id)})
        .getMany()
    },
    buttons: {
      Entity: NotificationButton, fieldIsMany: true,
      getBridges: ({entityManager: em, selfEntities}) => 
        em.getRepository(NotificationButton)
        .createQueryBuilder(NOTIFICATION_BUTTONS)
        .select(`${NOTIFICATION_BUTTONS}.notification_id AS self`)
        .addSelect(`${NOTIFICATION_BUTTONS}.id AS inverse`)
        .where(`${NOTIFICATION_BUTTONS}.notification_id IN (:ids)`, {ids: selfEntities.map( ({id}) => id)})
        .getRawMany()
        .then( result => result.map( ({self, inverse}) => ({self: {id: self}, inverse: {id: inverse}})))
      ,
      getDatas: ({entityManager: em, selfEntities}) => 
        em.getRepository(NotificationButton)
        .createQueryBuilder(NOTIFICATION_BUTTONS)
        .where(`${NOTIFICATION_BUTTONS}.notification_id IN (:ids)`, {ids: selfEntities.map( ({id}) => id)})
        .getMany()     
    }
  }
  // public readonly setPropertySubscribe: ChainingSetPropertySubscribe<Notification, PathString<Notification>> = {
  //   beforeSetProperty: ({ details }) => {
  //     // const auth = data.auth as User|Manager;
  //     const flag = details.reduce( (result, detail) => {
  //       if( !result.existManager && MANAGER_REG.test(detail) )
  //         result.existManager = true;
  //       else if( 
  //         !result.existReceiverAuth 
  //         && [
  //           RECEIVER_USER_REG, 
  //           RECEIVER_CONTRACTOR_REG, 
  //           RECEIVER_MANAGER_REG
  //         ].some( reg => reg.test(detail) )
  //       )
  //         result.existReceiverAuth = true;
  //       return result;
  //     }, {} as Record<'existManager'|'existReceiverAuth', boolean>)

  //     let refreshDetails = [...details];
  //     if( !flag.existManager )
  //       refreshDetails.push('manager.roles');
  //     if( !flag.existReceiverAuth )
  //       refreshDetails = [...refreshDetails, 'receiverManager.roles', 'receiverUser.roles']
        
  //     // console.log('[!!!!]', flag);
  //     return {
  //       details: refreshDetails,
  //       relay: flag
  //     }
  //   },
  //   afterSetProperty: ({entities, data = {}, relay = {}}) => {
  //     const auth = data.auth as User|Manager;
  //     const isRoot = isContainRoles(auth, ['root'] as Array<DEFAULT_ROLE>);

  //     if( !relay.existManager )
  //       entities.filter( notf => notf.manager)
  //       .forEach( notf => delete notf.manager);

  //     if( !relay.existReceiverAuth )
  //       entities.filter( notf => notf.receiverUser || notf.receiverManager)
  //       .forEach( notf => {
  //         delete notf.receiverUser;
  //         delete notf.receiverManager;
  //       })

  //     if( auth !== undefined ){
  //       entities.forEach( notf => {
  //         const isRelation = isSameAuth(notf.manager, auth)
  //           || isSameAuth(notf.receiverManager, auth)
  //           || isSameAuth(notf.receiverUser, auth)
  //         if( !isRoot && !isRelation )
  //           Object.keys(notf).forEach( k => {
  //             if( k === 'id' || notf[k] instanceof Date ){
  //               /*  TODO document why this block is empty */
  //             }else if( typeof notf[k] === 'string' ){
  //               notf[k] = UNKNOWN
  //             }else if( typeof notf[k] === 'object' )
  //               delete notf[k];
  //           })
          
  //       })
  //     }
      
  //   }

  // };
  public readonly setPropertySubscriber: Array<SetPropertyEvent<Notification, PathString<Notification>>> = [
    {
      where: ({ data }) => data.auth !== undefined,
      details: [ 'manager', 'receiverUser', 'receiverManager'],
      after: ({ entities, data }) => {
        const { auth } = data,
          isRoot = isContainRoles(auth, ['root'] as Array<DEFAULT_ROLE>);
        entities.forEach( entity => {
          const isRelation = isSameAuth(entity.manager, auth)
          || isSameAuth(entity.receiverManager, auth)
          || isSameAuth(entity.receiverUser, auth)
          if( !isRoot && !isRelation ){
            keysTypeGuard(entity).forEach( key => {
              const field = entity[key]
              if( isUndeclared(field) || field instanceof Date )
                return;
              else if( ['uk', 'id'].includes( key ) ) { /* TODO document why this block is empty */ }
              else if( typeof field === 'string' )
                entity[key] = UNKNOWN as never;
              else if( typeof field === 'number')
                entity[key] = NaN as never;
              else 
                entity[key] = undefined as never;
            })
          }
        })
      }
    }
  ];
  public readonly saveSubscribe: SaveSubscriber<Notification, PathString<Notification>>;

  public searchQuery({
    uk, state, managerUk, receiverManagerUk, receiverUserUk,
    receiverContractorUk, creator, type, media, reserve_date, uks
  }: SearchNotificationDto = {}): SelectQueryBuilder<Notification> {
    let query = this.createQueryBuilder(this.alias);

    if(uk) {
      query = query.andWhere(`${this.alias}.uk = :uk`, {uk});
    }

    if(uks) {
      query = query.andWhere(`${this.alias}.uk IN (:uks)`, {uks})
    }

    if(state?.length > 0) {
      query = query.andWhere(`${this.alias}.state IN (:state)`, {state});
    }

    if(managerUk) {
      query = query.leftJoin(`${this.alias}.manager`, `SRC_${MANAGERS}`)
        .andWhere(`SRC_${MANAGERS}.uk = :managerUk`, {managerUk});
    }

    if(receiverManagerUk) {
      query = query.leftJoin(`${this.alias}.receiverManager`, `SRC_RCV_${MANAGERS}`)
        .andWhere(`SRC_RCV_${MANAGERS}.uk = :receiverManagerUk`, {receiverManagerUk});
    }

    if(receiverUserUk) {
      query = query.leftJoin(`${this.alias}.receiverUser`, `SRC_RCV_${USERS}`)
        .andWhere(`SRC_RCV_${USERS}.uk = :receiverUserUk`, {receiverUserUk});
    }

    if(creator) {
      query = query.andWhere(`${this.alias}.creator = :creator`, {creator});
    }

    if(type) {
      query = query.andWhere(`${this.alias}.type = :type`, {type});
    }

    if(media) {
      query = query.andWhere(`${this.alias}.media = :media`, {media});
    }

    if(reserve_date) {
      query = query.andWhere(`${this.alias}.reserve_date = :reserve_date`, {reserve_date});
    }

    return query;
  }


}