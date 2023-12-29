import { TABLE_ALIAS, UK_PREFIX } from "src/config/typeorm.config";
import { Artwork, ArtworkDto, ArtworkReq } from "src/entity/artwork/artwork.entity";
import { ArtworkKeyword, ArtworkKeywordDto } from "src/entity/artwork/artworkKeyword.entity";
import { Keyword } from "src/entity/comm/keyword.entity";
import { Consulting, ConsultingDto, ConsultingReq } from "src/entity/consulting/consulting.entity";
import { Manager, ManagerDto, ManagerReq } from "src/entity/member/manager.entity";
import { Member } from "src/entity/member/member.interface";
import { Menu, MenuDto, MenuReq } from "src/entity/menu/menu.entity";
import { MenuMethodDto } from "src/entity/menu/menuMethod.entity";
import { Role } from "src/entity/role/role.entity";
import { MenuRepository } from "src/repository/menu/menu.repository";
import { AttachmentsService } from "src/service/attachments.service";
import { KeywordsService } from "src/service/keywords.service";
import { createUuid, equalsIgnoreCase, isUndeclared, maxText, NUMBER_FORM, parseTel, YYYYMMDDHHmmss } from "./format.util";
import { deepSelectFlatMap, entriesTypeGuard, filterVariable, getPick, isContains, otherDelete, propertiesForEach, splitToObject } from "./index.util";
import { getRepositories, PathString, TransactionHelperParam } from "./typeorm.util";
import * as dayjs from 'dayjs';
import { User, UserDto, UserReq } from "src/entity/member/user.entity";
import { MemberBasicDto } from "src/entity/member/memberBasic.entity";

import { MemberSns } from "src/entity/member/memberSns.entity";
import { Note, NoteDto, NoteReq } from "src/entity/note/note.entity";
import { KeywordLabel, KeywordLabelDto, KeywordLabelReq } from "src/entity/comm/keywordLabel.entity";
import { EntityManager } from "typeorm";
import { UserRepository } from "src/repository/member/user.repository";
import { ManagerRepository } from "src/repository/member/manager.repository";

import { Reply, ReplyDto, ReplyReq } from "src/entity/reply/reply.entity";
import { ArtworkRangeDto } from "src/entity/artwork/artworkRange.entity";
import { Notification, NotificationDto, NotificationReq } from "src/entity/notification/notification.entity";
import { getTemplateData } from "./notification.util";
import { NoteRepository } from "src/repository/note/note.repository";
import { oneWayEnc } from "./secret.util";
import { ConsultingRepository } from "src/repository/consulting/consulting.repository";
import { ReplyRepository } from "src/repository/reply/reply.repository";
import { Range } from "src/type/index.type";
import { StoreDto } from "src/entity/member/store.entity";
// export const MAX_PASSWORD = 512;
// export const MAX_IDENTITY = 128;
export const ENTITY_CONSTANTS = {
  AUTH: 'AUTH',
} as const;
export const USER_FULL_DETAIL = ['roles', 'basic', 'sns'] as Array<PathString<User>>
export const MANAGER_FULL_DETAIL = ['roles', 'basic', 'sns'] as Array<PathString<Manager>>
export const AUTH_RELATIONS = ['roles'] as Array<keyof Member>;
export const AUTH_RELATION_PATH = ['roles', 'store'] as Array<PathString<Member>>;


export const ARTWORK_FULL_DETAIL = ['menu', 'manager', 'attachments', 'properties', 'i18ns'] as Array<PathString<Artwork>>

export const MEMBER_STATE = {
  WAITING_REMOVE: -2,
  HIDDEN: -1,
  PREPARATION: 0,
  NORMAL: 1
};
export const COMM_STATE = {
  HIDDEN: -1,
  PREPARATION: 0,
  NORMAL: 1
};
export type NotificationMedia = 'KAKAO' | 'SMS' | 'EMAIL';
export type NotificationMethod = 'BIZM-AT' | 'BIZM-AI' | 'BIZM-FT' | 'BIZM-FI' | 'BIZM-FW'
  | 'BIZM-S' | 'BIZM-L'
  | 'SYSTEM' | 'KAKAO-FRN';
export const NotificationState = {
  REJECT: -2,
  FAIL: -1,
  PREPARATION: 0,
  REQUEST: 1,
  SENDING: 2,
  SENDED: 3,
}
export const TourState = {
  CANCEL: -1,
  APPLICATION: 0,
  CHECKING: 1,
  CONFIRMED: 2,
  COMPLETE: 3
}

export const CommState = {
  HIDDEN: -1,
  PREPARING: 0,
  DEFAULT: 1,
  SOLD_OUT: 2
} as const;
export const ProductDeliveryType = {
  BIND: 'BIND',
  EACH: 'EACH'
} as const;
export const OrderDeliveryHistoryType = {
  TO_BUYER: 'TO_BUYER',
  TO_SELLER: 'TO_SELLER'
} as const;

export const NOT_INPUT = '미입력' as const;
export const NOT_SELECT = '미선택' as const;

