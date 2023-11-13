import { Injectable } from "@nestjs/common";
import { TABLE_ALIAS } from "src/config/typeorm.config";
import { Consulting } from "src/entity/consulting/consulting.entity";
import { ConsultingHierarchical } from "src/entity/consulting/consultingHierarchical.entity";
import { XML_FORM } from "src/util/format.util";
import { aesDec, aesEnc } from "src/util/secret.util";
import { getRepositories } from "src/util/typeorm.util";
import { Connection, EntityManager, EntitySubscriberInterface, EventSubscriber, InsertEvent, LoadEvent, ObjectLiteral, UpdateEvent } from "typeorm";

const ENCRYT_KEYS: Array<string> = ['password']
const {
  CONSULTING_HIERARCHICAL
} = TABLE_ALIAS;

@Injectable()
@EventSubscriber()
export class ConsultingSubscriber implements EntitySubscriberInterface<Consulting> {
  constructor(
    connection: Connection
  ) {
    connection.subscribers.push(this);
  }

  listenTo(): any {
    return Consulting;
  }

  beforeInsert(event: InsertEvent<Consulting>) :Promise<any> | void {
    const {entity} = event;
    if(entity.content)
      entity.search = entity.content.replace(XML_FORM, '');

    Object.keys(entity)
    .filter(k => entity[k] && ENCRYT_KEYS.includes(k))
    .forEach(k => entity[k] = aesEnc(entity[k]));
  }

  beforeUpdate(event: UpdateEvent<Consulting>): Promise<any> | void {
    const {entity} = event;
    if(entity.content)
      entity.search = entity.content.replace(XML_FORM, '');
      Object.keys(entity)
      .filter(k => entity[k] && ENCRYT_KEYS.includes(k))
      .forEach(k => entity[k] = aesEnc(entity[k]));
  }

  async afterLoad(entity: Consulting, event: LoadEvent<Consulting>): Promise<any> {
    Object.keys(entity)
    .filter(k => entity[k] && ENCRYT_KEYS.includes(k))
    .forEach(k => entity[k] = aesDec(entity[k]));

    await this.setIsBranchToConsulting(entity, event.manager)
  }

  async setIsBranchToConsulting(
    consulting: Consulting, manager: EntityManager
  ): Promise<Consulting> {
    if (!consulting) {
      return;
    }

    const repo = getRepositories({
      consultingHierarchical: ConsultingHierarchical
    }, manager);

    const hierarchicals: Array<ConsultingHierarchical> =
      await repo.consultingHierarchical
        .createQueryBuilder(`${CONSULTING_HIERARCHICAL}`)
        .where(`${CONSULTING_HIERARCHICAL}.groupParent = :groupParent`, { groupParent: consulting.id })
        .getMany();
    
    consulting.branch = hierarchicals
      .filter(h => consulting.id === h.groupParent)
      .length
    

    return consulting;
  }
}