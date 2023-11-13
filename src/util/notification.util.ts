import * as path from 'path';
import * as fs from 'fs';
import { NotificationButton } from 'src/entity/notification/notificationButton.entity';

const VARIABLE_REG = /(?<=\{\{\s*)[a-z]\w*(?=\s*\}\})/g;
// const VARIABLE_REG = /.+/;
export const BIZM_KAKAO_REG = /^BIZM-(AT|AI|FT|FI|FW)/;
export const BIZM_SMS_REG = /^BIZM-[SL]/;
export type MailerRes = {
  accepted: Array<string>; //[ "irony1090@kakao.com" ],
  rejected: Array<string>;//[],
  envelopeTime: number // 788,
  messageTime: number // 608,
  messageSize: number // 1031,
  response: string // "250 2.0.0 OK  1651053224 n14-20020a17090a394e00b001d5f22845bdsm6519922pjf.1 - gsmtp",
  envelope: {
    from: string // "5wakeup.main@gmail.com",
    to: Array<string> // [ "irony1090@kakao.com" ]
  },
  messageId: string /// "<35ae6b5a-e557-e5bb-ef50-b5b5992a18f9@gmail.com>"
}

export type BizmKakaoReq = {
  message_type: 'AT' // 알림톡 (템플릿 강조유형이 선택안함, 강조표기형, 아이템리스트형인 경우)
    | 'AI' //: 이미지 알림톡 (템플릿 강조유형이 이미지형인 경우)
    | 'FT' //친구톡 
    | 'FI' // 이미지 친구톡
    | 'FW'; // 와이드 이미지 친구톡
  phn: string; // length-15;
  profile: string; // 발신 프로필 키
  msg: string; // AT, AI, FT: length-1000, FI: length-400, FW: length-76
  tmplId: string; // 템플릿 아이디 length-30
  reserveDt?: string; // ? lengh-14 
  title?: string; // ? 제목 length-50  강조 표기형 선택한 경우 입력
  smsKind?: 'S'|'L'|'N'; // ? 전환발송 여부 S: SMS, L: LMS, N: 발송하지 않음,
  msgSms?: string; // ? 비즈 메시지 실패시 문자 대체 메시지 SMS: 90byte, LMS: 2000byte, MMS: 2000byte
  smsSender?: string // ? length-15 문자 발신 번호
  smsLmsTit?: string // ? length-30 장문 메시지 발송시 메시지 제목
  smsOnly?: 'Y'|'N' // ? length-1 비즈 메시지 발송 여부와 관계없이 문자 메시지 전용 Y: 사용, N 미사용(기본)
  ad_flag?: 'Y'|'N' // ? length-1 친구톡 메시지 발송 시 광고성 메시지 필수 표기사항 노출 여부 Y: 사용, N 미사용(기본)
  img_url?: string // ? length-2083 친구톡 발송 시 메시지 첨부할 이미지 URL (사이트 내에서 등록 필요)
  img_link?: string // ? length-2083 첨부된 이미지 클릭 시 이동할 URL
  button1?: BizmButtonReq;
  button2?: BizmButtonReq;
  button3?: BizmButtonReq;
  button4?: BizmButtonReq;
  button5?: BizmButtonReq;
}

export type BizmSmsReq = {
  phn: string; // length-15;
  profile: string; // 발신 프로필 키
  smsKind: 'S'|'L'; // ? 전환발송 여부 S: SMS, L: LMS, N: 발송하지 않음,
  msgSms: string; // ? SMS: 90byte, LMS: 2000byte, MMS: 2000byte
  smsSender: string // ? length-15 문자 발신 번호
  smsOnly: 'Y' // ? length-1 비즈 메시지 발송 여부와 관계없이 문자 메시지 전용 Y: 사용, N 미사용(기본)
  reserveDt?: string; // ? lengh-14 
  smsLmsTit?: string // ? length-30 장문 메시지 발송시 메시지 제목
}