export type PaymentStatus = 'ready' | 'paid' | 'failed' | 'cancelled' | 'illegal';
export const PaymentStateRecord: Record<PaymentStatus, number> = {
  ready: 1,
  paid: 2,
  illegal: -3,
  failed: -2,
  cancelled: -1
} as const

export const TYPE_ORDER_BUYER = 'BUYER',
  TYPE_ORDER_SELLER = 'SELLER';

// export type OrderStatus = 'REFUNDED'|'CANCEL'|'REQUEST_ORDER'|'ALLOW_ORDER'|'WAITING_PAYMENT'|'PAID'|'PREPARING_DELIVERY'|'DELIVERING'|'DELIVERED'|'REFUND'|'REFUNDING'|'CONFIRM';
export type OrderStatus = 'REJECT' | 'REFUNDED' | 'CANCEL' | 'REQUEST_ORDER' | 'ALLOW_ORDER' | 'WAITING_PAYMENT' | 'PAID' | 'REFUND' | 'REFUNDING' | 'CONFIRM';
// export const OrderVisibleStates = [-2, -1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9] as const;
export const OrderVisibleStates = [-3, -2, -1, 0, 1, 2, 3, 4, 5, 6] as const;
// export const OrderStateRecord: Record<OrderStatus, number> = {
//   REFUNDED: -2,
//   CANCEL: -1,
//   REQUEST_ORDER: 0,
//   ALLOW_ORDER: 1,
//   WAITING_PAYMENT: 2,
//   PAID: 3,
//   PREPARING_DELIVERY: 4,
//   DELIVERING: 5,
//   DELIVERED: 6,
//   REFUND: 7,
//   REFUNDING: 8,
//   CONFIRM: 9
// } as const;
export const OrderStateRecord: Record<OrderStatus, number> = {
  REJECT: -3,
  REFUNDED: -2,
  CANCEL: -1,
  REQUEST_ORDER: 0,
  ALLOW_ORDER: 1,
  WAITING_PAYMENT: 2,
  PAID: 3,
  // PREPARING_DELIVERY: 4,
  // DELIVERING: 5,
  // DELIVERED: 6,
  // REFUND: 7,
  // REFUNDING: 8,
  // CONFIRM: 9
  REFUND: 4,
  REFUNDING: 5,
  CONFIRM: 6
} as const;


export type OrderCommission = 'lesson' | 'group' | 'seminar' | 'etc' | 'p' | 'mp' | 'mf' | 'f' | 'ff';
export const OrderCommissionRecord: Record<OrderCommission, number> = {
  lesson: 1000,
  group: 2000,
  seminar: 3000,
  etc: 4000,
  //[ 0: 피아노(p), 1: 메조피아노(mp), 2: 메조포르테(mf), 3: 포르테(f), 4: 포르티시모(ff) ] => 등급별 수수료 책정용
  // 아래는 수수료 n%에서 n을 정하면 됨.(등급에 따른 적용 가능)
  p: 9,
  mp: 9,
  mf: 9,
  f: 9,
  ff: 9
}


type DeliveryInfo = {
  type: keyof typeof ProductDeliveryType | 'FREE';
  price: number;
}
type TotalOrderInfo = {
  productPrice: number;
  deliveryPrice: number;
  historiesLength: number;
  title: string;
}

export type SnsAuth = 'KAKAO' | 'GOOGLE' | 'APPLE' | 'NAVER' | 'FACEBOOK';
export type SignInWithIdpDto = {
  idToken?: string;
  accessToken?: string;
  isAdmin?: string;
}

export const isSameAuth = (auth_1: { type: string, uk: string }, auth_2: { type: string, uk: string }): boolean => {
  if (!auth_1 || !auth_2)
    return false;

  // getPick(auth_2, ['id', 'nickname', 'id'])
  return isContains(auth_1, getPick(auth_2, ['type', 'uk']));
}

export const longToDate = (longValue: number): Date => {
  if (isUndeclared(longValue)) {
    if (longValue === undefined || longValue === null)
      return longValue as (undefined | null);
    else
      return null;
  }
  else
    return dayjs(longValue).toDate();
}

type CompareOptions = {
  compare?: 'or' | 'and',
  require?: boolean
}
export const isContainRoles = (
  containRoles: { roles?: Array<Role> }, compares: Array<string | Role>,
  { compare = 'or', require = false }: CompareOptions = {}
): boolean => {

  if (!containRoles || !containRoles.roles || containRoles.roles.length === 0)
    return false;

  if (!compares || compares.length === 0)
    return !require;

  const { roles } = containRoles;
  if (compare === 'and')
    return !compares.some(compKey =>
      !roles.some(targetRole => equalsIgnoreCase(
        targetRole.key,
        typeof compKey === 'string' ? compKey : compKey.key
      ))
    )
  else
    return roles.some(targetRole =>
      compares.some(compKey => equalsIgnoreCase(
        targetRole.key,
        typeof compKey === 'string' ? compKey : compKey.key
      ))
    )
}

