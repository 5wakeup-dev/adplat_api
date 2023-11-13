import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";
import * as dayjs from "dayjs";
import { Auth } from "src/decorator/auth.decorator";
import { Manager } from "src/entity/member/manager.entity";
import { Note, NoteDto, NoteReq, NoteRes } from "src/entity/note/note.entity";
import { SearchNoteDto } from "src/entity/note/note.interface";
import { dividePipe } from "src/pipe/divide.pipe";
import { dynamicPipe } from "src/pipe/dynamic.pipe";
import { fitPipe } from "src/pipe/fit.pipe";
import { selectPipe } from "src/pipe/select.pipe";
import { NoteRepository } from "src/repository/note/note.repository";
import { KeywordsService } from "src/service/keywords.service";
import { NotesService } from "src/service/notes.service";
import { noteUtil } from "src/util/entity.util";
import { ListPageRes } from "src/util/entity/listPage";
import { isNumberForm } from "src/util/format.util";
import { getRange, initNumber, splitToObject } from "src/util/index.util";
import { getRepositories, PathString } from "src/util/typeorm.util";
import { Connection } from "typeorm";

const NOTE_FIT_PIPE = fitPipe<NoteReq>([
  'type', 'content', 'start_date', 'end_date', 'labels', 'links'
])
const NOTE_SEARCH_NUMBER_PIPE = dynamicPipe<SearchNoteDto>(({value}) => {
  (['curPage', 'rowPerPage', 'pagePerBlock'] as Array<keyof SearchNoteDto>)
    .forEach(key => {
      const val = value[key];
      if(val !== undefined) {
        value[key] = initNumber(val) as never;
      }
    })
  return value;
})
const NOTE_SEARCH_SELECT_PIPE = selectPipe<SearchNoteDto>({
  range: (_, val) => getRange<Date>(val as string, v => isNumberForm(v) ? dayjs(initNumber(v)).toDate() : undefined),
  orderBy: (_, val) => {
    const {column, order} = splitToObject(
      val, 
      ['column', 'order'],
      {
        limit: [['id', 'existPeriod'], ['DESC', 'ASC']],
        def: {column: 'id', order: 'DESC'}
      }
    );
    return `${column}-${order}`;
  }
})
const NOTE_SEARCH_FIT_PIPE = fitPipe<SearchNoteDto>([
  'curPage', 'rowPerPage', 'pagePerBlock', 'orderBy',
  'uk', 'managerUk', 'type', 'content', 'existPeriod', 'range',
  'label', 'keyword'
])

@Controller('notes')
export class NotesController {
  constructor(
    private connection: Connection,
    private notesService: NotesService,
    private keywordsService: KeywordsService
  ) {}

  @Post()
  async postNote(
    @Body(NOTE_FIT_PIPE) body: NoteReq,
    @Auth(Manager) auth: Manager
  ): Promise<NoteRes> {
    const dto: NoteDto = await noteUtil.reqToDto(
      body, auth,
      {
        keywordsService: this.keywordsService,
        transaction: {connection: this.connection, entityManager: this.connection.manager}
      }
    );

    return this.notesService.createNote(dto, auth)
      .then(nt => new NoteRes(nt));
  }

  @Delete(':note_uk')
  async deleteNote(
    @Param('note_uk') noteUk: string,
    @Auth(Manager) auth: Manager
  ): Promise<string> {
    const repos = getRepositories({
      note: NoteRepository
    }, this.connection.manager);

    const note: Note = await repos.note.getOne(
      ['manager'], ctx => ctx.searchQuery({uk: noteUk})
    );

    return this.notesService.deleteNote(note, auth);
  }

  @Patch(':note_uk')
  async patchNote(
    @Param('note_uk') noteUk: string,
    @Body(NOTE_FIT_PIPE) body: NoteReq,
    @Auth(Manager) auth: Manager
  ): Promise<NoteRes> {
    const repos = getRepositories({
      note: NoteRepository
    }, this.connection.manager);

    const note: Note = await repos.note.getOne(
      ['manager', 'links'], ctx => ctx.searchQuery({uk: noteUk})
    );

    const dto: NoteDto = await noteUtil.reqToDto(
      body, auth,
      {
        origin: note,
        keywordsService: this.keywordsService,
        transaction: {connection: this.connection, entityManager: this.connection.manager}
      }
    );
    
    return this.notesService.updateNote(note, dto, auth)
      .then(nt => new NoteRes(nt));
  }

  @Get(':note_uk')
  async getNote(
    @Param('note_uk') noteUk: string,
    @Auth(Manager) auth: Manager,
    @Query(
      'detail', dividePipe()
    ) details: Array<PathString<Note>>
  ): Promise<NoteRes> {
    return this.notesService.readNote(noteUk, auth)
      .then(async nt => {
        await this.connection.manager.getCustomRepository(NoteRepository)
          .setProperty({details, data: {auth}}, [nt]);

        return new NoteRes(nt);
      })
  }

  @Get(':type/page')
  async getNoteListPage(
    @Param('type') type: string,
    @Auth() auth: Manager,
    @Query(
      NOTE_SEARCH_NUMBER_PIPE,
      NOTE_SEARCH_FIT_PIPE,
      NOTE_SEARCH_SELECT_PIPE
    ) search: SearchNoteDto,
    @Query(
      'detail', dividePipe()
    ) details: Array<PathString<Note>>
  ): Promise<ListPageRes<NoteRes>> {
    if(type.toLowerCase() !== 'all') {
      search.type = type;
    }

    return this.notesService.readNoteListPage(search, auth)
      .then(async ({page, list}) => {
        await this.connection.manager.getCustomRepository(NoteRepository)
          .setProperty({details, data: {auth}}, list);

        return {
          page,
          list: list.map(nt => new NoteRes(nt))
        }
      });
  }
}