// export type BizmButtonReq = {
//   name: string;
//   type: string; // length-2 버튼 타입
//   url_pc?: string; //
//   url_mobule?: string;
//   scheme_ios?: string;
//   scheme_android?: string;
//   chat_extra?: string // length-50 상담톡/봇 전환시 전달할 메타 정보
//   chat_event?: string // 봇 전환 시 연결할 봇 이벤트명
//   plugin_id?: string // plugin_id
//   relay_id?: string // 플러그인 실행시 X-Kakao-Plugin-Relay-Id 헤더 를 통해 전달 받을 값 (카카오톡 비즈플러그인 안내 페이지 하단 개발 가이드 참고)
//   oneclick_id?: string // 원클릭 결제 플러그인에서 사용하는 결제 정보 (카카오톡 비즈플러그인 안내 페이지 하단 개발 가이드 참고)
//   product_id?: string // 원클릭 결제 플러그인에서 사용하는 결제 정보 (카카오톡 비즈플러그인 안내 페이지 하단 개발 가이드 참고)
// }
export type BizmRes = {
  code: 'success'|'fail',
  data: {
    phn: string //'01082360642',
    msgid: string // 'WEB20220502161655866866',
    type: string //'AT'
  },
  message: string // 'K109:NoMatchedTemplateTitleException',
  originMessage: string // null
}
export type BizmButtonReq = {
  name: string;
} & (BizmButtonWeb
  | BizmButtonApp
  | BizmButtonDelivery
  | BizmButtonConsulting
  | BizmButtonTransformBot
  | BizmButtonAddChannel
  | BizmButtonBusiness)

type BizmButtonWeb = {
  type: 'WL';
  url_mobile: string;
  url_pc?: string; //
}

type BizmButtonApp = {
  type: 'AL';
  scheme_ios: string;
  scheme_android: string;
  url_mobule?: string;
  url_pc?: string; //
}
type BizmButtonDelivery = {
  type: 'DS';
}

type BizmButtonConsulting = {
  type: 'BC';
  chat_extra?: string // length-50 상담톡/봇 전환시 전달할 메타 정보
}

type BizmButtonTransformBot = {
  type: 'BT';
  chat_extra?: string;
  chat_event?: string;
}

type BizmButtonAddChannel = {
  type: 'AC';
}
type BizmButtonBusiness = {
  type: 'BF';
  biz_form_key: string // 비즈니스키
}

export const getTemplateData = async (
  template: string, data: Partial<any> = {}
): Promise<TemplateData> => {
  let templateStr: string
  // try {

  if( template === 'comm' )
    templateStr = '{{text}}';
  else
    templateStr = await readHbsTemplateToString(template)
    // console.log('[success]', str);
  // } catch (error) {
  //   if( 'errno' in error && error.errno === -4058 )
  //     templateStr = '{{text}}';
  //   else
  //     throw error;
  // }
  // console.log('[TEMP]',templateStr.replace(VARIABLE_REG, ''))
  // console.log( templateStr.match(VARIABLE_REG) );
  
  const keys = templateStr.match(VARIABLE_REG);
  return {
    template: templateStr,
    data: keys?.reduce( (rst, key) =>{
      rst[key] = data[key]||null;
      return rst;
    }, {}) || {}
  };
}

export type NotificationTemplate = 
  NotificationBodyTemplate | NotificationLayoutTemplate

export type TemplateData<T=any> = {
  // template: HandlebarsTemplateDelegate;
  template: string;
  data: T
}



export type NotificationBodyTemplate = 
  TourApplicationApplicant | TourApplicationStore
  | TourCancelApplicant | TourCancelStore
  | TourCompleteApplicant | TourCompleteStore
  | TourConfirmApplicant | TourConfirmStore
  | TourConfirmedApplicant | TourConfirmedResident | TourConfirmedStore
  | TourModifyApplicant | TourModifyResident
  | TourTodayApplicant | TourTodayStore
  | NoticeFromStore
;

type TourApplicationApplicant = {
  template: 'tour/application_applicant';

  data: {
    applicantName: string;
    
    houseTitle: string;
    roomTitle?: string;
    positionTitle?: string;
    reserveDate: string;
    storeTel: string;
  }
}

type TourApplicationStore = {
  template: 'tour/application_store_re';

  data: {
    houseTitle: string;
    roomTitle?: string;
    positionTitle?: string;
  
    applicantName: string;
    applicantTel: string;
    applicantJob?: string;
  
    reserveDate: string;
  }
}