export const rangeStringToRangeNumber = (rangeString: string): Range<number> => {
  if (!rangeString)
    return undefined;

  const { start, end } = splitToObject(rangeString, ['start', 'end'], {
    separator: ',',
    limit: [[NUMBER_FORM], [NUMBER_FORM]]
  })
  // console.log(start, end)
  if (!start && !end)
    return undefined;
  else
    return {
      start: !isUndeclared(start) ? Number(start) : undefined,
      end: !isUndeclared(end) ? Number(end) : undefined,
    }
}
export const rangeStringToRangeDate = (rangeString: string): Range<Date> => {
  const rangeNumber = rangeStringToRangeNumber(rangeString);
  if (!rangeNumber)
    return undefined;


  const { start, end } = rangeNumber;

  return {
    start: !isUndeclared(start) ? dayjs(start).toDate() : undefined,
    end: !isUndeclared(end) ? dayjs(end).toDate() : undefined,
  }

}

export const entityOtherDelete = <T>(
  entityOrEntities: T | Array<T>, keys: Array<PathString<T>>
) => {
  const ROOT_NAME = '__ROOT__';
  const parent_FieldNames = keys.map(ks => ks.split('.').filter(k => k))
    .filter(kParts => kParts.length > 0)
    .reduce((rst, kParts) => {
      const parent: string = kParts.length === 1 ? ROOT_NAME : kParts.slice(0, kParts.length - 1).join('.');
      const fieldName: string = kParts.length === 1 ? kParts[0] : kParts[kParts.length - 1];
      const fields = rst[parent] || [];
      if (!rst[parent])
        rst[parent] = fields;

      if (!fields.includes(fieldName))
        fields.push(fieldName);
      return rst;
    }, { [ROOT_NAME]: [] } as Record<string, Array<string>>);

  entriesTypeGuard(parent_FieldNames).forEach(([k]) => {
    if (k === ROOT_NAME)
      return;
    const parentAbsoluteKey = k.split('.');
    if (parentAbsoluteKey.length === 1) {
      const fields = parent_FieldNames[ROOT_NAME];
      if (!fields.includes(k))
        fields.push(k)
    } else {
      const beforeAbsoluteKey = parentAbsoluteKey.slice(0, parentAbsoluteKey.length - 1).join('.');
      const fieldName = parentAbsoluteKey[parentAbsoluteKey.length - 1];
      const fields = parent_FieldNames[beforeAbsoluteKey] || [];
      if (parent_FieldNames[beforeAbsoluteKey])
        parent_FieldNames[beforeAbsoluteKey] = fields;
      if (!fields.includes(fieldName))
        fields.push(fieldName);
    }
  })

  // console.log(parent_FieldNames);

  entriesTypeGuard(parent_FieldNames).forEach(([wrapperAbstractKey, fields]) => {
    if (wrapperAbstractKey === ROOT_NAME) {
      if (Array.isArray(entityOrEntities))
        entityOrEntities.forEach(entity => otherDelete(entity, fields as any))
      else
        otherDelete(entityOrEntities, fields as any)

    }
    else {
      if (Array.isArray(entityOrEntities))
        entityOrEntities.forEach(entity => {
          deepSelectFlatMap(entity, wrapperAbstractKey as any, ({ field }) => {
            otherDelete(field, fields as any)
          })
        })
      else
        deepSelectFlatMap(entityOrEntities, wrapperAbstractKey as any, ({ field }) => {
          otherDelete(field, fields as any)
        })
    }
  })
  // propertiesForEach(entity, (key, value, wrap) => {
  //   console.log(`${key}`, typeof value === 'object' ? '[OBJECT]' : value)
  // })

  // console.log(keyParts, entity);
}


type ArtworkUtilOption = {
  origin?: Artwork;
  menuRepository?: MenuRepository;
  // attachmentRepository?: AttachmentRepository;
  attachmentsService?: AttachmentsService,
  keywordsService?: KeywordsService;
  transaction?: TransactionHelperParam;
  lang?: string;
}

