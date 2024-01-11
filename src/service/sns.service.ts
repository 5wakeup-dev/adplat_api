import { Injectable } from "@nestjs/common";
import { BasicException, BASIC_EXCEPTION } from "src/exception/basic.exception";
import { ProvidedSnsInfo, SignInWithIdpDto, SnsAuth } from "src/util/entity.util";
import { pick, toQuery } from "src/util/index.util";
import * as fs from 'fs';
import CertificationToken from "src/util/entity/CertificationToken";
import { defError, defSuccess, MyAxios } from "src/util/axios.util";
import { AxiosError } from "axios";
import { sign } from "jsonwebtoken";
import { equalsIgnoreCase, isNumberForm, maxText } from "src/util/format.util";



type GoogleErrorResponse = {
  error: string;
  error_description: string;
}
type GoogleUserResponse = {
  federatedId: string,
  providerId: string,
  email: string,
  emailVerified: boolean,
  firstName: string,
  fullName: string,
  lastName: string,
  nickName: string,
  language: string,
  timeZone: string,
  photoUrl: string,
  dateOfBirth: string,
  originalEmail: string,
  localId: string,
  emailRecycled: boolean,
  displayName: string,
  idToken: string,
  context: string,
  verifiedProvider: Array<string>,
  needConfirmation: boolean,
  oauthAccessToken: string,
  oauthRefreshToken: string,
  oauthExpireIn: number,
  oauthAuthorizationCode: string,
  oauthTokenSecret: string,
  refreshToken: string,
  expiresIn: string,
  oauthIdToken: string,
  screenName: string,
  rawUserInfo: any,
  errorMessage: string,
  isNewUser: boolean,
  pendingToken: string,
  tenantId: string,
  mfaPendingCredential: string,
  mfaInfo: any
}
type GoogleRawUserInfo = {
  id: string;
  name: string;
  given_name: string;
  family_name: string;
  granted_scopes: string;
  locale: string;
  email: string;
  picture: string;
}

type KakaoErrorResponse = GoogleErrorResponse & {
  error_code: string;
}
type KakaoUserResponse = {
  id: string;
  kakao_account: KakaoAccount;
  properties: KakaoProperties;
}
type KakaoAccount = {
  // gender?: 'male'|'female';
  email: string;
  profile: KakaoProfile;
  name:string;
}
type KakaoProfile = {
  nickname: string;
  thumbnail_image_url: string;
  profile_image_url: string;
}
type KakaoProperties = {
  thumbnail_image: string;
  profile_image: string;
  nickname: string;
  name:string;
}

type NaverUserResponse = {
  resultcode: string;
  message: string;
  response: NaverUser;
}
type NaverUser = {
  // gender?: 'M' | 'F';    // 성별
  name?: string;            // 이름
  id: string;
  mobile?:string;
  email: string;
  gender?:"M"|"F"
  nickname: string;         // 별명
  profile_image: string;    // 프로필 사진
}
// type KakaoRedirectResponse = {
//   code: string
// }
type AppleErrorResponse = {
  error: string;
}

type FacebookSuccessRes = {
  access_token: string      //'EAAZBZCj0kDSpsBADrbbXrACG45RDIcxtJdZAjcGnoZBgrUu4JHYAZANr7sXdDt66nd105dDMGJeWVk14D97NHF2EDBct8GQUZBPcRMid5kYbjPsGneOK9NNVHSw37dqo1SDYCLDM8ZB1KlZAetSZCAYnzOUZBoSvH1SFsFJ8dUxcGDVlGbhdju8luWekcZBjmhZClZBgEZAOAZBN5FPVnD1wpt2qDMdtab5ZCL71Au2GZBwZBXkZAiu6QZDZD',
  token_type: string        //'bearer',
  expires_in: number        // 5171525
}
type FaceBookErrorRes = {
  error: {
    message: string;        //'This authorization code has expired.'
    type: string;           //'OAuthException'
    code: number;           // 100
    error_subcode: number;  // 36007
    fbtrace_id: string;     //'ASE6bk54r2G6EdudKPUzE6t'
  }
}

@Injectable()
export class SnsService {