type TourCancelApplicant = {
  template: 'tour/cancel_applicant';
  applicantName: string;

  data: {
    houseTitle: string;
    roomTitle?: string;
    positionTitle?: string;
    reserveDate: string;
    // storeTel: string;
    cancelMessage: string;
  }
}

type TourCancelStore = {
  template: 'tour/cancel_store';

  data: {
    houseTitle: string;
    roomTitle?: string;
    positionTitle?: string;
    applicantName: string;
    applicantTel: string;
    applicantJob?: string;
    reserveDate: string;
    
    cancelMessage: string;
  }
}

type TourCompleteApplicant = {
  template: 'tour/complete_applicant';

  data: {
    applicantName: string;
    storeTel: string;
  }
}

type TourCompleteStore = {
  template: 'tour/complete_store';

  data: {
    houseTitle: string;
    roomTitle?: string;
    positionTitle?: string;
    applicantName: string;
    applicantTel: string;
    applicantJob?: string;
    reserveDate: string;
  }
}


type TourConfirmApplicant = {
  template: 'tour/confirm_applicant';

  data: {
    applicantName: string;
    houseTitle: string;
    roomTitle?: string;
    positionTitle?: string;
    reserveDate: string;
  }
}

type TourConfirmStore = {
  template: 'tour/confirm_store';

  data: {
    houseTitle: string;
    roomTitle?: string;
    positionTitle?: string;
    applicantName: string;
    applicantTel: string;
    applicantJob?: string;
    reserveDate: string;
  }
}

type TourConfirmedApplicant = {
  template: 'tour/confirmed_applicant';

  data: {
    houseTitle: string;
    roomTitle?: string;
    positionTitle?: string;
    reserveDate: string;
  
    promiseAddress: string;
    storeTel: string;
  }
}
type TourConfirmedResident = {
  template: 'tour/confirmed_resident';

  data: {
    houseTitle: string;
    roomTitle?: string;
    positionTitle?: string;
    reserveDate: string;
  }

}
type TourConfirmedStore = {
  template: 'tour/confirmed_store';

  data: {
    houseTitle: string;
    roomTitle?: string;
    positionTitle?: string;
    applicantName: string;
    applicantTel: string;
    applicantJob?: string;
    reserveDate: string;
  
    promiseAddress: string;
  }

}
type TourModifyApplicant = {
  template: 'tour/modify_applicant';

  data: {
    applicantName: string;
  
    beforeHouseTitle: string;
    beforeRoomTitle?: string;
    beforePositionTitle?: string;
    beforeReserveDate: string;
  
    houseTitle: string;
    roomTitle?: string;
    positionTitle?: string;
    reserveDate: string;
  
    storeTel: string;
  }
}

type TourModifyResident = {
  template: 'tour/modify_resident';

  data: {
    beforeHouseTitle: string;
    beforeRoomTitle?: string;
    beforePositionTitle?: string;
    beforeReserveDate: string;
  
    houseTitle: string;
    roomTitle?: string;
    positionTitle?: string;
    reserveDate: string;
  
    storeTel: string;
  }
}

type TourTodayApplicant = {
  template: 'tour/today_applicant';

  data: {
    houseTitle: string;
    roomTitle?: string;
    positionTitle?: string;
    reserveDate: string;
  
    promiseAddress: string;
    storeTel: string;
  }
}
type TourTodayStore = {
  template: 'tour/today_store';

  data: {
    houseTitle: string;
    roomTitle?: string;
    positionTitle?: string;
    applicantName: string;
    applicantTel: string;
    applicantJob?: string;
    reserveDate: string;
  
    promiseAddress: string;
    azitPlatTel: string;
  }
}
// type NoticeFromHouse = {
//   template: 'notice/house.resident'
// }
type NoticeFromStore = {
  template: 'notice/store_relation'
  data: {
    storeTitle: string;
    message: string;
  }
}
type Comm = {
  tempate: 'comm',
  data: {
    comm: string;
  }
}