export const artworkUtil = {
  reqToDto: async (
    req: ArtworkReq, auth: Manager,
    {
      origin, menuRepository, attachmentsService, keywordsService, transaction,
      lang = process.env.DEFAULT_LANG
    }: ArtworkUtilOption = {}
  ): Promise<ArtworkDto> => {
    const promises: Array<Promise<any>> = []
    const {
      i18ns: orgI18ns = [],
      menu: orgMenu,
      // labels: orgLabels = []
      ranges: orgRanges = []
    } = origin || {}
    const {
      i18ns, title, content, attachments, menu,
      properties, keywords, i18nKeywords, labels, ranges,
      ...other
    } = req;

    const dto: ArtworkDto = { ...other };
    if (origin) {
      dto.id = origin?.id;
    } else {
      dto.manager = auth;
      dto.writer = auth.nickname;
      dto.uk = createUuid({ prefix: `${UK_PREFIX.ARTWORK}-${dayjs().format(YYYYMMDDHHmmss)}`, length: 24 })
    }

    if (menu && menu !== orgMenu?.absoluteKey)
      promises.push(
        menuRepository?.getOne(
          ['functions', 'methods', 'properties'],
          ctx => ctx.searchQuery({ absoluteKey: menu || 'NULL' })
        ).then(m => dto.menu = m)
      )

    if (attachments) {
      if (attachments.length === 0 && origin)
        dto.attachments = [];
      else if (attachments.length > 0)
        promises.push(
          attachmentsService?.getAttachmentsAndSort(attachments)
            .then(res => dto.attachments = res)
        )
    }

    dto.i18ns = i18ns
      ? entriesTypeGuard(i18ns)
        .map(([i18nKey, iVal]) => {
          // const orgI18n: ArtworkI18n = orgI18ns.find( ({id: orgI18nId}) => orgI18nId === iVal.id)
          return {
            // artworkId: origin?.id,
            // artwork: origin,
            i18n: i18nKey,
            title: iVal.title,
            content: iVal.content
          }
        })
      : undefined;
    if (!i18ns && (title || content)) {
      dto.i18ns = orgI18ns.map(i1 => ({ ...i1 }));
      const find = dto.i18ns.find(({ i18n: orgI18n }) => equalsIgnoreCase(orgI18n, lang))
      if (find) {
        find.title = title;
        find.content = content;
        // find.artwork = origin;
        // find.artworkId = origin?.id
      } else
        dto.i18ns.push({ i18n: lang, title, content })
    }

    dto.properties = properties
      ? entriesTypeGuard(properties)
        .map(([pKey, pVal]) => {
          return {
            // artworkId: origin?.id,
            key: pKey,
            val: pVal
          }
        }).filter(({ val }) => !isUndeclared(val))
      : undefined;

    if (i18nKeywords || keywords)
      promises.push(
        setI18nKeywordsToDto(dto, req, { origin, keywordsService, transaction, lang })
      )

    if (labels) {
      if (labels.length === 0)
        dto.labels = [];
      else
        promises.push(
          keywordsService.getOrCreateKeywordLabels(labels, auth, transaction)
            .then(
              savedLabels => dto.labels = savedLabels.map((kwdLbe, i) => ({
                // artworkId: dto.id,
                keywordLabelId: kwdLbe.id,
                keywordLabel: kwdLbe,
                // artwork: dto,
                ord: i + 1,
              }))
            )
        )
    }

    if (ranges) {
      if (ranges.length === 0)
        dto.ranges = [];
      else
        dto.ranges = ranges.reduce((rst, reqRng) => {
          if (isUndeclared(reqRng.startDate) && isUndeclared(reqRng.endDate))
            return rst;

          const find = orgRanges.find(orgRng => orgRng.id === reqRng.id);
          rst.push({
            id: find?.id,
            startDate: longToDate(reqRng.startDate),
            endDate: longToDate(reqRng.endDate)
          })

          return rst;
        }, [] as Array<ArtworkRangeDto>)
    }



    // if( keywords ){
    //   if( keywords.length === 0 && origin )
    //     dto.keywords = [];
    //   else
    //     promises.push(
    //       keywordsService.getOrCreateKeyword(keywords)
    //       .then( kwds => dto.keywords = kwds )
    //     ) 
    // }
    await Promise.all(promises)
    return dto;
  }
}

// type ContainsLabelDtos = {
//   labels?: Array<KeywordLabelDto>;
// }
// type ContainsLabelReqs = {
//   labels?: Array<KeywordLabelReq>;
// }
// type KeywordLabelsUtilOptions = {
//   origin?: { labels?: Array<KeywordLabel>; },
//   keywordsService?: KeywordsService
// }
// const setKeywordLabelsToDto = async (
//   dto: ContainsLabelDtos, req:ContainsLabelReqs, 
//   { origin, keywordsService }: KeywordLabelsUtilOptions = {}
// ): Promise<Array<KeywordLabelDto>> => {

//   const {
//     labels: orgLabels = []
//   } = origin || {};
//   const {

//   } = req;

// }