  getToken(
    type: string, body: Record<string, string>
  ): Promise<CertificationToken> {
    // if(!SNS.include(type))
    if (equalsIgnoreCase(type, 'GOOGLE' as SnsAuth))
      return this.getGoogleToken(body);
    else if (equalsIgnoreCase(type, 'KAKAO' as SnsAuth))
      return this.getKakaoToken(body)
    else if (equalsIgnoreCase(type, 'NAVER' as SnsAuth))
      return this.getNaverToken(body);
    else if (equalsIgnoreCase(type, 'FACEBOOK' as SnsAuth))
      return this.getFacebookToken(body);
    else if (equalsIgnoreCase(type, 'APPLE' as SnsAuth))
      return this.getAppleToken(body);
    else
      throw BASIC_EXCEPTION.NOT_ALLOW_SNS;

  }

  async deleteLink(certificationToken: CertificationToken): Promise<any> {

    if (!certificationToken)
      throw BASIC_EXCEPTION.NOT_FOUND_SNS_TOKEN;

    const { certificationType: type, access_token: accessToken } = certificationToken;
    if (equalsIgnoreCase(type, 'KAKAO' as SnsAuth))
      return this.unlinkKakao(accessToken);
    else if (equalsIgnoreCase(type, 'NAVER' as SnsAuth))
      return this.unlinkNaver(accessToken);
    // else if( equalsIgnoreCase(type, SNS.GOOGLE.key) )
    //   return 0;
    // else if( equalsIgnoreCase(type, SNS.FACEBOOK.key) )
    //   return 0;
    // const snsInfo = await this.getProvidedFacebookInfo(certificationToken);
    // return this.unlinkFacebook(snsInfo);
    else
      throw BASIC_EXCEPTION.NOT_ALLOW_SNS;

  }

  getProvidedSnsInfo(certificationToken: CertificationToken): Promise<ProvidedSnsInfo> | ProvidedSnsInfo {
    if (!certificationToken)
      throw BASIC_EXCEPTION.NOT_FOUND_SNS_TOKEN;
    const { certificationType: type } = certificationToken;
    if (equalsIgnoreCase(type, 'GOOGLE' as SnsAuth))
      return this.getProvidedGoogleInfo(certificationToken);
    else if (equalsIgnoreCase(type, 'KAKAO' as SnsAuth))
      return this.getProvidedKakaoInfo(certificationToken);
    else if (equalsIgnoreCase(type, 'NAVER' as SnsAuth))
      return this.getProvidedNaverInfo(certificationToken);
    else if (equalsIgnoreCase(type, 'FACEBOOK' as SnsAuth))
      return this.getProvidedFacebookInfo(certificationToken);
    else if (equalsIgnoreCase(type, 'APPLE' as SnsAuth))
      return this.getProvidedAppleInfo(certificationToken);
    else
      throw BASIC_EXCEPTION.NOT_ALLOW_SNS;

  }

