import { TABLE_ALIAS } from "src/config/typeorm.config";
import { KeywordLabel } from "src/entity/comm/keywordLabel.entity";
import { NoteLabel } from "src/entity/note/note.bridge";
import { ChainRelation, ChainRepository, PathString, SaveSubscriber, SetPropertyEvent } from "src/util/typeorm.util";
import { EntityRepository, SelectQueryBuilder } from "typeorm";
import { KeywordLabelRepository } from "../comm/keywordLabel.repository";

const {
  NOTE_LABELS,
  KEYWORD_LABELS
} = TABLE_ALIAS;

@EntityRepository(NoteLabel)
export class NoteLabelRepository extends ChainRepository<NoteLabel> {
  public readonly primaryKeys: Array<keyof NoteLabel> = ['noteId', 'keywordLabelId'];
  public readonly alias: string = NOTE_LABELS;
  public readonly relationChain: ChainRelation<NoteLabel> = {
    keywordLabel: {
      Entity: KeywordLabel, Repository: KeywordLabelRepository,
      getBridges: ({selfEntities}) =>
        this.searchQuery()
          .leftJoin(`${this.alias}.keywordLabel`, `${KEYWORD_LABELS}`)
          .select(`${this.alias}.noteId AS self`)
          .addSelect(`${this.alias}.keywordLabelId AS inverse`)
          .where(`${this.alias}.noteId IN (:ids)`, {ids: selfEntities.map(({noteId}) => noteId)})
          .orderBy(`${KEYWORD_LABELS}.ord`, 'ASC')
          .getRawMany()
          .then(result => result.map(({self, inverse}) => ({self: {noteId: self, keywordLabelId: inverse}, inverse: {id: inverse}})))
    }
  }

  // public readonly setPropertySubscribe: ChainingSetPropertySubscribe<NoteLabel, PathString<NoteLabel>> = {
  //   beforeSetProperty: ({details}) => ({ details: [ ...details, 'keywordLabel' ] })
  // };
  public readonly setPropertySubscriber: Array<SetPropertyEvent<NoteLabel, PathString<NoteLabel>>> = [
    {
      where: ({details}) => !details.some( detail => detail === 'keywordLabel' ),
      before: ({details}) => { details.push('keywordLabel') }
    }
  ];


  public readonly saveSubscribe: SaveSubscriber<NoteLabel, PathString<NoteLabel>>;

  public searchQuery(): SelectQueryBuilder<NoteLabel> {
    return this.createQueryBuilder(this.alias);
  }
}