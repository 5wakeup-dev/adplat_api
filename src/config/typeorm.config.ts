import { registerAs } from "@nestjs/config"
import { ArtworkLabel, ArtworkMove, ArtworkView } from "src/entity/artwork/artwork.bridge"
import { Artwork } from "src/entity/artwork/artwork.entity"
import { ArtworkHierarchical } from "src/entity/artwork/artworkHierarchical.entity"
import { ArtworkI18n } from "src/entity/artwork/artworkI18n.entity"
import { ArtworkKeyword } from "src/entity/artwork/artworkKeyword.entity"
import { ArtworkProperty } from "src/entity/artwork/artworkProperty.entity"
import { Attachment } from "src/entity/comm/attachment.entity"
import { Environment } from "src/entity/comm/environment.entity"
import { Keyword } from "src/entity/comm/keyword.entity"
import { KeywordLabel } from "src/entity/comm/keywordLabel.entity"
import { NetAddress } from "src/entity/comm/netAddress.entity"
import { ConsultingView } from "src/entity/consulting/consulting.bridge"
import { Consulting } from "src/entity/consulting/consulting.entity"
import { ConsultingHierarchical } from "src/entity/consulting/consultingHierarchical.entity"
import { ConsultingProperty } from "src/entity/consulting/consultingProperty.entity"
import { ConsultingSave } from "src/entity/consulting/consultingSave.entity"
import { ErrorEntity } from "src/entity/error/error.entity"
import { Manager } from "src/entity/member/manager.entity"
import { MemberBasic } from "src/entity/member/memberBasic.entity"
import { User } from "src/entity/member/user.entity"
import { MemberSns } from "src/entity/member/memberSns.entity"
import { Menu } from "src/entity/menu/menu.entity"
import { MenuFunction } from "src/entity/menu/menuFunction.entity"
import { MenuHierarchical } from "src/entity/menu/menuHierarchical.entity"
import { MenuI18n } from "src/entity/menu/menuI18n.entity"
import { MenuMetadata } from "src/entity/menu/menuMetadata.entity"
import { MenuMethod } from "src/entity/menu/menuMethod.entity"
import { MenuProperty } from "src/entity/menu/menuProperty.entity"
import { NoteLabel } from "src/entity/note/note.bridge"
import { Note } from "src/entity/note/note.entity"
import { NotificationAttachment } from "src/entity/notification/notification.bridge"
import { Notification } from "src/entity/notification/notification.entity"
import { NotificationButton } from "src/entity/notification/notificationButton.entity"
import { NotificationError } from "src/entity/notification/notificationError.entity"
import { NotificationHistory } from "src/entity/notification/notificationHistory.entity"
import { Role } from "src/entity/role/role.entity"
import { ConnectionOptions } from "typeorm"
import { AnythingEntity } from "src/entity/anything/anything.entity"
import { ManagerHistory } from "src/entity/member/managerHistories.entity"
import { UserHistory } from "src/entity/member/userHistory.entity"
import { NoteLink } from "src/entity/note/noteLink.entity"
import { Reply } from "src/entity/reply/reply.entity"
import { ReplyHierarchical } from "src/entity/reply/replyHierarchical.entity"
import { ArtworkRange } from "src/entity/artwork/artworkRange.entity"
import { NotificationRelation } from "src/entity/notification/notificationRelation.entity"
import { ConsultingRelation } from "src/entity/consulting/consultingRelation.entity"
import { ArtworkRegion } from "src/entity/artwork/artworkRegion.entity"

import { BlockMember } from "src/entity/blockMember/blockMember.entity"

import { MemberDeviceToken } from "src/entity/member/memberDeviceToken.entity"
import { ReserveRequest } from "src/entity/reserve/reserveRequest.entity"
import { Store } from "src/entity/member/store.entity"
import { StoreMemo } from "src/entity/member/storeMemo.entity"
import { PositivePoint } from "src/entity/point/positivePoint.entity"
import { NegativeHistory } from "src/entity/point/negativeHistory.entity"
import { NegativePoint } from "src/entity/point/negativePoint.entity"
import { PositivePointRelation } from "src/entity/point/positivePointRelation.entity"
import { NegativePointRelation } from "src/entity/point/negativePointRelation.entity"
import { Product, ProductMove, ProductView } from "src/entity/product/product.entity"
import { ProductTheme } from "src/entity/product/productTheme.entity"
import { VisitorCount } from 'src/entity/analytics/visitorCount.entity'
import { MailHistory } from "src/entity/mail/mailHistory.entity"
export const commEntitts = [
  ErrorEntity,
  Environment,
  Attachment,
  NetAddress,
  Keyword, KeywordLabel
]
export const roleEntities = [
  Role
] as const
export const menuEntities = [
  Menu, MenuHierarchical,
  MenuMethod, MenuFunction, MenuI18n,
  MenuMetadata, MenuProperty,
  // Menu, MenuFunction, MenuHierarchical
] as const

