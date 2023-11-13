import { Injectable } from "@nestjs/common";

import { Manager } from "src/entity/member/manager.entity";
import { User } from "src/entity/member/user.entity";

import { DEFAULT_ROLE } from "src/entity/role/role.interface";
import { BASIC_EXCEPTION } from "src/exception/basic.exception";

import { MenuRepository } from "src/repository/menu/menu.repository";

import { isContainRoles } from "src/util/entity.util";
import { ListPageRes } from "src/util/entity/listPage";
import PageInfo from "src/util/entity/PageInfo";
import { getRepositories, TransactionHelper, TransactionHelperParam } from "src/util/typeorm.util";
import { Connection } from "typeorm";
import { ReserveRequest, ReserveRequestDto, SearchReserveDto } from "src/entity/reserve/reserveRequest.entity";
import { ReserveRequestRepository } from "src/repository/reserve/reserveRequest.repository";

@Injectable()
export class ReserveRequestService {
  constructor(
    private connection: Connection
  ) { }

  @TransactionHelper({ paramIndex: 1 })
  async createReserve(
    dto: ReserveRequestDto,
    transaction: TransactionHelperParam = { connection: this.connection, entityManager: this.connection.manager }
  ): Promise<ReserveRequest> {
    if (!dto) {
      throw BASIC_EXCEPTION.NOT_ALLOW_EMPTY_ON_PROCESS;
    }
    if(!dto.email)
    throw BASIC_EXCEPTION.NOT_ALLOW_EMPTY_ON_PROCESS;// 연락처 적으란 말로 바꿔
    

    const repos = getRepositories({
      reserve:ReserveRequestRepository,
    }, transaction.entityManager);

    
    return await repos.reserve.save(dto);
  }

  @TransactionHelper({ paramIndex: 2 })
  async delete(
    reserve: ReserveRequest, auth: Manager,
    transaction: TransactionHelperParam = { connection: this.connection, entityManager: this.connection.manager }
  ): Promise<string> {
    if (!reserve) {
      throw BASIC_EXCEPTION.NOT_ALLOW_EMPTY_ON_PROCESS;
    }
    const isRoot = isContainRoles(auth, ['root'] as Array<DEFAULT_ROLE>);
    if (!auth || !isRoot) {
      throw BASIC_EXCEPTION.NOT_ALLOW_AUTH;
    }

    const repos = getRepositories({
      reserve: ReserveRequestRepository
    }, transaction.entityManager);

    const deletedId = reserve.id;

    return repos.reserve.remove(reserve)
      .then(() => deletedId);
  }

  @TransactionHelper({ paramIndex: 2 })
  async readReserve(
    uk: string, auth: Manager | User,
    transaction: TransactionHelperParam = { connection: this.connection, entityManager: this.connection.manager }
  ): Promise<ReserveRequest> {
    if (!uk) {
      throw BASIC_EXCEPTION.EMPTY_CONTENT;
    }
    const repos = getRepositories({
      reserve:ReserveRequestRepository
    }, transaction.entityManager);

    const reserve: ReserveRequest = await repos.reserve.searchQuery({uk}).getOne();

    if (!reserve) {
      throw BASIC_EXCEPTION.EMPTY_CONTENT;
    }

    return reserve;
  }

  @TransactionHelper({ paramIndex: 2 })
  async readReserveListPage(
    search: SearchReserveDto, auth: Manager | User,
    transaction: TransactionHelperParam = { connection: this.connection, entityManager: this.connection.manager }
  ): Promise<ListPageRes<ReserveRequest>> {
    const repos = getRepositories({
      reserve: ReserveRequestRepository,
      menu: MenuRepository
    }, transaction.entityManager);

    if(!auth&&(!search.tel||!search.name)) throw BASIC_EXCEPTION.NOT_ALLOW_AUTH;


    const { curPage, rowPerPage, pagePerBlock } = search;


    const totalRow = await repos.reserve
      .searchQuery(search)
      .getCount();
    if (totalRow === 0) {
      throw BASIC_EXCEPTION.EMPTY_CONTENT;
    }

    const page: PageInfo = new PageInfo({ curPage, rowPerPage, totalRow, pagePerBlock });

    const list = await repos.reserve
      .searchQuery(search)
      .skip(page.startRow)
      .take(page.rowPerPage)
      .getMany();

    return { page, list };
  }