const setI18nKeywordsToDto = async (
  dto: ArtworkDto, req: ArtworkReq, { origin, keywordsService, lang, transaction }: ArtworkUtilOption = {}
): Promise<Array<ArtworkKeywordDto>> => {
  const {
    i18nKeywords: orgI18nKeywords = []
  } = origin || {}
  const {
    keywords, i18nKeywords
  } = req
  if (!keywordsService)
    return;

  if (i18nKeywords) {
    const entries = entriesTypeGuard(i18nKeywords);
    if (entries.length === 0 && origin)
      dto.i18nKeywords = [];
    else if (entries.length > 0) {
      const allKeywords: Array<Keyword> = await keywordsService.getOrCreateKeyword(
        entries.reduce((arr, [, val]) => {
          val.forEach(kwd => {
            if (!arr.includes(kwd))
              arr.push(kwd)
          })
          return arr;
        }, []),
        transaction
      );

      const artKwdDtos = entries.reduce((arr, [key, val]) => {
        val.forEach((kwd, i) => {
          const keywordEntity = allKeywords.find(({ keyword }) => kwd === keyword);
          if (keywordEntity && !arr.find(({ i18n, keyword }) => i18n === key && keyword.keyword === kwd)) {
            const find = orgI18nKeywords.find(({ i18n, keywordId }) => i18n === key && keywordId === keywordEntity.id)
            arr.push({
              ...(
                find
                  ? { id: find.id }
                  : { i18n: key, keyword: keywordEntity }
              ),
              ord: i + 1
            })
          }
        })
        return arr;
      }, [] as Array<ArtworkKeywordDto>)
      dto.i18nKeywords = artKwdDtos;
    }
  } else if (!i18nKeywords && keywords) {
    if (keywords.length === 0 && origin)
      dto.i18nKeywords = orgI18nKeywords?.filter(({ i18n }) => i18n !== lang)
    else if (keywords.length > 0) {
      const { sameI18n, remain } = orgI18nKeywords?.reduce((rst, artKwd) => {
        (
          artKwd.i18n === lang
            ? rst.sameI18n
            : rst.remain
        ).push(artKwd);
        // if( artKwd.i18n === lang )  rst.sameI18n.push(artKwd);
        // else                        rst.remain.push(artKwd);
        return rst;
      }, { sameI18n: [] as Array<ArtworkKeyword>, remain: [] as Array<ArtworkKeyword> }) || { sameI18n: [] as Array<ArtworkKeyword>, remain: [] as Array<ArtworkKeyword> };
      const keywordEntities = await keywordsService.getOrCreateKeyword(keywords, transaction);
      const update = keywordEntities.reduce((arr, kwdEntity, i) => {
        const find = sameI18n.find(({ keywordId }) => keywordId === kwdEntity.id);

        arr.push({
          ...(
            find
              ? { id: find.id }
              : { i18n: lang, keyword: kwdEntity }
          ),
          ord: i + 1
        })

        return arr;
      }, [] as Array<ArtworkKeywordDto>)

      dto.i18nKeywords = [...update, ...remain];
    }
  }
  // const artworkKeywords: Array<ArtworkKeywordDto> = [];


  return null;
  // return artworkKeywords;
}

type UserUtilOption = {
  origin?: User;
  dataBaseRoles?: Array<Role>;
  attachmentsService?: AttachmentsService;
  transaction?: TransactionHelperParam;
}
export const userUtil = {
  reqToDto: async (
    req: UserReq,
    { origin, dataBaseRoles, attachmentsService }: UserUtilOption = {}
  ): Promise<UserDto> => {
    const { store,
      roles, upt_date, reg_date, basic,
      ...other
    } = req;

    const dto: UserDto = { ...other };
    dto.id = origin?.id;

    dto.roles = roles
      ? dataBaseRoles?.filter(({ key: dbRoleKey }) => roles.some(reqKey => equalsIgnoreCase(reqKey, dbRoleKey)))
        .sort(({ id: aId }, { id: bId }) => aId - bId)
      : undefined;

    await Promise.all([
      setMemberBasicToDto(dto, req, { origin, attachmentsService }),
      setStoreToDto(dto, req, { origin, attachmentsService })
    ])

    return dto;
  }
}


type ManagerUtilOption = {
  origin?: Manager;
  dataBaseRoles?: Array<Role>;
  attachmentsService?: AttachmentsService;
  bypass?: boolean;
  transaction?: TransactionHelperParam;
}
export const managerUtil = {
  reqToDto: async (
    req: ManagerReq,
    { origin, dataBaseRoles, attachmentsService, transaction }: ManagerUtilOption = {}
  ): Promise<ManagerDto> => {
    const { store,
      roles, upt_date, reg_date, basic, ...other
    } = req;

    const dto: ManagerDto = { ...other };
    dto.id = origin?.id;

    dto.roles = roles
      ? dataBaseRoles?.filter(({ key: dbRoleKey }) => roles.some(reqKey => equalsIgnoreCase(reqKey, dbRoleKey)))
        .sort(({ id: aId }, { id: bId }) => aId - bId)
      : undefined;




    await Promise.all([
      setMemberBasicToDto(dto, req, { origin, attachmentsService }),
      // setStoreToDto(dto, req, { origin })

    ])

    return dto;
  }
}

type SetMemberBasicToDtoOption = {
  attachmentsService?: AttachmentsService,
  origin?: User | Manager,
}

const setMemberBasicToDto = async (
  dto: UserDto | ManagerDto, req: ManagerReq,
  { origin, attachmentsService }: SetMemberBasicToDtoOption = {}
) => {
  if (!req.basic)
    return;

  const {
    attachmentProfile: attachmentProfile,
    birth, upt_date, reg_date,
    ...other
  } = req.basic;

  const basicDto: MemberBasicDto = { ...other };
  if (origin?.basic)
    basicDto.id = origin.basic.id;


  const attachmentIds: Array<string> = [];

  if (attachmentProfile)
    attachmentIds.push(attachmentProfile);

  const attachments = attachmentsService && attachmentIds.length > 0
    ? await attachmentsService.getAttachmentsAndSort(attachmentIds)
    : [];

  basicDto.attachmentProfile = attachmentProfile === null
    ? null
    : attachments.find(({ id }) => id === attachmentProfile);
  if (!isUndeclared(birth)) {
    const djs = dayjs(birth);
    basicDto.year = djs.get('year');
    basicDto.birth = djs.toDate();
  }
  // if(!origin && !bypass) {
  //   const iamportCertificate = await iamportService.getCertificate(basicDto.tel);
  //   if(isUndeclared(birth)) {
  //     const djs = dayjs(iamportCertificate.birth * 1000);
  //     basicDto.year = djs.get('year');
  //     basicDto.birth = djs.toDate();
  //   }
  //   basicDto.connectingInfo = oneWayEnc(iamportCertificate.unique_key);
  // }

  dto.basic = basicDto;
}




