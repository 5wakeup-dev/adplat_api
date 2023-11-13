import { Injectable } from "@nestjs/common";
import { ArtworkI18n } from "src/entity/artwork/artworkI18n.entity";
import { isUndeclared, XML_FORM } from "src/util/format.util";
import { Connection, EntitySubscriberInterface, EventSubscriber, InsertEvent, UpdateEvent } from "typeorm";


@Injectable()
@EventSubscriber()
export class ArtworkI18nSubscriber implements EntitySubscriberInterface<ArtworkI18n> {
  constructor(
    connection: Connection
  ){
    connection.subscribers.push(this);
  }

  listenTo(): any {
    return ArtworkI18n;
  }

  beforeInsert( {entity}: InsertEvent<ArtworkI18n>): void | Promise<any> {
    if( entity.content )
      entity.search = entity.content.replace(XML_FORM, '');
  }

  beforeUpdate( {entity, }: UpdateEvent<ArtworkI18n>):Promise<any> | void {
    if( !isUndeclared(entity.content) )
      entity.search = entity.content.replace(XML_FORM, '');


  }
}