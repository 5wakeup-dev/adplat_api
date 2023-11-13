import { TABLE_ALIAS } from "src/config/typeorm.config";
import { Manager } from "src/entity/member/manager.entity";
import { NoteLabel } from "src/entity/note/note.bridge";
import { Note } from "src/entity/note/note.entity";
import { SearchNoteDto } from "src/entity/note/note.interface";
import { NoteLink } from "src/entity/note/noteLink.entity";
import { splitToObject } from "src/util/index.util";
import { ChainRelation, ChainRepository, PathString, SaveSubscriber, SetPropertyEvent } from "src/util/typeorm.util";
import { EntityRepository, SelectQueryBuilder } from "typeorm";
import { ManagerRepository } from "../member/manager.repository";
import { NoteLabelRepository } from "./noteLabel.repository";

const {
  NOTES, NOTE_LABELS, NOTE_LINKS,
  MANAGERS, KEYWORD_LABELS, KEYWORDS
} = TABLE_ALIAS;

@EntityRepository(Note)
export class NoteRepository extends ChainRepository<Note> {
  public readonly primaryKeys: Array<keyof Note> = ['id'];
  public readonly alias: string = NOTES;
  public readonly relationChain: ChainRelation<Note> = {
    labels: {
      Entity: NoteLabel, Repository: NoteLabelRepository,
      fieldIsMany: true,
      getBridges: ({entityManager: em, selfEntities}) =>
        em.getCustomRepository(NoteLabelRepository)
          .searchQuery()
          .select(`${NOTE_LABELS}.noteId AS self`)
          .addSelect(`${NOTE_LABELS}.keywordLabelId AS inverse`)
          .where(`${NOTE_LABELS}.noteId IN (:ids)`, {ids: selfEntities.map(({id}) => id)})
          .orderBy(`${NOTE_LABELS}.ord`, 'ASC')
          .getRawMany()
          .then(result => result.map(({self, inverse}) => ({self: {id: self}, inverse: {noteId: self, keywordLabelId: inverse}})))
    },
    manager: {
      Entity: Manager, Repository: ManagerRepository,
      getBridges: ({selfEntities}) =>
        this.searchQuery()
          .select(`${this.alias}.id AS self`)
          .addSelect(`${this.alias}.manager AS inverse`)
          .where(`${this.alias}.id IN (:ids)`, {ids: selfEntities.map(({id}) => id)})
          .getRawMany()
          .then(result => result.map(({self, inverse}) => ({self: {id: self}, inverse: {id: inverse}})))
    },
    links: {
      Entity: NoteLink, fieldIsMany: true,
      getBridges: ({entityManager: em, selfEntities}) => 
        em.getRepository(NoteLink)
        .createQueryBuilder(NOTE_LINKS)
        .select(`${NOTE_LINKS}.note AS self`)
        .addSelect(`${NOTE_LINKS}.id AS inverse`)
        .where(`${NOTE_LINKS}.note IN (:ids)`, {ids: selfEntities.map(({id}) => id)})
        .orderBy(`${NOTE_LINKS}.note`, 'DESC')
        .addOrderBy(`${NOTE_LINKS}.ord`, 'ASC')
        .getRawMany()
        .then(result => result.map(({self, inverse}) => ({self: {id: self}, inverse: {id: inverse}})))
      ,
      getDatas: ({entityManager: em, selfEntities}) => 
        em.getRepository(NoteLink)
        .createQueryBuilder(NOTE_LINKS)
        .where(`${NOTE_LINKS}.note IN (:ids)`, {ids: selfEntities.map(({id}) => id)})
        .getMany()
    }
  };

  // public readonly setPropertySubscribe: ChainingSetPropertySubscribe<Note, PathString<Note>>;
  public readonly setPropertySubscriber: Array<SetPropertyEvent<Note, PathString<Note>>>;

  public readonly saveSubscribe: SaveSubscriber<Note, PathString<Note>> = {
    events: [
      {
        where: entity => !!entity,
        beforeSave: async ({entity}) => {
          entity.labels = [];
        },
        afterSave: async ({cloneEntity, entity, dataBaseEntity}) => {
          const {labels} = cloneEntity;
          if(labels && labels.length > 0) {
            labels.forEach(label => label.noteId = dataBaseEntity.id || entity.id)
            await this.manager.getCustomRepository(NoteLabelRepository)
              .save(labels);
            entity.labels = labels;
          }
        }
      }
    ]
  };

  public searchQuery({
    uk, managerUk, content, type, existPeriod, range, label, keyword, orderBy
  }: SearchNoteDto = {}): SelectQueryBuilder<Note> {
    let query = this.createQueryBuilder(this.alias);

    if(uk) {
      query = query.andWhere(`${this.alias}.uk = :uk`, {uk});
    }

    if(managerUk) {
      query = query.leftJoin(`${this.alias}.manager`, `SRC_${MANAGERS}`)
        .andWhere(`SRC_${MANAGERS}.uk = :managerUk`, {managerUk});
    }

    if(content) {
      query = query.andWhere(`${this.alias}.content LIKE :content`, {content: `%${content}%`});
    }

    if(type) {
      query = query.andWhere(`${this.alias}.type = :type`, {type});
    }

    if( existPeriod !== undefined )
      query = query.andWhere(`${this.alias}.existPeriod IS ${existPeriod ? 'NOT NULL' : 'NULL'}`);
    

    if(range) {
      const start = range.start;
      const end = range.end;
      if(start && end) {
        query = query.andWhere(`${this.alias}.start_date >= :start`, {start})
          .andWhere(`${this.alias}.start_date <= :end`, {end})
          .andWhere(`${this.alias}.end_date >= :start`, {start})
          .andWhere(`${this.alias}.end_date <= :end`, {end});
      } else if(start && !end) {
        query = query.andWhere(`(${this.alias}.start_date >= :start OR ${this.alias}.end_date >= :start)`, {start});
      } else if(!start && end) {
        query = query.andWhere(`(${this.alias}.start_date <= :end OR ${this.alias}.end_date <= :end)`, {end});
      }
    }

    if(label || keyword) {
      query = query.leftJoin(`${this.alias}.labels`, `SRC_${NOTE_LABELS}`)
        .leftJoin(`SRC_${NOTE_LABELS}.keywordLabel`, `SRC_${KEYWORD_LABELS}`);
      if(label) {
        query = query.andWhere(`SRC_${KEYWORD_LABELS}.type LIKE :label`, {label: `%${label}%`});
      }
      if(keyword) {
        query = query.leftJoin(`SRC_${KEYWORD_LABELS}.keyword`, `SRC_${KEYWORDS}`)
          .andWhere(`SRC_${KEYWORDS}.keyword LIKE :keyword`, {keyword: `%${keyword}%`})
      }
    }

    if( orderBy ) {
      const { column, order } = splitToObject(orderBy, ['column', 'order']);
      // const column = orderBy['column'];
      // const order = orderBy['order'];
      if( column === 'existPeriod' ) 
        query = query.orderBy(`${this.alias}.existPeriod`, order as 'DESC'|'ASC')
      
    }
    query = query.addOrderBy(`${this.alias}.id`, 'DESC');

    return query;
  };
}