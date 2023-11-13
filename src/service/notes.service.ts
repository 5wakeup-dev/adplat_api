import { Injectable } from "@nestjs/common";
import { TABLE_ALIAS } from "src/config/typeorm.config";
import { Manager } from "src/entity/member/manager.entity";
import { Note, NoteDto } from "src/entity/note/note.entity";
import { SearchNoteDto } from "src/entity/note/note.interface";
import { BASIC_EXCEPTION } from "src/exception/basic.exception";
import { NoteRepository } from "src/repository/note/note.repository";
import { isSameAuth } from "src/util/entity.util";
import { ListPageRes } from "src/util/entity/listPage";
import PageInfo from "src/util/entity/PageInfo";
import { deepClone } from "src/util/index.util";
import { getRepositories, TransactionHelper, TransactionHelperParam } from "src/util/typeorm.util";
import { Connection } from "typeorm";

const {
  NOTES
} = TABLE_ALIAS;

@Injectable()
export class NotesService {
  constructor(
    private connection: Connection
  ) {}

  @TransactionHelper({ paramIndex: 2 })
  async createNote(
    dto: NoteDto, auth: Manager,
    transaction: TransactionHelperParam = {connection: this.connection, entityManager: this.connection.manager}
  ): Promise<Note> {
    if(!dto) {
      throw BASIC_EXCEPTION.NOT_ALLOW_EMPTY_ON_PROCESS;
    } else if(!auth) {
      throw BASIC_EXCEPTION.NOT_ALLOW_AUTH;
    }

    const {entityManager} = transaction;
    const repos = getRepositories({
      note: NoteRepository
    }, entityManager);

    return repos.note.save(dto);
  }

  @TransactionHelper({ paramIndex: 2 })
  async deleteNote(
    note: Note, auth: Manager,
    {entityManager}: TransactionHelperParam = {connection: this.connection, entityManager: this.connection.manager}
  ): Promise<string> {
    if(!note) {
      throw BASIC_EXCEPTION.NOT_ALLOW_EMPTY_ON_PROCESS;
    } else if(!auth || !isSameAuth(note.manager, auth)) {
      throw BASIC_EXCEPTION.NOT_ALLOW_AUTH;
    }

    const repos = getRepositories({
      note: NoteRepository
    }, entityManager);

    const deletedId = note.id;
    return repos.note.remove(note)
      .then(() => deletedId);
  }

  @TransactionHelper({ paramIndex: 3 })
  async updateNote(
    origin: Note, dto: NoteDto, auth: Manager,
    {entityManager}: TransactionHelperParam = {connection: this.connection, entityManager: this.connection.manager}
  ): Promise<Note> {
    if(!origin || !dto) {
      throw BASIC_EXCEPTION.NOT_ALLOW_EMPTY_ON_PROCESS;
    }
    const isOwner = isSameAuth(origin?.manager, auth);
    if(!isOwner) {
      throw BASIC_EXCEPTION.NOT_ALLOW_AUTH;
    }

    const repos = getRepositories({
      note: NoteRepository
    }, entityManager);

    const cloneOrigin = deepClone(origin);

    return repos.note.save(dto)
      .then(entity =>
        Object.assign(cloneOrigin, entity)
      );
  }

  async readNote(
    noteUk: string, auth: Manager
  ): Promise<Note> {
    if(!noteUk) {
      throw BASIC_EXCEPTION.EMPTY_CONTENT;
    }

    const repos = getRepositories({
      note: NoteRepository
    }, this.connection.manager);

    const note: Note = await repos.note.getOne(
      ['manager'], ctx => ctx.searchQuery({uk: noteUk})
    );

    if(!note) {
      throw BASIC_EXCEPTION.EMPTY_CONTENT;
    }

    const isOwner = isSameAuth(note?.manager, auth);
    if(!isOwner) {
      throw BASIC_EXCEPTION.NOT_ALLOW_AUTH;
    }
    
    return note;
  }

  async readNoteListPage(
    search: SearchNoteDto, auth: Manager
  ): Promise<ListPageRes<Note>> {
    if(!auth) {
      throw BASIC_EXCEPTION.NOT_ALLOW_AUTH;
    }

    search.managerUk = auth.uk;

    const repos = getRepositories({
      note: NoteRepository
    }, this.connection.manager);

    const {curPage, rowPerPage, pagePerBlock} = search;

    const totalRow: number = await repos.note
      .searchQuery(search)
      .getCount();
    if(totalRow === 0) {
      throw BASIC_EXCEPTION.EMPTY_CONTENT;
    }

    const page: PageInfo = new PageInfo({curPage, rowPerPage, totalRow, pagePerBlock});

    const list = await repos.note
      .searchQuery(search)
      .skip(page.startRow)
      .take(page.rowPerPage)
      .getMany();

    return {page, list};
  }
}