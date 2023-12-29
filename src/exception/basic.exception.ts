
export type BasicExceptionOptions = {
  saveLog?: boolean,
  logMessage?: string
}
type CodeMessage = {
  name?: string;
  code: number;
  message: string;
}
// type ErrorCode = {
//   code: number;
//   message: string;
// }
export class BasicException extends Error{

  code: number;
  options: BasicExceptionOptions;
  constructor(errorCode: CodeMessage, opts: BasicExceptionOptions = {}){
    super();
    this.code = errorCode.code;
    this.name =  'name' in errorCode && errorCode.name ?  errorCode.name : 'BASIC';
    this.message = errorCode.message;
    this.options = opts;
  }

  getTitle(): string {
    return `[${this.name}-${this.code}]${this.message}`;
  }
}
export const BASIC_EXCEPTION = {
  EMPTY_CONTENT: new BasicException({code: 204, message: '데이터가 없습니다'}),

  VALIDATION_FAILED_ONLY_NUMBER: new BasicException({code: 601, message: '숫자 형태만 가능합니다'}),

  NOT_ALLOW_AUTH: new BasicException({code: 1000, message: '접근 권한이 없습니다'}),
  NOT_ALLOW_BODY: new BasicException({code: 1001, message: '잘못된 요청 형태입니다'}),

  NOT_FOUND_DB_CONNECTION: new BasicException({code: 2000, message: "DB 커넥션을 찾을 수 없습니다"}),
  UNKNOWN_SERVER_ERROR: new BasicException({code: 2001, message: "알 수 없는 서버 에러가 발생하였습니다"}),

  
  NOT_ALLOW_USER_TYPE_ON_PROCESS: new BasicException({code: 10000, message: '접근할 수 없는 유저 입니다'}),
  NOT_ALLOW_EMPTY_ON_PROCESS: new BasicException({code: 10001, message: '잘못된 값을 요청하고 있습니다'}),
  INCORRECT_PROPERTY_VALUE: new BasicException({code: 10002, message: '잘못된 속성 또는 값을 요청하고 있습니다'}),
  ALREADY_BEAN_COMPLETED: new BasicException({code: 10003, message: '이미 완료된 요청입니다'}),
  TIMEOUT: new BasicException({code: 10004, message: '응답 시간 초과'}),

  // NOT_FOUND_GRADE: new BasicException({code: 200001, message: '유저 등급을 찾을 수 없습니다'}),
  NOT_FOUND_AUTH: new BasicException({code: 200001, message: '유저 정보를 찾을 수 없습니다'}),
  CHECK_PASSWORD: new BasicException({code: 200002, message: '비밀번호를 확인해주세요'}),
  AUTH_STATE_IS_SUSPENED: new BasicException({code: 200003, message: '정지된 계정입니다.'}),
  AUTH_STATE_IS_DORMANCY: new BasicException({code: 200004, message: '휴면 상태의 계정입니다.'}),
  DUPLICATE_IDENTITY: new BasicException({code: 200011, message: '중복된 아이디가 존재하거나 아이디를 입력하지 않았습니다'}),
  DUPLICATE_NICKNAME: new BasicException({code: 200012, message: '중복된 닉네임이 존재하거나 닉네임을 입력하지 않았습니다'}),
  NOT_ALLOW_PASSWORD: new BasicException({code: 200013, message: '패스워드를 입력하지 않으셨거나 허용되지 않습니다'}),
  EXCEEDED_NUMBER_OF_MODIFY_IDENTITY: new BasicException({code: 200014, message: '아이디 변경 가능 횟수를 초과했습니다'}),
  EXCEEDED_NUMBER_OF_MODIFY_NICKNAME: new BasicException({code: 200015, message: '닉네임 변경 가능 횟수를 초과했습니다'}),
  NOT_EQUAL_NAME: new BasicException({code: 200016, message: '작성하신 이름과 휴대폰 명의자가 다릅니다'}),
  DUPLICATE_EMAIL: new BasicException({code: 200017, message: '중복된 이메일이 존재하거나 이메일을 입력하지 않았습니다'}),
  DUPLICATE_TEL: new BasicException({code: 200017, message: '중복된 전화번호가 존재하거나 전화번호를 입력하지 않았습니다'}),
  NOT_ALLOW_SERVICE_AREA: new BasicException({code: 200018, message: '서비스 지역을 설정하지 않으셨거나 설정 가능 지역 수를 초과하여 설정하셨습니다'}),
  NOT_ALLOW_ROLES_CONCURRENTLY: new BasicException({code: 200019, message: '동시에 설정할 수 없는 역할입니다'}),
  EXIST_MEMBER_INFO: new BasicException({code: 200020, message: '가입 정보가 존재합니다'}),
  MODIFIY_ONLY_CERTIFICATE: new BasicException({code: 200021, message: '본인인증을 통해서만 연락처 수정이 가능합니다'}),
  EXIST_CERTIFICATE_INFO: new BasicException({code: 200022, message: '동일한 유형에 해당 인증 정보로 인증된 가입 내역이 존재합니다'}),
  AUTH_STATE_IS_WAITING_REMOVE: new BasicException({code: 200023, message: '삭제 예정인 계정입니다.'}),
  STORE_WAITING_ALLOW: new BasicException({code: 200024, message: '승인 대기중인 계정입니다.'}),
  STORE_NOT_ALLOW: new BasicException({code: 200025, message: '가입 거절된 계정입니다.'}),

  NOT_ALLOW_UPLOAD_FILES: new BasicException({code: 300002, message: '업로드할 수 없는 파일이 있습니다'}),
  INVALID_FILE: new BasicException({code:300003, message:'업로드에 실패한 파일 입니다. 다시 업로드 해보시기 바랍니다.'}),
  UPLOADING_ATTACHMENT: new BasicException({code:300004, message:'파일을 업로드 중입니다. 잠시 후 다시 시도해 보십시오.'}),


  NOTIFICATION_FAIL: new BasicException({code: 400001, message: '알림 발송에 실패하였습니다'}),
  NOT_FOUND_TEMPLATE: new BasicException({code: 400002, message: '템플릿을 찾을 수 없습니다'}),
  INCORRECT_PROPERTY_VALUE_FROM_TEMPLATE: new BasicException({code: 400003, message: '템플릿의 변수가 부족합니다.'}),
  NOT_POSSIBLE_TO_SEND: new BasicException({code: 400004, message: '발송 가능한 상태가 아닙니다'}),
  INCORRECT_MEDIA: new BasicException({code: 400005, message: '발신 매체가 올바르지 않습니다'}),
  INCORRECT_RECEIVER_ADDRESS: new BasicException({code: 400006, message: '수신자의 주소가 올바르지 않습니다'}), // KAKAO-message-E104:InvalidPhoneNumber
  CONTENT_IS_TOO_LONG: new BasicException({code: 400007, message: '보낼 수 있는 메시지의 최대 허용량을 초과하였습니다'}), 
  INCORRECT_SENDER_AUTH: new BasicException({code: 400101, name: 'EMAIL', message: '발신자 계정 정보가 올바르지 않습니다'}),
  REFUSED_DOMAIN: new BasicException({code: 400102, name: 'EMAIL', message: '요청 도메인에 거부되었습니다'}),

  NOT_FOUND_AUTH_OR_PROFILE: new BasicException({code: 400201, name: 'KAKAO', message: '존재하지않는 사용자 계정 또는 발신 프로필입니다'}),
  NO_MATCHED_TEMPLATE: new BasicException({code: 400202, name: 'KAKAO', message: '알림 내용과 템플릿의 내용이 다릅니다'}), // message-K105:NoMatchedTemplate
  NO_MATCHED_TEMPLATE_TITLE: new BasicException({code: 400203, name: 'KAKAO', message: '제목을 강조할 수 없는 템플릿입니다'}), // message-K109:NoMatchedTemplateTitleException
  NO_MATCHED_TEMPLATE_BUTTON: new BasicException({code: 400204, name: 'KAKAO', message: '버튼을 첨부할 수 없는 템플릿입니다'}), // message-K108:NoMatchedTemplateButtonException

  ERROR_SNS_PROCESS: new BasicException({code: 500000, message: 'SNS 프로세스 에러'}),
  NOT_ALLOW_SNS: new BasicException({code: 500001, message: '지원하지 않는 SNS 입니다'}),
  EXPIRED_SNS_CODE: new BasicException({code: 500002, message: '만료된 코드입니다'}),
  NOT_FOUND_SNS_TOKEN: new BasicException({code: 500003, message: '토큰을 찾을 수 없습니다'}),
  INSUFFICIENT_SNS_USER_INFO: new BasicException({code: 500004, message: '개인정보 필수 항목이 부족합니다'}),
  NOT_FOUND_SNS: new BasicException({code: 500005, message: 'SNS 정보를 찾을 수 없습니다'}),
  SNS_DOES_NOT_MATCH: new BasicException({code: 500006, message: 'SNS 정보가 일치하지 않습니다'}),
  APPLE_DATA_NOT_FOUND: new BasicException({code: 500007, message: '애플 회원 정보를 찾을 수 없습니다'}),
  SNS_TIME_OUT: new BasicException({code: 500008, message: '만료된 SNS 정보입니다'}),
  INCORRECT_TEL: new BasicException({code: 500009, message: '잘못된 전화번호입니다'}),
  SEND_TEMPPASSWORD_FAIL: new BasicException({code: 500010, message: '임시비밀번호 발급에 실패하셨습니다'}),

  // /** TOUR */
  // UNAVAILABLE_TO_APPLY_FOR_TOUR: new BasicException({code: 600002, message: '신청할 수 없는 상태입니다'}),
  

  // /** CONTRACT */
  // NOT_ALLOW_UPDATE_WHERE_STATE_OF_CANCEL: new BasicException({code: 700001, message: '취소된 상태에서는 업데이트할 수 없습니다'}),
  // NOT_ALLOW_UPDATE_WHERE_EXPIRES: new BasicException({code: 700002, message: '만료된 계약은 업데이트할 수 없습니다'}),
  // INCORRECT_CONTRACT_MEDIA: new BasicException({code: 700003, message: '계약할 대상을 지정해주세요'}),
  // ALREADY_CONTRACTED: new BasicException({code: 700004, message: '이미 진행 중인 계약이 존재합니다'}),
  // REQUIRED_INPUT_DATE: new BasicException({code: 700005, message: '계약 날짜 입력이 필수입니다'}),
  // REQUIRED_POSITION: new BasicException({code: 700006, message: '침대를 선택 해주세요'}),

  /** ORDER & REQUEST PAYMENT */
  NOT_REQUIRE_PAY: new BasicException({code: 600000, message: '결제 프로세스가 불필요합니다'}),
  NOT_ALLOW_PAYMENT: new BasicException({code: 600001, message: '지원하지 않는 구매 방식입니다'}),
  WHAT_HAS_ALREADY_BEEN_DONE_CANNOT_BE_MODIFIED: new BasicException({code: 600002, message: '이미 완료된 결제 건은 수정할 수 없습니다'}),
  WHAT_HAS_ALREADY_BEEN_CANCELED_CANNOT_BE_MODIFIED: new BasicException({code: 600003, message: '이미 취소된 결제 건은 수정할 수 없습니다'}),
  NOT_ALLOW_PAYMENT_AMOUNT: new BasicException({code: 600004, message: '결제 금액이 적합하지 않습니다'}),
  PAYMENT_DATA_DOES_NOT_MATCH: new BasicException({code: 600005, message: '결제 데이터가 일치하지 않습니다'}),
  BIGGER_THAN_PAYMENT_AMOUNT: new BasicException({code: 600006, message: '결제 금액보다 큽니다'}),
  REQUIRE_REFUND_INFO: new BasicException({code: 600007, message: '환불받을 계좌 정보를 입력하셔야 합니다'}),
  NOT_ALLOW_CANCEL_PART_FROM_IAMPORT: new BasicException({code: 600008, message: '아임포트 관리자페이지에서의 취소는 전체취소만 가능합니다'}),
  CANNOT_ORDER_PRODUCT: new BasicException({code: 600009, message: '주문할 수 없는 상품입니다'}),
  INCORRECT_PAYMENT_INFO: new BasicException({code: 600010, message: '올바르지 않은 결제 정보입니다'}),
  WHAT_HAS_ALREADY_BEEN_CANCELED: new BasicException({code: 600011, message: '이미 취소된 결제입니다'}),
  HAVE_TO_MAKE_REQUEST_TO_SELLER: new BasicException({code: 600012, message: '판매자에게 직접 요청 하셔야 합니다'}),
  NOT_ALLOW_WRITE_TO_DELIVERY_INFOMATION: new BasicException({code: 600013, message: '택배 정보 작성이 불가능한 상태입니다'}),
  ONLY_CONFIRM: new BasicException({code: 600014, message: '주문확정 상태에서만 가능합니다'}),
  OVER_ALLOW_PEOPLE: new BasicException({code: 600015, message: '신청 가능한 인원을 초과하였습니다'}),
  NOT_ALLOW_CHANGE_DISCOUNTS: new BasicException({code: 600016, message: '할인 내역을 추가하거나 수정할 수 없는 상태입니다'}),
  NOT_FOUND_ORDER_HISTROY: new BasicException({code: 600017, message: '주문내역을 찾을 수 없습니다'}),
  NOT_FOUND_AVAILABLE_TO_PAY: new BasicException({code: 600018, message: '결제 가능한 주문이 없습니다'}),
  CANNOT_PAYMENT_STATE: new BasicException({code: 600019, message: '결제할 수 없는 상태입니다'}),
  REQUIRE_NEW_ORDER: new BasicException({code: 600020, message: '새로운 주문을 하셔야 합니다'}),
  ALREADY_ORDERED: new BasicException({code: 600021, message: '이미 진행 중인 주문 내역이 존재합니다'}),
  TIME_OVER: new BasicException({code: 600022, message: '주문 가능 시간이 초과되었습니다.'}),

  /** (SHARP) PRODUCT */
  NOT_FOUND_PRODUCT: new BasicException({code: 700000, message: '상품내역을 찾을 수 없습니다.'}),
  NOT_FOUND_PRODUCT_TIME: new BasicException({code: 700000, message: '일정내역을 찾을 수 없습니다.'}),

  /** RESERVE */
  NOT_FOUND_LOCAL_TYPE: new BasicException({code: 800001, message: '지역정보를 찾을 수 없습니다.'}),

  /** REVIEW */
  RECHECK_SCORE: new BasicException({code: 900001, message: '리뷰 점수를 확인해주세요'}),



} as const;
// export const staticBasicException = {

// } as const
