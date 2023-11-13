declare module '*.png';
// declare module "*.png" {
//   const content: string;
//   export default content;
// }
// declare module "*.png" {
//   const value: any;
//   export = value;
// }
declare module '*.jpg';
// declare module "*.jpg" {
//   const content: string;
//   export default content;
// }
// declare module '*.json';
declare module '*.svg';
declare module '*.gif';

declare namespace NodeJS {
  interface ProcessEnv {
    // 실행 환경
    NODE_ENV: string;

    APP: string;
    // 실행 포트
    PORT: string;

    // 다국어 기능. 기본 언어 값
    DEFAULT_LANG: string;
  
    // 외부 파일들이 저장될 경로.(첨부파일, 로그 등)
    PATH_EXT_STORAGE: string;
    PATH_PROJECT: string;

    // 세션 암호화 키. 클러스터시 맞추어야 할 부분
    SESSION_SECRET: string;

    SECRET_AES_KEY: string;
    SECRET_AES_IV: string;
    SECRET_SALT: string;

    // 다국어 기능. query의 키값
    PARAM_KEY_LANG: string;
    // 세션에 저장될 유저 정보의 키값
    PARAM_KEY_SESSION_MEMEBER: string;

    // SNS TOKEN 정보가 저장될 세션의 키값
    PARAM_KEY_SNS_TOKEN: string;
    // SNS TOKEN을 통한 제공된 사용자 정보가 저장될 세션의 키값
    PARAM_KEY_SNS_PROVIDED: string;

    


    // MYSQL 접속 아이디
    MYSQL_USER: string;
    // MYSQL 접속 비밀번호
    MYSQL_PASSWORD: string;
    // MYSQL 접속 호스트
    MYSQL_HOST: string;
    // MYSQL 접속 포트
    MYSQL_PORT: string;
    // MYSQL 접속 db명
    MYSQL_DATABASE: string;

    // 메일 도메인 Ex) smtp.gmail.com
    MAIL_HOST: string;
    // 메일 포트
    MAIL_PORT: string;
    // 메일 접속 아이디
    MAIL_USER: string;
    // 메일 접속 비밀번호
    MAIL_PASSWORD: string;
    // 메일 발신자 이름
    MAIL_SENDER_NAME: string;
    // 메일 발신자 주소
    MAIL_SENDER_ADDRESS: string;

    // 비즈엠 아이디
    BIZM_USER: string;
    // 비즈엠 비밀번호
    // BIZM_PASSWORD: string;
    // 비즈엠 프로필키
    BIZM_PROFILE: string;
    BIZM_URL: string;
    BIZM_SENDER_TEL: string;

    /** 아임포트 */
    IAMPORT_IMP_API_KEY: string;
    IAMPORT_IMP_SECRET: string;
    IAMPORT_API_URL: string;


    /** 카카오 */
    KAKAO_REST_API_KEY: string;
    KAKAO_JAVASCRIPT_KEY: string;
    KAKAO_ADMIN_KEY: string;
    // secret키는 내어플리케이션->보안->활성화를 한 경우 필수
    KAKAO_CLIENT_SECRET: string;
    KAKAO_API_URL: string;
    KAKAO_AUTH_URL: string;
    KAKAO_REDIRECT_URL: string;

    /**파이어베이스로 시작하는 것을 추천(어차피 생성해야함) */
    GOOGLE_API_KEY: string;
    GOOGLE_CLIENT_ID: string;
    GOOGLE_CLIENT_SECRET: string;
    GOOGLE_API_URL: string;
    GOOGLE_AUTH_URL: string;
    GOOGLE_REDIRECT_URL: string;
    GOOGLE_APPLICATION_CREDENTIALS: string;
    /** 페이스북 파이어베이스 연동 필요없음 */
    FACEBOOK_API_URL: string;
    FACEBOOK_APP_ID: string;
    FACEBOOK_SECRET_CODE: string;
    FACEBOOK_REDIRECT_URL: string;
    /** 네이버 */
    NAVER_CLIENT_ID: string;
    NAVER_CLIENT_SECRET: string;
    NAVER_REDIRECT_URL: string;
    NAVER_API_URL: string;
    NAVER_AUTH_URL: string;
    /** 애플 */
    APPLE_API_URL:string;
    APPLE_CLIENT_ID: string;
    APPLE_REDIRECT_URL: string;
    APPLE_TEAM_ID: string;
    APPLE_KEY_ID: string;

    /** 아지트플랫 정보 */
    AZITPLAT_TEL: string;

    /** 알림 버튼 url */
    NOTIFICATION_URL_STORE: string;
    NOTIFICATION_URL_APPLICANT: string;

    /** SNS CUSTOM REDIRECT */
    CUSTOM_REDIRECT_GOOGLE: string;
    CUSTOM_REDIRECT_KAKAO: string;
    CUSTOM_REDIRECT_NAVER: string;

    /** FRON DOMAIN */
    FRONT_DOMAIN: string;

    /** APP SCHEME */
    ANDROID_SCHEME_HOME: string;
    IOS_SCHEME_HOME: string;
  }
}