  getAppleToken(appleRes: Record<string, string>): Promise<CertificationToken> {
    appleRes = pick(appleRes, ['code']);
    if (!appleRes)
      throw BASIC_EXCEPTION.NOT_ALLOW_BODY;
    const { code } = appleRes;
    const client_id = process.env.APPLE_CLIENT_ID;
    const privateKey = fs.readFileSync(`${process.env.PROJECT_PATH}/resource/private/ios/AuthKey_5W2262JB5V.p8`, { encoding: 'utf-8' });
    const timeNow = Math.floor(Date.now() / 1000);
    const headers = {
      kid: process.env.APPLE_KEY_ID,
      alg: "ES256"
    }
    const claims = {
      iss: process.env.APPLE_TEAM_ID,
      aud: process.env.APPLE_API_URL,
      sub: client_id,
      iat: timeNow,
      exp: timeNow + 15777000
    }
    const client_secret = sign(claims, privateKey, {
      algorithm: 'ES256',
      header: headers,
      //  expiresIn: '24h'
    });

    const grant_type = `authorization_code`;  // 'authorization_code'
    const reqUrl = `${process.env.APPLE_API_URL}/auth/token`;
    const params = { code, client_id, client_secret, grant_type }
    const query = toQuery(params)
    return MyAxios.post(reqUrl, query, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      }
    })
      .then(res => {
        const rst = defSuccess(res);
        if( rst.result === 'no_content' )
          throw BASIC_EXCEPTION.NOT_ALLOW_EMPTY_ON_PROCESS; 

        const { data } = rst;
        const cur = new Date();
        return new CertificationToken(
          'APPLE' as  SnsAuth
          , data.access_token
          , data.refresh_token
          , cur
          , undefined
          , undefined
          , undefined
          , data.id_token
          // , credential.idToken
        );
          
        
      }).catch( err => {
        if( err instanceof BasicException)
          throw err;
        const { status, data } = defError<AppleErrorResponse>(err);
        const exp = BASIC_EXCEPTION.ERROR_SNS_PROCESS
        const message = `[${data.error}] ${exp.message} \r\nBy APPLE`;
        const logMessage = `[APPLE-getToken] ${data.error}\r\n${err.stack}`;
        throw new BasicException({ code: status, message }, { saveLog: true, logMessage })
      });
  }

  getProvidedAppleInfo(certificationToken: CertificationToken | SignInWithIdpDto): ProvidedSnsInfo {

    if (!certificationToken)
      throw BASIC_EXCEPTION.NOT_FOUND_SNS_TOKEN;

    const accessToken = 'access_token' in certificationToken
      ? certificationToken.access_token
      : certificationToken.accessToken

    
    const idToken = 'data' in certificationToken
      ? certificationToken.data
      : undefined
    if(!idToken)
      throw BASIC_EXCEPTION.APPLE_DATA_NOT_FOUND;
    const parts = idToken.split('.')
    try {
      const userData = JSON.parse(Buffer.from(parts[1], 'base64').toString('ascii'));

      return {
        accessToken,
        created: new Date().getTime(),
        uk: userData.sub,
        type: 'APPLE' as  SnsAuth,
        imgs: [],
        name: ""
      }
    } catch (e) {
      if(e instanceof BasicException)
        throw e;
      else{
        const message = `[APPLE Error] server process error\r\nBy Apple`;
        const logMessage = `${e.stack}`;
        throw new BasicException({ code: BASIC_EXCEPTION.ERROR_SNS_PROCESS.code, message }, { saveLog: true, logMessage })
      }
    }
  }


  /**google 개발자 콘솔(파이어베이스 X)
   * 
   * @param googleRes 
   * @returns 
   */
  getGoogleToken(googleRes: Record<string, string>): Promise<CertificationToken> {
    googleRes = pick(googleRes, ['code', 'scope', 'authuser', 'prompt','isAdmin']);
    if (!googleRes)
      throw BASIC_EXCEPTION.NOT_ALLOW_BODY;

    const { code } = googleRes;
    const client_id = `${process.env.GOOGLE_CLIENT_ID}`;
    const client_secret = `${process.env.GOOGLE_CLIENT_SECRET}`;
    const grant_type = `authorization_code`;  // 'authorization_code'
    const redirect_uri = googleRes.isAdmin !== 'false' ? `${process.env.CUSTOM_REDIRECT_GOOGLE}` : `${process.env.GOOGLE_REDIRECT_URL}`;

    const reqUrl = `${process.env.GOOGLE_AUTH_URL}/oauth2/v4/token` // 'https://www.googleapis.com'

    const params = {
      code, client_id, client_secret, redirect_uri, grant_type
    }

    return MyAxios.post(reqUrl, params)
      .then(res => {
        const rst = defSuccess(res);
        if( rst.result === 'no_content' )
          throw BASIC_EXCEPTION.NOT_ALLOW_EMPTY_ON_PROCESS;

        const cur = new Date();
        const { data } = rst;
        return new CertificationToken(
          'GOOGLE' as SnsAuth
          , data.access_token
          , data.refresh_token
          , cur
          , undefined
          , undefined
          // , credential.idToken
          , undefined
          , googleRes.isAdmin
        );

      }).catch((err) => {
        if( err instanceof BasicException)
          throw err;
        const { status, data } = defError<GoogleErrorResponse>(err);
        const message = `[${data.error_description}] \r\nBy Google`;
        const logMessage = `[GOOGLE-getToken-${data.error}] ${data.error_description}\r\n${err.stack}`;
        throw new BasicException({ code: status, message }, { saveLog: true, logMessage })
      });
  }
  getProvidedGoogleInfo(certificationToken: CertificationToken | SignInWithIdpDto): Promise<ProvidedSnsInfo> {
    if (!certificationToken)
      throw BASIC_EXCEPTION.NOT_FOUND_SNS_TOKEN;
    let postBody;
    let token;
    if ('access_token' in certificationToken) {
      token = certificationToken.access_token;
      postBody = `access_token=${token}&providerId=google.com`
    } else if ('idToken' in certificationToken) {
      token = certificationToken.idToken;
      postBody = `id_token=${token}&providerId=google.com`
    } else
      throw BASIC_EXCEPTION.NOT_FOUND_SNS_TOKEN;

    // const {access_token} = certificationToken;

    const body = {
      // postBody: `access_token=${access_token}&providerId=google.com`,
      postBody,
      requestUri: ('data' in certificationToken && certificationToken.data) || ('isAdmin' in certificationToken && certificationToken.isAdmin)  !== 'false' ? `${process.env.CUSTOM_REDIRECT_GOOGLE}` : `${process.env.GOOGLE_REDIRECT_URL}`,
      returnIdpCredential: true,
      returnSecureToken: true
    }

    return MyAxios.post(
      `${process.env.GOOGLE_API_URL}/v1/accounts:signInWithIdp`,    // 'https://identitytoolkit.googleapis.com'
      body, { params: { key: `${process.env.GOOGLE_API_KEY}` } }        // 구글 클라우드 개발자 플랫폼-사용자 인증 정보-API 키
    ).then(res => {
      const rst = defSuccess<GoogleUserResponse>(res);
      if( rst.result === 'no_content' )
        throw BASIC_EXCEPTION.NOT_ALLOW_EMPTY_ON_PROCESS;

      const { data } = rst;
      const { rawUserInfo: raw, email, federatedId } = data;
      const { id, picture }: GoogleRawUserInfo = JSON.parse(raw);
      // return null;
      return {
        accessToken: maxText(token, 512),
        created: new Date().getTime(),
        uk: (id || federatedId.substring(federatedId.lastIndexOf('/') + 1)) + '',
        // type: certificationToken.certificationType,
        type: 'GOOGLE' as SnsAuth,
        imgs: [picture],
        email
      }

    }).catch(err => {
      if( err instanceof BasicException)
        throw err;
      const { status, data } = defError<{ error: { code: number, message: string, status: string, errors: Array<any> } }>(err);
      const { code, message: googleMsg } = data.error;
      const message = `[${code}] ${googleMsg}\r\nBy Google`;
      const logMessage = `[GOOGLE-UserInfo-${code}] ${googleMsg}\r\n${JSON.stringify(data.error.errors)}\r\n${err.stack}`;
      throw new BasicException({ code: status, message }, { saveLog: true, logMessage })
    })
  }

  getKakaoToken(kakaoRes: Record<string, string>): Promise<CertificationToken> {
    kakaoRes = pick(kakaoRes, ['code', 'isAdmin']);
    if (!kakaoRes)
      throw BASIC_EXCEPTION.NOT_ALLOW_BODY;

    const { code } = kakaoRes;
    // secret키는 내어플리케이션->보안->활성화를 한 경우 필수
    const client_secret = `${process.env.KAKAO_CLIENT_SECRET}`;
    const client_id = `${process.env.KAKAO_REST_API_KEY}`;
    const grant_type = `authorization_code`;       // 'authorization_code'
    const redirect_uri = kakaoRes.isAdmin !== 'false' ? `${process.env.CUSTOM_REDIRECT_KAKAO}` : `${process.env.KAKAO_REDIRECT_URL}`;
    const reqUrl = `${process.env.KAKAO_AUTH_URL}/oauth/token`; // 'https://kauth.kakao.com'
    const params = {
      code, client_secret,
      client_id,
      redirect_uri, grant_type
    }
    const headers = { 'content-type': 'application/x-www-form-urlencoded;charset=utf-8' }

    return MyAxios.post(
      reqUrl, toQuery(params), { headers }
    ).then(res => {
      const rst = defSuccess(res);
      
      if( rst.result === 'no_content' )
        throw BASIC_EXCEPTION.NOT_ALLOW_EMPTY_ON_PROCESS;
      const { data } = rst;
      const cur = new Date();
      return new CertificationToken(
        'KAKAO' as SnsAuth
        , data.access_token
        , data.refresh_token
        , cur
        , new Date(cur.getTime() + (data.expires_in * 1000))
        , data.token_type
        , data.scope
      );
      
    }).catch( err => {
      if( err instanceof BasicException)
        throw err;
      const errRes = defError<KakaoErrorResponse>(err);
      const { error, error_code, error_description } = errRes.data;
      const message = `[${error_code}] ${error}\r\nBy Kakao`;
      const logMessage = `[KAKAO-getToken-${error_code}] ${error_description} \r\n${error}\r\n${err.stack}`;
      throw new BasicException({ code: errRes.status, message }, { saveLog: true, logMessage })
    })
  }

  unlinkKakao(accessToken: string): Promise<number> {
    if (!accessToken)
      throw BASIC_EXCEPTION.NOT_ALLOW_BODY;

    const reqUrl = `${process.env.KAKAO_API_URL}/v1/user/unlink`;      // 'https://kapi.kakao.com'
    const headers = { 'Authorization': `Bearer ${accessToken}` }
    return MyAxios
      .post(reqUrl, undefined, { headers })
      .then(() => {
        // const {data} = defSuccess<{id: number}>(res);
        return 1
      }).catch( err => {
        const errRes = defError<{ code: number, msg: string }>(err);

        // ip mismatched! callerIp=121.142.70.205. check out registered ips. -> 카카오 디벨로퍼 > 고급 설정 -> 허용 IP 주소

        const { code, msg } = errRes.data;
        const message = `[${code}] ${msg}\r\nBy Kakao`;
        const logMessage = `[KAKAO-unlink-${code}] ${msg}\r\n${err.stack}`;
        throw new BasicException({ code: errRes.status, message }, { saveLog: true, logMessage })
      })

  }

  getProvidedKakaoInfo(certificationToken: CertificationToken): Promise<ProvidedSnsInfo> {
    if (!certificationToken)
      throw BASIC_EXCEPTION.NOT_FOUND_SNS_TOKEN;
    const { token_type, access_token } = certificationToken;
    const headers = { Authorization: `${token_type} ${access_token}` }  // 'Bearer ${accessToken}' 
    return MyAxios.get(
      `${process.env.KAKAO_API_URL}/v2/user/me`,                        // 'https://kapi.kakao.com'
      { headers,params:{property_keys:["kakao_account.name","kakao_account.nickname","kakao_account.email"]} }
    ).then(res => {
      const rst = defSuccess<KakaoUserResponse>(res)
      if( rst.result === 'no_content' )
        throw BASIC_EXCEPTION.NOT_ALLOW_EMPTY_ON_PROCESS;

      const { data } = rst;
      const { id, properties,kakao_account } = data;
      const { profile_image, nickname} = properties || {};
      const { name,email } = kakao_account || {};
      // const {email, profile} = kakao_account;
      console.log(data)
      return {
        accessToken: maxText(access_token, 512),
        created: new Date().getTime(),
        uk: id + '',name,email,
        type: certificationToken.certificationType,
        imgs: profile_image ? [profile_image] : [],
        nickname,
      };
    }).catch(err => {
      if( err instanceof BasicException)
        throw err;
      const { status, data } = defError<{ code: number, msg: string }>(err);
      const { code, msg } = data;
      const message = `[${code}] ${code}\r\nBy Kakao`;
      const logMessage = `[KAKAO-UserInfo-${code}] ${msg} \r\n${err.stack}`;
      throw new BasicException({ code: status, message }, { saveLog: true, logMessage })
    })
  }



  // {
  //   error: 'invalid_request',
  //   error_description: 'no valid data in session'
  // }
  getNaverToken(naverRes: Record<string, string>): Promise<CertificationToken> {
    naverRes = pick(naverRes, ['code', 'state']);
    if (!naverRes)
      throw BASIC_EXCEPTION.NOT_ALLOW_BODY;

    const { code, state } = naverRes;
    const client_id = `${process.env.NAVER_CLIENT_ID}`;
    const client_secret = `${process.env.NAVER_CLIENT_SECRET}`;
    const grant_type = `authorization_code`;         // 'authorization_code'
    const reqUrl = `${process.env.NAVER_AUTH_URL}/oauth2.0/token` // 'https://nid.naver.com'
    const params = {
      code, state,
      client_id, client_secret,
      grant_type
    }
    return MyAxios.get(
      reqUrl,
      { params }
    ).then(res => {
      const rst = defSuccess(res);

      if( rst.result === 'success' ){
        const { data } = rst;
        const cur = new Date();
        const errorRes = pick(data, ['error', 'error_description'])
        if (errorRes)
          throw new BasicException({ code: 400, message: `[${errorRes.error}] ${errorRes.error_description}` })

        return new CertificationToken(
          'NAVER' as SnsAuth
          , data.access_token
          , data.refresh_token
          , cur
          , new Date(cur.getTime() + (data.expires_in * 1000))
          , data.token_type
        )
      }else
        throw BASIC_EXCEPTION.NOT_ALLOW_EMPTY_ON_PROCESS;
      
    }).catch((err: AxiosError) => {
      const { data, status } = defError(err);
      const message = `${err.message} By Naver`;
      const logMessage = data ? `[NAVER-getToken] ${JSON.stringify(data)}\r\n${err.stack}` : `[NAVER-getToken]${err.stack}`;
      throw new BasicException({ code: status > 0 ? status : err.code as any, message }, { saveLog: true, logMessage })
    });
  }

  unlinkNaver(accessToken: string): Promise<number> {
    if (!accessToken)
      throw BASIC_EXCEPTION.NOT_ALLOW_BODY;

    const client_id = `${process.env.NAVER_CLIENT_ID}`;
    const client_secret = `${process.env.NAVER_CLIENT_SECRET}`;
    const grant_type = 'delete';
    const reqUrl = `${process.env.NAVER_AUTH_URL}/oauth2.0/token`
    const params = {
      service_provider: 'NAVER',
      client_id, client_secret,
      grant_type,
      access_token: accessToken
    }
    return MyAxios
      .get(reqUrl, { params })
      .then(res => {
        const rst = defSuccess(res);
        if( rst.result === 'success' ){
          const { data } = rst;
          const errorRes = pick(data, ['error', 'error_description'])
          if (errorRes)
            throw new BasicException({ code: 400, message: `[${errorRes.error}] ${errorRes.error_description}` })
  
          return 1
        } else
          throw BASIC_EXCEPTION.NOT_ALLOW_EMPTY_ON_PROCESS;
      }).catch((err: AxiosError) => {
        // const errRes = defError(err);
        // console.log(errRes);
        const { data, status } = defError(err);
        const message = `${err.message} By Naver`;
        const logMessage = data ? `[NAVER-unlink] ${JSON.stringify(data)}\r\n${err.stack}` : `[NAVER-unlink]${err.stack}`;
        throw new BasicException({ code: status > 0 ? status : err.code as any, message }, { saveLog: true, logMessage })
      })

  }

  getProvidedNaverInfo(certificationToken: CertificationToken): Promise<ProvidedSnsInfo> {
    if (!certificationToken)
      throw BASIC_EXCEPTION.NOT_FOUND_SNS_TOKEN;
    const { token_type, access_token } = certificationToken;
    const headers = { Authorization: `${token_type} ${access_token}` } // 'Bearer ${accessToken}' 

    return MyAxios.get(
      `${process.env.NAVER_API_URL}/v1/nid/me`,                 // 'https://openapi.naver.com'
      { headers }
    ).then(res => {
      const rst = defSuccess<NaverUserResponse>(res);
      if( rst.result === 'success' ){
        const { data } = rst;
        const { id, profile_image,email,mobile,gender, nickname, name } = data.response;
        return {
          accessToken: maxText(access_token, 512),
          created: new Date().getTime(),
          uk: id + '',
          type: certificationToken.certificationType,
          imgs: [profile_image],
          gender:gender==="M"?"male":"female",
          email,tel:mobile,
          nickname, name
        };

      }else
        throw BASIC_EXCEPTION.NOT_ALLOW_EMPTY_ON_PROCESS;
    }).catch(err => {
      const { status, data } = defError<{ resultcode: string, message: string }>(err);
      const { message: naverMessage, resultcode } = data;
      const message = `[${resultcode}] ${naverMessage}\r\nBy Naver`;
      const logMessage = `[NAVER-UserInfo-${resultcode}] ${naverMessage} \r\n${err.stack}`;
      throw new BasicException({ code: isNumberForm(resultcode) ? parseInt(resultcode, 10) : status, message }, { saveLog: true, logMessage })
    })
  }

  getFacebookToken(faceBookRes: Record<string, string>): Promise<CertificationToken> {
    faceBookRes = pick(faceBookRes, ['code']);
    if (!faceBookRes)
      throw BASIC_EXCEPTION.NOT_ALLOW_BODY;

    const { code, state } = faceBookRes;
    const client_id = `${process.env.FACEBOOK_APP_ID}`;
    const client_secret = `${process.env.FACEBOOK_SECRET_CODE}`;
    const redirect_uri = `${process.env.FACEBOOK_REDIRECT_URL}`;

    const reqUrl = `${process.env.FACEBOOK_API_URL}/v2.11/oauth/access_token` // 'https://graph.facebook.com'

    const params = {
      code, client_id, client_secret, redirect_uri, state
    }

    return MyAxios.get(reqUrl, { params })
      .then(res => {
        // console.log('성공', res);
        const rst = defSuccess<FacebookSuccessRes>(res);
        if( rst.result === 'no_content' )
          throw BASIC_EXCEPTION.NOT_ALLOW_EMPTY_ON_PROCESS;

        const { data } = rst;
        const cur = new Date();

        return new CertificationToken(
          'FACEBOOK' as SnsAuth
          , data.access_token
          , undefined
          , cur
          , new Date(cur.getTime() + (data.expires_in * 1000))
          , undefined
          // , credential.idToken
        );

      }).catch( err => {
        if( err instanceof BasicException)
          throw err;
        // console.log('실패', err);
        const { status, data } = defError<FaceBookErrorRes>(err);
        const { error } = data;
        const message = `[${error.message}] \r\nBy Facebook`;
        const logMessage = `[FACEBOOK-getToken-${error.code}] ${data.error.message}\r\n${err.stack}`;
        throw new BasicException({ code: status, message }, { saveLog: true, logMessage })
      });
  }


  getProvidedFacebookInfo(certificationToken: CertificationToken | SignInWithIdpDto): Promise<ProvidedSnsInfo> {
    if (!certificationToken)
      throw BASIC_EXCEPTION.NOT_FOUND_SNS_TOKEN;

    const access_token = 'access_token' in certificationToken
      ? certificationToken.access_token
      : certificationToken.accessToken

    // const {access_token} = certificationToken;
    const params = {
      access_token,
      // fields: 'id,name,email,last_name,first_name,about,birthday,photos,picture',
      fields: 'id,name,email,picture',
      transport: 'cors'
    }
    // const headers = { Authorization: `${token_type} ${access_token}` } // 'Bearer ${accessToken}' 

    return MyAxios.get(
      `${process.env.FACEBOOK_API_URL}/me`,   // 'https://graph.facebook.com'
      { params }
    ).then(res => {
      const rst = defSuccess(res);
      if( rst.result === 'no_content' )
        throw BASIC_EXCEPTION.NOT_ALLOW_EMPTY_ON_PROCESS;

      const { data } = rst;
      const picture = data?.data?.url;
      return {
        accessToken: maxText(access_token, 512),
        created: new Date().getTime(),
        uk: data.id,
        type: 'FACEBOOK' as SnsAuth,
        imgs: picture ? [picture] : [],
        name: data.name
      }

    }).catch(err => {
      if( err instanceof BasicException)
        throw err;
      const { status, data } = defError<FaceBookErrorRes>(err);
      // console.log('error!', data)
      const { error } = data;
      const message = `[${error.message}] \r\nBy Facebook`;
      const logMessage = `[FACEBOOK-UserInfo-${error.code}] ${data.error.message}\r\n${err.stack}`;
      throw new BasicException({ code: status, message }, { saveLog: true, logMessage })
    })
  }

  async unlinkFacebook(snsInfo: ProvidedSnsInfo): Promise<number> {
    if (!snsInfo)
      throw BASIC_EXCEPTION.NOT_FOUND_SNS_TOKEN;
    // const snsInfo = await this.getProvidedFacebookInfo(certificationToken);

    // const params = {
    //   access_token,
    //   // fields: 'id,name,email,last_name,first_name,about,birthday,photos,picture',
    //   fields: 'id,name,email,picture',
    //   transport: 'cors'
    // }
    // const headers = { Authorization: `${token_type} ${access_token}` } // 'Bearer ${accessToken}' 

    return MyAxios.delete(
      `${process.env.FACEBOOK_API_URL}/${snsInfo.uk}/permissions`,   // 'https://graph.facebook.com'
    ).then(_ => {
      // const { data } = defSuccess(res);

      // console.log('성공', data);
      return 1

    }).catch(err => {
      const { status, data } = defError<FaceBookErrorRes>(err);
      // console.log('error!', data)
      const { error } = data;
      const message = `[${error.message}] \r\nBy Facebook`;
      const logMessage = `[FACEBOOK-unlink-${error.code}] ${data.error.message}\r\n${err.stack}`;
      throw new BasicException({ code: status, message }, { saveLog: true, logMessage })
    })
  }
}