export const notificationEntities = [
  Notification, NotificationError, NotificationButton, NotificationHistory,
  NotificationAttachment, NotificationRelation
] as const

export const memberEntities = [
  Manager, ManagerHistory,
  User, UserHistory,
  MemberBasic, MemberSns, MemberDeviceToken,
  Store, StoreMemo
] as const;

export const artworkEntities = [
  Artwork, ArtworkHierarchical, ArtworkI18n,
  ArtworkProperty, ArtworkView, ArtworkKeyword, ArtworkLabel,
  ArtworkRange, ArtworkRegion, ArtworkMove
]

export const consultingEntities = [
  Consulting, ConsultingHierarchical,
  ConsultingProperty, ConsultingView, ConsultingSave, ConsultingRelation
]

export const replyEntities = [
  Reply, ReplyHierarchical
]

export const noteEntities = [
  Note, NoteLabel, NoteLink
]

export const anythingEntities = [
  AnythingEntity
]

export const BlockMemberEntities = [
  BlockMember
]

export const ReserveRequestEntities = [
  ReserveRequest
]

export const PointsEntities = [
  PositivePoint, NegativeHistory, NegativePoint, PositivePointRelation, NegativePointRelation
]

export const ProductsEntities = [
  Product, ProductTheme, ProductMove, ProductView,MailHistory
]

export const AnaylticsEntities = [
  VisitorCount
]
  


export const entities = [
  ...commEntitts,
  ...notificationEntities,
  ...roleEntities,
  ...AnaylticsEntities,
  ...menuEntities,
  ...memberEntities,
  ...artworkEntities,
  ...consultingEntities,
  ...replyEntities,
  ...noteEntities,
  ...anythingEntities,
  ...BlockMemberEntities,
  ...ReserveRequestEntities,
  ...PointsEntities,
  ...ProductsEntities,
]
export const connectionOptions = registerAs('typeorm', (): ConnectionOptions => {
  // console.log(process.env.MYSQL_USER, process.env.MYSQL_PASSWORD, process.env.MYSQL_DATABASE)
  return {
    // name: 'main',
    type: "mysql",
    host: process.env.MYSQL_HOST,
    port: parseInt(process.env.MYSQL_PORT, 10) || 3306,
    username: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
    charset: "utf8mb4",
    // entities: ["dist/**/*.entity{.ts,.js}"],
    entities,
    // subscribers: [ManagerSubscriber, UserSubscriber, ArtworkI18nSubscriber, ExternalBuyerSubscriber, ConsultingSubscriber, ReplySubscriber],
    synchronize: false,
    logging: process.env.NODE_ENV !== 'prod',
    // logging: true,
    bigNumberStrings: true
  }
})


const entitiesAsSub = [
  ...commEntitts, ...roleEntities, ...memberEntities
]
export const connectionOptionsAsSub = registerAs('typeorm', (): ConnectionOptions => {
  // console.log(process.env.MYSQL_USER, process.env.MYSQL_PASSWORD, process.env.MYSQL_DATABASE)
  return {
    // name: 'sub',
    type: "mysql",
    host: process.env.MYSQL_HOST,
    port: parseInt(process.env.MYSQL_PORT, 10) || 3306,
    username: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
    // entities: ["dist/**/*.entity{.ts,.js}"],
    entities: entitiesAsSub,
    // subscribers: [ManagerSubscriber, UserSubscriber, ArtworkI18nSubscriber, ExternalBuyerSubscriber, ConsultingSubscriber, ReplySubscriber],
    synchronize: false,
    logging: process.env.NODE_ENV !== 'prod',
    bigNumberStrings: true
  }
})