type SetStoreToDtoOption = {
  origin?: User
  attachmentsService?: AttachmentsService,

}
const setStoreToDto = async (
  dto: UserDto, req: UserReq,
  { origin, attachmentsService }: SetStoreToDtoOption = {}
) => {
  if (!req.store)
    return;

  const { storeMemo, attachment, applyDate, regDate,
    ...other
  } = req.store;

  const storeDto: StoreDto = { ...other }
  if (storeMemo && storeMemo.length >= 0) {

    storeDto.storeMemo = storeMemo.map(s => {
      return { id: s.id, type: s.type, value: s.value }
    })
  }
  else if (origin && origin.store?.storeMemo) {
    storeDto.storeMemo = origin.store.storeMemo
  }
  if (origin?.store)
    storeDto.id = origin.store.id;

  if (applyDate) storeDto.applyDate = dayjs(applyDate).toDate()

  const attachmentIds: Array<string> = [];

  if (attachment)
    attachmentIds.push(attachment);

  const attachments = attachmentsService && attachmentIds.length > 0
    ? await attachmentsService.getAttachmentsAndSort(attachmentIds)
    : [];

  storeDto.attachment = attachment === null
    ? null
    : attachments.find(({ id }) => id === attachment);

  dto.store = storeDto;
}





type MenuUtilOption = {
  origin?: Menu;
  // parent?: Menu;
  dataBaseRoles?: Array<Role>;
  lang?: string;
}
export const menuUtil = {
  reqToDto: (
    req: MenuReq,
    {
      origin, dataBaseRoles = [],
      lang = process.env.DEFAULT_LANG
    }: MenuUtilOption = {}
  ): MenuDto => {
    const {
      // methods: orgMethods = [],
      // functions: orgFunctions = [],
      i18ns: orgI18ns = [],
      // metadatas: orgMetadatas = [],
    } = origin || {}
    const { methods, i18ns, metadatas, functions, properties, title, ...other } = req;

    const dto: MenuDto = { ...other }
    dto.id = origin?.id;
    // if( methods )
    dto.methods = methods
      ? entriesTypeGuard(methods)
        .reduce((result, [reqKey, reqRoles]) => {
          // const org: MenuMethod = orgMethods.find( ({key: orgKey}) => orgKey === reqKey )
          const roles = dataBaseRoles?.filter(
            ({ key: databaseRoleKey }) =>
              reqRoles?.some(reqRoleKey => equalsIgnoreCase(reqRoleKey, databaseRoleKey))
          )

          result.push({
            menuId: origin?.id,
            key: reqKey,
            roles
          })

          return result;
        }, [] as Array<MenuMethodDto>)
      : undefined;

    dto.functions = functions
      ? entriesTypeGuard(functions)
        .map(([fKey, fVal]) => ({
          menuId: origin?.id,
          key: fKey,
          roles: dataBaseRoles?.filter(
            ({ key: databaseRoleKey }) =>
              fVal?.some(reqRoleKey => equalsIgnoreCase(reqRoleKey, databaseRoleKey))
          )
        }))
      // .reduce( (result, [reqKey, reqRoles]) => {
      //   const roles = dataBasicRoles.filter( 
      //     ({key: databaseRoleKey}) => 
      //       reqRoles?.some( reqRoleKey => reqRoleKey === databaseRoleKey)
      //   )
      //   result.push({
      //     menuId: origin?.id,
      //     key: reqKey,
      //     roles,
      //   })

      //   return result;
      // }, [] as Array<MenuFunctionDto>)
      : undefined;


    dto.i18ns = i18ns
      ? entriesTypeGuard(i18ns)
        .map(([iKey, iVal]) => ({
          menuId: origin?.id,
          i18n: iKey,
          title: iVal
        }))
      : undefined
    if (!i18ns && title) {
      dto.i18ns = orgI18ns.map(i1 => ({ ...i1 }))
      const find = dto.i18ns.find(({ i18n: orgI18n }) => equalsIgnoreCase(orgI18n, lang));
      if (find)
        find.title = title;
      else
        dto.i18ns.push({
          menuId: origin?.id,
          i18n: lang,
          title
        })
    }

    dto.metadatas = metadatas
      ? entriesTypeGuard(metadatas)
        .map(([mKey, mVal]) => ({
          menuId: origin?.id,
          key: mKey,
          val: mVal
        }))
      : undefined;

    dto.properties = properties?.map((pKey) => ({
      menuId: origin?.id,
      key: pKey
    }))

    return dto;
  }
}