  @TransactionHelper({ paramIndex: 3 })
  async updateReserve(
    origin: ReserveRequest, dto: ReserveRequestDto, auth: Manager,
    transaction: TransactionHelperParam = { connection: this.connection, entityManager: this.connection.manager }
  ): Promise<ReserveRequest> {
    
    if (!origin || !dto ) {
      throw BASIC_EXCEPTION.NOT_ALLOW_EMPTY_ON_PROCESS;
    }

    
    
    const isRoot = isContainRoles(auth, ['root'] as Array<DEFAULT_ROLE>);
    if (!isRoot) {
      throw BASIC_EXCEPTION.NOT_ALLOW_AUTH;
    }

    const repos = getRepositories({
      reserve: ReserveRequestRepository,
    }, transaction.entityManager);

 
      
    const result = await repos.reserve.save(dto);
        
    return result;
  }

}



// type ExcelProps = {
//   id: string;
//   type: string;
//   // name: string;
//   firstname: string;
//   lastname: string;
//   gender: string;
//   birth: string;
//   tel: string;
//   email: string;
//   location: string;
//   city: string;
//   languageOfPreference: string;
//   affiliation: string;
//   // cityOrOrganization: string;
//   organizationName: string;
//   organizationAddress: string;
//   organizationPosition: string;
//   registration: string;
//   visa: string;
//   foodStyle: string;
//   favoriteContentsofKorea: string;
//   otherComments: string;
//   regDate: string;
// }

// type ExcelExpoProps = {
//   id: string;
//   type: string;
//   firstname: string;
//   lastname: string;
//   gender: string;
//   birth: string;
//   tel: string;
//   email: string;
//   location: string;
//   city: string;
//   regDate: string;
//   firstDate: string;
//   secondDate: string;
// }
// class Excel {
  
//   private heads = [
//     'id',
//     'type',                     // 타입
//     'firstname',                // 성
//     'lastname',                 // 이름
//     'gender',                   // 성별
//     'birth',                    // 출생년도
//     'tel',                      // 전화
//     'email',                    // 이메일
//     'location',                 // 국적
//     'city',                     // 도시
//     'languageOfPreference',     // 사용언어
//     'affiliation',              // 구분
//     // 'cityOrOrganization',       // 소속기관. 성명->기관명으로 사용중, 주소, 직위
//     `organizationName`,         // 소속기관명
//     `organizationAddress`,      // 소속기관 주소
//     `organizationPosition`,     //소속기관 직위
//     // 'purpose', //array<string> 참가목적
//     'registration',             // 참가형태
//     'visa',                     // 필요 여부만 나올것 비자
//     'foodStyle',                // 음식
//     'favoriteContentsofKorea',  //array<string> 선호 컨텐츠
//     'otherComments',            // etc  
//     "regDate"                   // 등록일
//   ]

//   private expo_heads = [
//     'id',
//     'type',                     // 타입
//     'firstname',                // 성
//     'lastname',                 // 이름
//     'gender',                   // 성별
//     'birth',                    // 출생년도
//     'tel',                      // 전화
//     'email',                    // 이메일
//     'location',                 // 국적
//     'city',                     // 도시
//     'firstDate',                // 첫번째 참가 일정
//     'secondDate',               // 두번째 참가 일정
//     "regDate"                   // 등록일

//   ]

//   constructor(
//     private reserveService:ReserveRequestService,
//     private supporter: ReserveRequestRepository,
//     private attachmentsSupporter: AttachmentRepository,
    
//   ) {}

