import { Injectable } from "@nestjs/common";
import { Notification } from "src/entity/notification/notification.entity";
import { NotificationHistory } from "src/entity/notification/notificationHistory.entity";
import { filterVariable, getPick } from "src/util/index.util";
import { getTemplateData } from "src/util/notification.util";
import { Connection, DeepPartial, EntitySubscriberInterface, EventSubscriber, InsertEvent, UpdateEvent } from "typeorm";
import Handlebars from "handlebars";
import { NotificationError } from "src/entity/notification/notificationError.entity";
import { NotificationState } from "src/util/entity.util";

@Injectable()
@EventSubscriber()
export class NotificationSubscriber implements EntitySubscriberInterface<Notification> {
  constructor(
    connection: Connection
  ){
    connection.subscribers.push(this);
  }

  listenTo(): any {
    return Notification;
  }

  async beforeInsert( {entity}: InsertEvent<Notification>): Promise<any> {
    deleteIfNotObject(entity, ['templateData', 'data'])
    if( entity.templateId ){
      const tempInfo = await getTemplateData(entity.templateId, entity.templateData);
      if( !tempInfo )
        delete entity.templateId;
      else {
        entity.template = tempInfo.template;
        entity.templateData = tempInfo.data;
        entity.content = Handlebars.compile(tempInfo.template)(tempInfo.data)
      }
    }else
      delete entity.template
    

  }

  async beforeUpdate( event: UpdateEvent<Notification>): Promise<any> {
    const {
      state: variableState
    } = filterVariable(event.databaseEntity, event.entity);

    if( variableState === NotificationState.SENDING )
      event.entity.sended_uk = null;
    

    deleteIfNotObject(event.entity, ['templateData', 'data'])
    await syncTemplateFromEntity(event);

  }

  async afterUpdate( event: UpdateEvent<Notification> ): Promise<any> {

    await Promise.all([
      recordModifiedIfModified(event)
    ])
  }
}

const syncTemplateFromEntity = async ( 
  { entity, databaseEntity }: UpdateEvent<Notification> 
): Promise<any> => {
  const {
    templateId: variableTemplateId,
    templateData: variableTemplateData
  } = filterVariable(databaseEntity, entity);

  if( variableTemplateId || variableTemplateData ){
    const tempInfo = await getTemplateData( 
      variableTemplateId || databaseEntity.templateId, 
      variableTemplateData || databaseEntity.templateData
    )
    if( !tempInfo ){
      entity.template = undefined;
      entity.templateData = undefined;
      entity.content = undefined;
      return;
    }else{
      entity.template = tempInfo.template;
      entity.templateData = tempInfo.data;
      entity.content = Handlebars.compile(tempInfo.template)(tempInfo.data)
    }
  }else
    entity.content = undefined;
}

const deleteIfNotObject = (entity: DeepPartial<Notification>, keys: Array<keyof Notification>) => {
  keys.forEach( key => {
    const val = entity[key];
    if( val ){
      if( typeof val !== 'object' || Array.isArray(val) )
        delete entity[key];
    }
  })
}

const recordModifiedIfModified = (
  { entity, databaseEntity, manager: em }: UpdateEvent<Notification>
): Promise<NotificationHistory> =>{
  const {
    media, method, key, 
    templateId, template, templateData, 
    sended_uk, title, content, data, 
    reserve_date, state
  } = entity;
  const compare = {
    media, method, key,
    templateId, template, templateData,
    sended_uk, title, content, data,
    reserve_date, state
  }

  const modified = filterVariable(databaseEntity, compare);
  // console.log('[!!!!] MODIFIED', modified, entity);
  if( !modified || Object.keys(modified).length === 0 
    || Object.keys(modified).filter( k => databaseEntity[k] !== null ).length === 0 
  )
    return;
  return em.getRepository(NotificationHistory)
  .save({
    notification: entity,
    ...Object.keys(modified).reduce( (rst, k) => {
      rst[k] = databaseEntity[k];
      return rst;
    }, {})
  });

}


@Injectable()
@EventSubscriber()
export class NotificationErrorSubscriber implements EntitySubscriberInterface<NotificationError> {
  constructor(
    connection: Connection
  ){
    connection.subscribers.push(this);
  }
  
  listenTo(): any {
    return NotificationError;
  }

  beforeInsert(event: InsertEvent<NotificationError>): void | Promise<any> {
    const { entity } = event;

    if( entity.notification ){
      Object.assign(
        entity, 
        getPick(entity.notification, 
          [
            'type', 'media', 'method', 'key', 
            'templateId', 'template', 'templateData', 
            'sended_uk', 'title', 'content', 'data'
          ]
        )
      )
    }
  }
}