export interface ProvidedSnsInfo {
  type: string;
  uk: string;
  name?: string;
  gender?: string;
  nickname?: string;
  email?: string;
  tel?: string;
  imgs: Array<string>;
  accessToken: string;
  created: number;
}
export const getSnsUnique = (
  providedOrSnsEntity: ProvidedSnsInfo | MemberSns
): string => {
  if (!providedOrSnsEntity) return undefined;
  return `${providedOrSnsEntity.type}:${providedOrSnsEntity.uk}`;
}

type ConsultingUtilOption = {
  origin?: Consulting;
  menuRepository?: MenuRepository;
  attachmentsService?: AttachmentsService;
  transaction?: TransactionHelperParam;
}

export const consultingUtil = {
  reqToDto: async (
    req: ConsultingReq,
    {
      origin, menuRepository, attachmentsService, transaction
    }: ConsultingUtilOption = {}
  ): Promise<ConsultingDto> => {
    const promises: Array<Promise<any>> = []
    const {
      menu: orgMenu
    } = origin || {};
    const {
      attachments, menu, properties, relation, receiverManager, ...other
    } = req;

    const dto: ConsultingDto = { ...other };
    dto.id = origin?.id;

    if (menu && menu !== orgMenu?.absoluteKey) {
      promises.push(
        menuRepository?.getOne(
          ['functions', 'methods', 'properties'],
          ctx => ctx.searchQuery({ absoluteKey: menu || 'NULL' })
        ).then(m => dto.menu = m)
      )
    }

    if (attachments) {
      if (attachments.length === 0 && origin) {
        dto.attachments = [];
      } else if (attachments.length > 0) {
        promises.push(
          attachmentsService.getAttachmentsAndSort(attachments)
            .then(res => dto.attachments = res)
        )
      }
    }

    if (relation) {
      if (relation.consulting) {
        const rConsulting = await transaction.connection.manager
          .getCustomRepository(ConsultingRepository)
          .getOne(
            undefined,
            ctx => ctx.searchQuery({ uk: relation.consulting })
          )
        if (rConsulting) {
          dto.relation = {
            consulting: rConsulting,
            reply: null,
          }
        }
      } else if (relation.reply) {
        const rReply = await transaction.connection.manager
          .getCustomRepository(ReplyRepository)
          .getOne(
            undefined,
            ctx => ctx.searchQuery({ uk: relation.reply })
          )
        if (rReply) {
          dto.relation = {
            reply: rReply,
            consulting: null,
          }
        }
      }
    } else {
      dto.relation = origin?.relation || undefined;
    }


    dto.properties = properties
      ? entriesTypeGuard(properties)
        .map(([pKey, pVal]) => {
          return {
            key: pKey,
            val: pVal
          }
        }).filter(({ val }) => !isUndeclared(val))
      : undefined;

    await Promise.all(promises);

    return dto;
  }
}

type NoteUtilOption = {
  origin?: Note;
  keywordsService?: KeywordsService;
  transaction?: TransactionHelperParam;
}
export const noteUtil = {
  reqToDto: async (
    req: NoteReq, auth: Manager,
    {
      origin, keywordsService, transaction
    }: NoteUtilOption = {}
  ): Promise<NoteDto> => {
    const {
      labels, links, start_date, end_date,
      ...other
    } = req;

    const {
      links: orgLinks
    } = origin || {}

    const dto: NoteDto = { ...other };

    if (origin) {
      dto.id = origin.id;
    } else {
      dto.manager = auth;
      dto.uk = createUuid({ prefix: `${UK_PREFIX.NOTE}-${dayjs().format(YYYYMMDDHHmmss)}`, length: 24 });
    }

    dto.existPeriod = false;
    if (start_date || end_date) {
      dto.existPeriod = true;
      if (start_date) {
        dto.start_date = dayjs(start_date).toDate();
      } else if (start_date === null) {
        dto.start_date = null;
      }
      if (end_date) {
        dto.end_date = dayjs(end_date).toDate();
      } else if (end_date === null) {
        dto.end_date = null;
      }
    } else {
      if (start_date === undefined || end_date === undefined) {
        dto.existPeriod = origin.existPeriod;
      }
      if (start_date === null) {
        dto.start_date = null;
      }
      if (end_date === null) {
        dto.end_date = null;
      }
    }

    if (labels) {
      if (labels.length === 0) {
        dto.labels = [];
      } else {
        dto.labels = [];
        const allLabels = await keywordsService.getOrCreateKeywordLabels(labels, auth, transaction);

        for (const [index, label] of allLabels.entries()) {
          dto.labels.push({ keywordLabel: label, ord: index + 1 });
        }
      }
    }

    if (links)
      dto.links = links.filter(
        ({ id }) => !id || orgLinks?.some(orgLink => orgLink.id === id)
      ).map(({ id, title, link }, i) => {
        const find = orgLinks?.find(orgLink => orgLink.id === id);
        return {
          id: find?.id,
          title, link,
          ord: i + 1
        }
      })


    return dto;
  }
}