export const TABLE_ALIAS = {
  ATTACHMENTS: 'ATT',
  KEYWORDS: 'KWD',
  KEYWORD_LABELS: 'KWD_LBL',
  ROLES: 'ROL',
  ENVIRONMENTS: 'ENV',

  NOTIFICATIONS: 'NTF',
  NOTIFICATION_ERRORS: 'NTF_ERR',
  NOTIFICATION_BUTTONS: 'NTF_BTN',
  NOTIFICATION_HISTORIES: 'NTF_HIS',
  NOTIFICATION_ATTACHMENT: 'NTF_ATC',
  MAIL:"MAIL",
  MENUS: 'MNU',
  MENU_METHODS: 'MNU_MTD',
  MENU_METHOD_ROLES: 'MNU_MTD_ROL',
  MENU_FUNCTIONS: 'MNU_FTC',
  MENU_FUNCTION_ROLES: 'MNU_FTC_ROL',
  MENU_PROPERTIES: 'MNU_PRP',
  MENU_METADATAS: 'MNU_MED',
  MENU_I18NS: 'MNU_I1N',
  MENU_HIERARCHICAL: 'MNU_HRC',

  MANAGERS: 'MNG',
  MANAGER_STORES: 'MNG_STO',
  MANAGER_HISTORIES: 'MNG_HUS',
  USERS: 'USR',
  USER_HISTORIES: 'USR_HUS',
  MEMBER_SNS: 'MEM_SNS',
  MEMBER_BASICS: 'MEM_BSC',
  MANAGER_STORE_ADDITIONS: 'MNG_STO_ADD',
  SPOT_ATTACHMENTS: 'SPT_ATC',
  SERVICE_ATTACHMENTS: 'SVC_ATC',
  MEMBER_CERTIFICATES: 'MEM_CTF',
  SERVICE_AREAS: 'SVC_ARA',

  ARTWORKS: 'ART',
  ARTWORK_HIERARCHICAL: 'ART_HRC',
  ARTWORK_I18NS: 'ART_I1N',
  ARTWORK_PROPERTIES: 'ART_PRP',
  ARTWORK_KEYWORDS: 'ART_KWD',
  ARTWORK_LABELS: 'ART_LBE',
  ARTWORK_RANGES: 'ART_RNG',
  ARTWORK_ATTACHMENTS: 'ART_ATC',
  ARTWORK_REGIONS: 'ART_REG',

  CONSULTINGS: 'CST',
  CONSULTING_HIERARCHICAL: 'CST_HRC',
  CONSULTING_PROPERTIES: 'CST_PRP',
  CONSULTING_SAVES: 'CST_SVC',
  CONSULTING_ATTACHMENTS: 'CST_ATC',

  REPLIES: 'RPL',
  REPLY_HIERARCHICAL: 'RPL_HRC',

  NOTES: 'NTE',
  NOTE_LABELS: 'NTE_LBL',
  NOTE_LINKS: 'NTE_LNK',
  NET_ADDRESS: 'NADR',
  ADDRESSES: 'ADR',
  SCHOOLES: 'SCR',
  SHARP_OPTIONS: 'SHP_OPT',
  SHARP_OPTION_HIERARCHICAL: 'SHP_OPT_HRC',
  INSTRUMENT_MARKET: 'IST_MKT',
  INSTRUMENT_MARKET_ATTACHMENTS: 'IST_MKT_ATC',
  INSTRUMENT_MARKET_ADDRESSES: 'IST_MKT_ADR',


  REQUEST_PAYMENTS: 'RQP',
  REQUEST_PAYMENT_BUYER: 'RQP_BUY',
  REQUEST_PAYMENT_BANK: 'RQP_BNK',
  REQUEST_PAYMENT_REFUND: 'RQP_RFD',
  REQUEST_PAYMENT_HISTORIES: 'RQP_HIS',

  STORE: "STR",
  STORE_MEMO: "STR_MEM",

  SHARP_REVIEWS: 'SHP_RVW',
  SHARP_REVIEW_ATTACHMENTS: 'SHP_RVW_ATC',

  BLOCK_MEMBERS: 'BLK_MEM',

  FCMS: 'FCM',
  FCM_DATAS: 'FCM_DTA',
  FCM_NOTIFICATION: 'FCM_NTF',

  DEVICE_TOKEN: 'DVS_TKN',

  RESERVE_REQUEST: 'RSQ',
  POSITIVE_POINTS: 'PSP',
  NEGATIVE_POINTS: 'NGP',
  NEGATIVE_POINT_HISTORIES: 'NGP_HIS',
  POSITIVE_POINT_RELATION: 'PSP_RLA',
  NEGATIVE_POINT_RELATION: 'NGP_RLA',

  PRODUCT: "PRD",
  PRODUCT_THEMES: "PRD_THES",
  PRODUCT_ATTACHMENTS: "PRD_ATTS",


}

export const UK_PREFIX = {
  ATTACHMENT: 'ATTCH',
  MANAGER: 'MANAG',
  USER: 'USERS',
  ARTWORK: 'ARTWK',
  PRODUCT: 'PRDT',
  CONSULTING: 'CNSTG',
  REPLY: 'REPLY',
  NOTE: 'NOTES',

  NOTIFICATION: 'NTFCT',

  KEYWORD_LABEL: 'KWDLB',

  SHARP_OPTION: 'SPOPT',
  INSTRUMENT_MARKET: 'ISTMK',
  SHARP_PRODUCT: 'SPPRD',

  REQUEST_PAYMENT: 'RQPAY',

  RESERVE: 'RESV',
  SHARP_ORDER_DELIVERY: 'SODLV',
  SHARP_ORDER: 'SPORD',

  SHARP_REVIEW: 'SPRVW',

  FCM: 'FCMSG',
}