//   async getExcelAttachment(type: string, manager: Manager ): Promise<Attachment>{
    

//     const [participation, total] = await Promise.all([
//         this.supporter.searchQuery({local:type})
//         .orderBy('PTP.id', 'DESC')
//         .take(1)
//         .getMany()
//         .then(res => res[0]),

//         this.supporter
//         .searchQuery({local:type})
//         .getCount(),
//       ]);
      
//     if(!participation)
//       throw BASIC_EXCEPTION.EMPTY_CONTENT;
    
    
//     // let attachment: Attachment;
//     // if(!exportExcel || exportExcel.total !== total || exportExcel.participationId !== participation.id){
//       const data: Array<ExcelProps|ExcelExpoProps> = await this.reserveService
//         .repeat<ExcelExpoProps|ExcelProps>(
//           type, 
//           type === 'EXPO' ? participationToExcelExpoRow : participationToExcelRow
//         );
//       const wb: XLSX.WorkBook = XLSX.utils.book_new();
//       wb.SheetNames.push('participations');
//       wb.Sheets.participations = XLSX.utils.sheet_add_json(wb.Sheets.participations, data, {
//           header: type === 'EXPO' ? this.expo_heads : this.heads, 
//         })

//       if(!exportExcel){
//         const attachment = await this.writeFile(type, wb);
//         await this.supporter.exportExcels.save({
//           type,
//           participationId: participation.id,
//           attachmentId: attachment.id,
//           total
//         })
  
//         return attachment;
//       }else {
//         const existAttc = await this.attachmentsSupporter.findOne(exportExcel.attachmentId);
//         const attachment = await this.writeFile(type, wb, existAttc);
//         await this.supporter.exportExcels.save({
//           id: exportExcel.id,
//           participationId: participation.id,
//           attachmentId: attachment.id,
//           total: total,
//         })
//       }
//     // }
    
//     const resultAttachment = await this.attachmentsSupporter.findOne(exportExcel.attachmentId);
//     if(resultAttachment.state === 'UPLOADING')
//       throw BASIC_EXCEPTION.UPLOADING_ATTACHMENT;

//     return resultAttachment;
//   }

//   async writeFile(type: string, workbook: XLSX.WorkBook, exist?: Attachment): Promise<Attachment> {
    
//     const pathSub: string = exist?.pathSub || `${dayjs().format('YYYY/MM/DD')}/xlsx`
//     const pathRoot: string = exist?.pathRoot || process.env.PATH_EXT_STORAGE;
//     const directPath: string = `${pathRoot}/${pathSub}`;
//     const id: string = exist?.id || createUuid({prefix: dayjs().format("YYYYMMDDHHmmss"), length: 32})
//     if(exist)
//       await this.attachmentsSupporter.save({id, state: 'UPLOADING'});
//     else
//       await this.attachmentsSupporter.save({
//         id,
//         state: 'UPLOADING',
//         mimeType: 'temp',
//         pathRoot,
//         pathSub: `${pathSub}`,
//         originName: `${type === 'EXPO' ? 'Expoes' : 'Participations'}.xlsx`,
//         storeName: `${id}`,
//         extension: 'xlsx',
//         size: 0
//       });
    

//     try {
//       if( !fs.existsSync(directPath) )
//         fs.mkdirSync(directPath, {recursive: true})

//       await XLSX.writeFile(workbook, `${directPath}/${id}`)

//       const buffer = fs.readFileSync(`${directPath}/${id}`)
//       await this.attachmentsSupporter.save({
//         id, state: 'UPLOADED',
//         mimeType: exist ? undefined : (await FileType.fromBuffer(buffer)).mime,
//         size: buffer.length
//       })
//     } catch (error) {
//       await this.attachmentsSupporter.save({
//           id, state: 'ERROR'
//         });

//       console.error(error);
//       throw BASIC_EXCEPTION.INVALID_FILE;
//     }

//     return this.attachmentsSupporter.findOne(id);
//   }
// }