type KeywordLabelUtilOption = {
  origin?: KeywordLabel;
  keywordsService?: KeywordsService;
  transaction?: TransactionHelperParam;
}
export const keywordLabelUtil = {
  reqToDto: async (
    req: KeywordLabelReq, auth: Manager,
    {
      origin, keywordsService, transaction
    }: KeywordLabelUtilOption = {}
  ): Promise<KeywordLabelDto> => {
    const {
      keyword, ...other
    } = req;

    const dto: KeywordLabelDto = { ...other };

    if (origin) {
      dto.id = origin.id;
    } else {
      dto.manager = auth;
      dto.uk = createUuid({ prefix: `${UK_PREFIX.KEYWORD_LABEL}-${dayjs().format(YYYYMMDDHHmmss)}`, length: 24 });
    }

    if (keyword) {
      dto.keyword = await keywordsService.getOrCreateKeyword(keyword, transaction);
    }

    return dto;
  }
}

type ReplyUtilOption = {
  origin?: Reply;
  attachmentsService?: AttachmentsService;
  entityManager?: EntityManager;
  // lang?: string;
}

export const replyUtil = {
  reqToDto: async (
    req: ReplyReq, auth: User | Manager,
    {
      origin, attachmentsService
    }: ReplyUtilOption = {}
  ): Promise<ReplyDto> => {
    // const {
    //   attachments: orgAttachments
    // } = origin ||{}
    const {
      id, checkPassword, attachments, password, ...other
    } = req;
    const dto: ReplyDto = {
      ...other,
      id: origin?.id,
    }
    if (!origin) {
      dto.uk = createUuid({ prefix: `${UK_PREFIX.REPLY}-${dayjs().format(YYYYMMDDHHmmss)}`, length: 24 });
      if (auth) {
        dto[auth.type.toLowerCase()] = auth;
        // dto.writer = auth.nickname;
        dto.writer = '';
      }
    }

    if (attachments && attachmentsService) {
      if (attachments.length === 0 && origin)
        dto.attachments = [];
      else if (attachments.length > 0)
        dto.attachments = await attachmentsService.getAttachmentsAndSort(attachments)
    }

    if (password) {
      dto.password = oneWayEnc(password, 128);
    }

    return dto;

  }
}

// type NotificationButtonUtilOption = {
//   origin?: NotificationButton;
// }
// export const NotificationButtonUtil = {
//   reqToDto: async (
//     req: NotificationButtonReq,
//     {
//       origin
//     }: NotificationButtonUtilOption = {}
//   ): Promise<NotificationButtonDto> => {
//     const dto = {...req};

//     if(origin) {
//       dto.id = origin?.id;
//     }

//     return dto;
//   }
// }

type NotificationUtilOption = {
  origin?: Notification;
  attachmentsService?: AttachmentsService;
  entityManager?: EntityManager;
}
export const notificationUtil = {
  reqToDto: async (
    req: NotificationReq, auth: Manager,
    {
      origin, attachmentsService, entityManager
    }: NotificationUtilOption = {}
  ): Promise<NotificationDto> => {
    const {
      attachments, reserve_date,
      receiverManager, receiverUser,
      buttons, templateId, templateData, relation, ...other
    } = req;

    const dto: NotificationDto = { ...other };

    if (origin) {
      dto.id = origin?.id
    } else {
      dto.manager = auth;
      dto.uk = createUuid({ prefix: `${UK_PREFIX.NOTIFICATION}-${dayjs().format(YYYYMMDDHHmmss)}`, length: 24 });
    }

    if (attachments) {
      if (attachments.length === 0) {
        dto.attachments = [];
      } else {
        dto.attachments = await attachmentsService?.getAttachmentsAndSort(attachments)
      }
    }

    if (reserve_date) {
      dto.reserve_date = dayjs(reserve_date).toDate();
    }

    if (receiverManager) {
      dto.receiverManager = await entityManager?.getCustomRepository(ManagerRepository)
        .searchQuery({ uk: receiverManager })
        .getOne();
    }

    if (receiverUser) {
      dto.receiverUser = await entityManager?.getCustomRepository(UserRepository)
        .searchQuery({ uk: receiverUser })
        .getOne();
    }

    if (buttons) {
      if (buttons.length === 0) {
        dto.buttons = [];
      } else {
        dto.buttons = buttons;
      }
    }

    if (templateId) {
      dto.templateId = templateId;
      dto.templateData = templateData
      const templateInfo = await getTemplateData(templateId, templateData);
      dto.template = templateInfo.template;
      dto.templateData = templateInfo.data;
    }

    if (relation) {
      if (relation.note) {
        const note = await entityManager.getCustomRepository(NoteRepository)
          .searchQuery({ uk: relation.note })
          .getOne();
        dto.relation = { note };

      } else if (relation.consulting) {
        const consulting = await entityManager.getCustomRepository(ConsultingRepository)
          .searchQuery({ uk: relation.consulting })
          .getOne();
        dto.relation = { consulting };
      } else {
        dto.relation = undefined;
      }
    }

    return dto;
  }
}
