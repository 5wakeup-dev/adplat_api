import { Body, Controller, Get, Param, Post, Req } from "@nestjs/common";
import { setSnsProvided, SnsProvided } from "src/decorator/snsToken.decorator";
import { SnsService } from "src/service/sns.service";
import { ProvidedSnsInfo, SignInWithIdpDto, SnsAuth } from "src/util/entity.util";
import { Request } from 'express';


@Controller('sns')
export class SnsController {
  constructor(
    private snsService: SnsService
  ){}

  /**[CREATE] SNS 토큰 생성(세션에 저장됨)
  * 
  * @param type [google, kakao, naver, facebook]
  * @param body redirect된 SNS의 query 데이터를 그대로 넘길것
  * @returns 토큰 생성된 시각(long 타입)
  */
  @Post('/:type/token')
  postToken(
    @Param('type')
    type: string,
    @Body() body: Record<string, string>,
    @Req() req: Request
  ): Promise<number> {
    body.isAdmin = body.isAdmin || 'false';

    if( 'GOOGLE' as SnsAuth  === type.toUpperCase() && 'idToken' in body )
      return this.snsService.getProvidedGoogleInfo(body as SignInWithIdpDto) 
        .then(cert => {
          setSnsProvided( req, cert )
          return cert.created;
        })
    else if( 'FACEBOOK' as SnsAuth === type.toUpperCase() && 'accessToken' in body )
      return this.snsService.getProvidedFacebookInfo(body as SignInWithIdpDto) 
      .then(cert => {
        setSnsProvided( req, cert )
        return cert.created;
      })
    else
      return this.snsService.getToken(type, body)
        .then( async (certificationToken) => {
          // setSnsToken(this.req, certificationToken);
          const providedInfo = await this.snsService.getProvidedSnsInfo(certificationToken);
          setSnsProvided( req, providedInfo )
          return certificationToken.createdDate.getTime()
        });
  }

  /**[READ] SNS의 유저 허용 정보 가져오기
   * 
   * @param snsInfo 
   * @returns 
  */
  @Get('/provided')
  getProvidedInfo(
    @SnsProvided() snsInfo: ProvidedSnsInfo
  ): ProvidedSnsInfo {

    return snsInfo
  }
}