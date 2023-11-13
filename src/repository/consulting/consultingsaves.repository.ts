import { TABLE_ALIAS } from "src/config/typeorm.config";
import { Attachment } from "src/entity/comm/attachment.entity";
import { Consulting, ConsultingDto } from "src/entity/consulting/consulting.entity";
import { SearchAroundConsultingDto, SearchConsultingDto } from "src/entity/consulting/consulting.interface";
import { ConsultingHierarchical } from "src/entity/consulting/consultingHierarchical.entity";
import { ConsultingProperty } from "src/entity/consulting/consultingProperty.entity";
import { Manager } from "src/entity/member/manager.entity";
import { User } from "src/entity/member/user.entity";
import { Menu } from "src/entity/menu/menu.entity";
import { equals, maxText } from "src/util/format.util";
import { ChainRelation, ChainRepository, getRepositories, PathString, SaveSubscriber, SetPropertyEvent } from "src/util/typeorm.util";
import { DeepPartial, EntityManager, EntityRepository, getMetadataArgsStorage, Repository, SaveOptions, SelectQueryBuilder } from "typeorm";
import { AttachmentRepository } from "../comm/attachment.repository";
import { ManagerRepository } from "../member/manager.repository";
import { UserRepository } from "../member/user.repository";
import { MenuRepository } from "../menu/menu.repository";
import { ConsultingSave } from "src/entity/consulting/consultingSave.entity";
import { NetAddress } from "src/entity/comm/netAddress.entity";
import { ConsultingRepository } from "./consulting.repository";

// const OBJECT_KEYS: Array<keyof Consulting> = [ 'manager', 'user', 'attachments', 'properties', 'hierarchical'];
// const STRING_KEYS: Array<keyof Consulting> = [ 'title', 'content', 'writer' ];
// // const TITLE_REG = /^title|title\..+/;
// const CONTENT_REG = /^content|content\..+/;
// const MANAGER_REG = /^manager|manager\..+/;
// const USER_REG = /^user|user\..+/;

const {
  CONSULTINGS,
  CONSULTING_HIERARCHICAL,
  CONSULTING_PROPERTIES,
  CONSULTING_SAVES,
  CONSULTING_ATTACHMENTS,
  NET_ADDRESS,
  MANAGERS,
  USERS
} = TABLE_ALIAS;

@EntityRepository(ConsultingSave)
export class ConsultingSaveRepository extends ChainRepository<ConsultingSave> {
  public readonly primaryKeys: Array<keyof ConsultingSave> = ['id'];
  public readonly alias: string = CONSULTING_SAVES;
  public readonly relationChain: ChainRelation<ConsultingSave> = {
    netAddress: {
      Entity: NetAddress, 
      getBridges: async ({selfEntities}) =>
        selfEntities.map( ({id, netAddressId}) => ({self: {id}, inverse: {id: netAddressId}}))
      ,
      getDatas: ({entityManager: em, selfEntities}) => 
        em.getRepository(NetAddress)
        .createQueryBuilder(NET_ADDRESS)
        .leftJoin(ConsultingSave, this.alias, `${NET_ADDRESS}.id = ${this.alias}.netAddress`)
        .where(`${this.alias}.id IN (:ids)`, {ids: selfEntities.map( ({id}) => id)})
        .getMany()
        
    },
    
  }

  public readonly setPropertySubscriber: Array<SetPropertyEvent<ConsultingSave, PathString<ConsultingSave>>> 
  public readonly saveSubscribe: SaveSubscriber<ConsultingSave, PathString<ConsultingSave>>
  public searchQuery({
  }: SearchConsultingDto = {}): SelectQueryBuilder<ConsultingSave> {
    return this.createQueryBuilder(this.alias);

  }
}