// export const getNotificationHbsTemplate = ( 
//   template: NotificationTemplate['template']
// ): Promise<HandlebarsTemplateDelegate> => {
//   if( !template )
//     return undefined;
//   const obj = getNotificationHbsData('layout/email.layout');
  
//   return new Promise<HandlebarsTemplateDelegate>( (resolve, reject) => {
//     fs.readFile(
//       path.join(process.env.PATH_PROJECT, `/src/template/${template}.hbs`),
//       ( err, d ) => {
//         if( err ) 
//           reject(err);
//         else      
//           resolve( Handlebars.compile( d.toString() ) );
//       }
//     )
//   })
// }


const readHbsTemplateToString = (template: string): Promise<string> => 
  new Promise<string>( (resolve, reject) => {
    
    fs.readFile(
      path.join(process.env.PATH_PROJECT, `/src/template/${template}.hbs`),
      (err, data) => {
        if( err )
          reject(err);
        else
          resolve(data.toString());
      }
    )
    
  })


export const allowNotificationTemplate = ( 
  templateInfo: NotificationTemplate
): templateInfo is NotificationTemplate => {
  if( !templateInfo )
    return false;
  const { template, data } = templateInfo;
  if( template === 'layout/email.layout' )
    return !checkEmpty(data, ['body'])
  else if( template === 'tour/application_applicant' )
    return !checkEmpty(data, ['applicantName', 'houseTitle', 'reserveDate', 'storeTel'])
  else if( template === 'tour/application_store_re' )
    return !checkEmpty(data, ['houseTitle', 'applicantName', 'applicantTel', 'reserveDate'])
  else if( template === 'tour/cancel_applicant' )
    return !checkEmpty(data, ['houseTitle', 'reserveDate', 'cancelMessage'])
  else if( template === 'tour/cancel_store' )
    return !checkEmpty(data, ['houseTitle', 'applicantName', 'applicantTel', 'reserveDate', 'cancelMessage'])
  else if( template === 'tour/complete_applicant' )
    return !checkEmpty(data, ['applicantName', 'storeTel'])
  else if( template === 'tour/complete_store' )
    return !checkEmpty(data, ['houseTitle', 'applicantName', 'applicantTel', 'reserveDate'])
  else if( template === 'tour/confirm_applicant' )
    return !checkEmpty(data, ['applicantName', 'houseTitle', 'reserveDate'])
  else if( template === 'tour/confirm_store' )
    return !checkEmpty(data, ['houseTitle', 'applicantName', 'applicantTel', 'reserveDate'])
  else if( template === 'tour/confirmed_applicant' )
    return !checkEmpty(data, ['houseTitle', 'reserveDate', 'promiseAddress', 'storeTel'])
  else if( template === 'tour/confirmed_resident' )
    return !checkEmpty(data, ['houseTitle', 'reserveDate'])
  else if( template === 'tour/confirmed_store' )
    return !checkEmpty(data, ['houseTitle', 'applicantName', 'applicantTel', 'reserveDate', 'promiseAddress'])
  else if( template === 'tour/modify_applicant' )
    return !checkEmpty(data, ['applicantName', 'beforeHouseTitle', 'beforeReserveDate', 'houseTitle', 'reserveDate', 'storeTel'])
  else if( template === 'tour/modify_resident' )
    return !checkEmpty(data, ['beforeHouseTitle', 'beforeReserveDate', 'houseTitle', 'reserveDate', 'storeTel'])
  else if( template === 'tour/today_applicant' )
    return !checkEmpty(data, ['houseTitle', 'reserveDate', 'promiseAddress', 'storeTel'])
  else if( template === 'tour/today_store' )
    return !checkEmpty(data, ['houseTitle', 'applicantName', 'applicantTel', 'reserveDate', 'promiseAddress', 'azitPlatTel'])
  else if( template === 'notice/store_relation' )
    return !checkEmpty(data, ['storeTitle', 'message'])
  else 
    return false;

}

const checkEmpty = <T>(obj: T, keys: Array<keyof T>): boolean => keys.some( key => !obj[key] )


export type NotificationLayoutTemplate = EmailLayout;

type EmailLayout = {
  template: 'layout/email.layout',
  data: {
    // head: string;
    // title: string;
    body: string;
    button?: NotificationButton;
  }
}
