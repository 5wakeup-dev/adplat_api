import { MailerService } from "@nestjs-modules/mailer";
import { Injectable } from "@nestjs/common";
import { Notification, NotificationDto } from "src/entity/notification/notification.entity";
import { BasicException, BASIC_EXCEPTION } from "src/exception/basic.exception";
import { NotificationRepository } from "src/repository/notification/notification.repository";
import { isContainRoles, isSameAuth, NotificationMedia, NotificationState } from "src/util/entity.util";
import { BizmKakaoReq, BizmRes, BizmSmsReq, BIZM_KAKAO_REG, BIZM_SMS_REG, getTemplateData, MailerRes, TemplateData } from "src/util/notification.util";
import { getRepositories, TransactionHelper, TransactionHelperParam } from "src/util/typeorm.util";
import { Connection, Repository } from "typeorm";
import Handlebars from "handlebars";
import { NotificationError } from "src/entity/notification/notificationError.entity";
import { maxText } from "src/util/format.util";
import { deepClone, getPick, pick, splitToObject } from "src/util/index.util";
import { defSuccess, MyAxios } from "src/util/axios.util";
import { Manager } from "src/entity/member/manager.entity";
import { SearchNotificationDto } from "src/entity/notification/notification.interface";
import { ListPageRes } from "src/util/entity/listPage";
import PageInfo from "src/util/entity/PageInfo";
import { DEFAULT_ROLE } from "src/entity/role/role.interface";

const mediaVar = ['KAKAO', 'SMS', 'EMAIL'];
const kakaoMethod = ['BIZM-AT', 'BIZM-AI', 'BIZM-FT', 'BIZM-FI', 'BIZM-FW', 'KAKAO-FRN'];
const smsMethod = ['BIZM-S', 'BIZM-L'];
const emailMethod = ['SYSTEM'];

@Injectable()
export class NotificationsService {
  private emailLayout: TemplateData<{body: string; }>
  constructor(
    private connection: Connection,
    private mailerService: MailerService
  ) {
    getTemplateData('layout/email.layout').then(res => {
      this.emailLayout = res;
    })
  }

  async postNotification(
    dto: NotificationDto, auth: Manager,
    transaction: TransactionHelperParam = {connection: this.connection, entityManager: this.connection.manager}
    ): Promise<Notification> {
    if(!dto || !dto.templateId || !dto.template || !dto.media || !mediaVar.includes(dto.media) || !dto.method) {
      throw BASIC_EXCEPTION.NOT_ALLOW_EMPTY_ON_PROCESS;
    } else if(!auth) {
      throw BASIC_EXCEPTION.NOT_ALLOW_AUTH;
    }
    const media = dto.media;
    const method = dto.method;
    if(!((media === 'KAKAO' && kakaoMethod.includes(method)) || (media === 'SMS' && smsMethod.includes(method)) || (media === 'EMAIL' && emailMethod.includes(method)))) {
      throw BASIC_EXCEPTION.INCORRECT_MEDIA;
    }

    const {entityManager} = transaction;
    const repos = getRepositories({
      notification: NotificationRepository
    }, entityManager);

    return repos.notification.save(dto);
  }

  async getNotification(
    notificationUk: string
  ): Promise<Notification> {
    if( !notificationUk )
      throw BASIC_EXCEPTION.EMPTY_CONTENT;
    const notifi = await this.connection.getCustomRepository(NotificationRepository)
      .getOne(
        undefined, 
        ctx => ctx.searchQuery()
        .where(`${ctx.alias}.uk = :uk`, {uk: notificationUk})
      )
    if( !notifi )
      throw BASIC_EXCEPTION.EMPTY_CONTENT;
      
    return notifi;
  }

  async getNotificationListPage(
    search: SearchNotificationDto, auth: Manager
  ): Promise<ListPageRes<Notification>> {
    if(!auth) {
      throw BASIC_EXCEPTION.NOT_ALLOW_AUTH;
    }
    const isRoot = isContainRoles(auth, ['root'] as Array<DEFAULT_ROLE>);
    if(!isRoot) {
      search.managerUk = auth.uk
    }

    const repos = getRepositories({
      notification: NotificationRepository
    }, this.connection.manager);

    const {curPage, rowPerPage, pagePerBlock} = search;

    const totalRow: number = await repos.notification
      .searchQuery(search)
      .getCount();
    if(totalRow === 0) {
      throw BASIC_EXCEPTION.EMPTY_CONTENT;
    }

    const page: PageInfo = new PageInfo({curPage, rowPerPage, totalRow, pagePerBlock});

    const list = await repos.notification
      .searchQuery(search)
      .skip(page.startRow)
      .take(page.rowPerPage)
      .getMany();

    return {page, list};
  }
  

  /** [SendBizm] 송신중까지만 처리. 
  * 
  * @param notifications 
  * @param param1 
  * @returns 
  */
  @TransactionHelper({ paramIndex: 1, isolationLevel: 'READ UNCOMMITTED' })
  async sendBizm(
    notifications: Array<Notification>,
    { entityManager }: TransactionHelperParam = {connection: this.connection, entityManager: this.connection.manager}
  ): Promise<Array<PromiseSettledResult<Notification>>> {
    if( !notifications )
      return [];
    
    const { FAIL, PREPARATION, REQUEST, SENDING } = NotificationState;
    const repos = getRepositories({
      notification: NotificationRepository
    }, entityManager);

    const { request, notAllowMedia, notAllowState, tooLong} = notifications.reduce( (rst, notification, i) => {
      const {state, media, method} = notification;
      if( !(['KAKAO', 'SMS'] as NotificationMedia[]).includes(media as any)
        || ![ BIZM_KAKAO_REG, BIZM_SMS_REG ].some( reg => reg.test(method) )
      )
        rst.notAllowMedia.push( {index: i, notification, status: 'FAILED', reason: BASIC_EXCEPTION.INCORRECT_MEDIA} );
      else if( ![FAIL, PREPARATION, REQUEST].includes(state) )
        rst.notAllowState.push( {index: i, notification, status: 'FAILED', reason: BASIC_EXCEPTION.NOT_POSSIBLE_TO_SEND} );
      else if( isBizmSmsAndMessageTooLong(notification) )
        rst.tooLong.push( {index: i, notification, status: 'FAILED', reason: BASIC_EXCEPTION.CONTENT_IS_TOO_LONG} )
      else
        rst.request.push( {index: i, status: 'WAITING', notification} );
      return rst;
    }, {
      request: [], notAllowMedia: [], notAllowState: [], tooLong: []
    } as Record<'request'|'notAllowMedia'|'notAllowState'|'tooLong', Array<{index: number, notification: Notification, status: 'WAITING'|'SUCCESS'|'FAILED', reason?: any}>>)
    // console.log('[!!!!] MEDIA', notAllowMedia)
    // console.log('[!!!!] State', notAllowState)
    // console.log('[!!!!] REQEST', request)
    
    if(request.length > 0){
      const params = request.map( ({ notification }) => {
        const { templateId, content, key, title } = notification;
        const parseMethod = splitToObject(notification.method, ['company', 'messageOrSms_type']);
        const { messageOrSms_type } = parseMethod;
        notification.state = SENDING;
        let smsMsg = content;
        if(notification.buttons && notification.buttons.length > 0) { // 템플릿 상으로 버튼은 메시지 당 하나
          smsMsg += `\n\n${notification.buttons[0].title} : ${notification.buttons[0].link}`;
        }
        if( notification.method.match(BIZM_KAKAO_REG) ) {
          let buttonType = undefined;
          if(notification.buttons && notification.buttons.length > 0) {
            const targetButton = notification.buttons[0];
            if(
              (targetButton.androidScheme && targetButton.iosScheme)
              || (targetButton.androidScheme && targetButton.link)
              || (targetButton.iosScheme && targetButton.link)
            ) {
              buttonType = 'AL'; // 앱 링크
            } else {
              buttonType = 'WL' // 웹 링크
            }
          }
          return {
            message_type: messageOrSms_type,
            profile: process.env.BIZM_PROFILE,
            tmplId: templateId,
            msg: content,
            phn: key,
            //아래는 대체문자 설정
            smsKind: 'L',
            msgSms: smsMsg,
            smsSender: process.env.BIZM_SENDER_TEL,
            smsLmsTit: title,
            button1: buttonType !== undefined ? {name: notification.buttons[0].title, type: buttonType, url_mobile: notification.buttons[0].link, url_pc: notification.buttons[0].link, scheme_android: buttonType === 'AL' ? notification.buttons[0].androidScheme : undefined, scheme_ios: buttonType === 'AL' ? notification.buttons[0].iosScheme : undefined} : undefined
          } as BizmKakaoReq
        } else {
          return {
            smsOnly: 'Y',
            smsKind: messageOrSms_type,
            smsSender: process.env.BIZM_SENDER_TEL,
            profile: process.env.BIZM_PROFILE,
            smsLmsTit: messageOrSms_type === 'L' ? title : undefined,
            msgSms: content,
            phn: key,
          } as BizmSmsReq
        }
      })
      const headers = { userid: process.env.BIZM_USER };
      await repos.notification.save(
        request.map( ({notification}) => getPick(notification, ['id', 'state']) )
      )
      await MyAxios.post(
        `${process.env.BIZM_URL}/v2/sender/send`, params, { headers }  
      ).then( async res => {
        const def = defSuccess<Array<BizmRes>>(res);
        if( def.result === 'success' ){
          // console.log(def.data);
          const { data } = def;
          request.forEach( (item, i) => {
            const find = data[i];
            item.notification.sended_uk = find.data.msgid
            if( find.code === 'success' ){
              item.status = 'SUCCESS';
            }else{
              item.reason = find;
              item.status = 'FAILED';
            }
          })
          await repos.notification.save(
            request.map( ({notification}) => getPick(notification, ['id', 'sended_uk']) )
          )
        }else
          request.forEach( item => {
            item.reason = BASIC_EXCEPTION.EMPTY_CONTENT;
            item.status = 'FAILED';
          })
        
      }).catch( err => {
        request.forEach( item => {
          item.reason = err;
          item.status = 'FAILED';
        })
      })
    }
    return Promise.allSettled(
      notifications.map( ( notification, i) => {
        const predict = ({index}) => i === index;
        const find = request.find( predict )
          || notAllowMedia.find( predict )
          || notAllowState.find( predict )
          || tooLong.find( predict )
        ;
        return find.status === 'SUCCESS' 
          ? Promise.resolve(notification)
          : Promise.reject(find.reason)
      })
    )
  }

  /** [SendMail] 송신중까지만 처리. 
  * 
  * @param notifications 
  * @param param1 
  * @returns 
  */
  @TransactionHelper({ paramIndex: 1, isolationLevel: 'READ UNCOMMITTED' })
  async sendMails(
    notifications: Array<Notification>,
    { entityManager }: TransactionHelperParam = {connection: this.connection, entityManager: this.connection.manager}
  ): Promise<Array<PromiseSettledResult<Notification>>> {
    if( !notifications )
      return [];
    const { FAIL, PREPARATION, REQUEST, SENDING } = NotificationState;
    const repos = getRepositories({
      notification: NotificationRepository
    }, entityManager);

    return Promise.allSettled<Notification>(
      notifications.map( notification => {
        const { id, state, media, key, content, title } = notification;
        return new Promise<Notification>( (resolve, reject) => {
          // const cloneNoti = deepClone(notification);
          if( media !== 'EMAIL' as NotificationMedia )
            throw BASIC_EXCEPTION.INCORRECT_MEDIA;
          else if( ![FAIL, PREPARATION, REQUEST].includes(state) )
            throw BASIC_EXCEPTION.NOT_POSSIBLE_TO_SEND;
          else{
            repos.notification.save({id, state: SENDING})
            .then( async _ => {
              notification.state = SENDING;
              const html = Handlebars.compile(this.emailLayout.template)({ body: content })
              await this.mailerService.sendMail({
                to: key, subject: title, html,
              }).then( async (res: MailerRes) => {
                const success = res.accepted.find( acpt => acpt === key );
                if( success ){
                  notification.sended_uk = res.messageId
                  await repos.notification.save(getPick(notification, ['id', 'sended_uk']))
                  // await repos.notification.save({id, state: SENDED})
                  // notification.state = SENDED;
                  resolve(notification)
                }else
                  reject(res);
              })
  
            }).catch( err => reject(err) )
          }
        })
      })
    )
    
  }

  @TransactionHelper({ paramIndex: 1, isolationLevel: 'READ UNCOMMITTED' })
  async sendNotifications( 
    notifications: Array<Notification>,
    transaction: TransactionHelperParam = {connection: this.connection, entityManager: this.connection.manager}
  ): Promise<Array<Notification>> {
    if( !notifications || notifications.length === 0 )
      return notifications||[];

    const repos = getRepositories({
      notification: NotificationRepository,
      error: NotificationError
    }, transaction.entityManager);

    const { FAIL, PREPARATION, REQUEST } = NotificationState;

    const {email, bizm, incorrectState} = notifications.reduce( (rst, notification) => {
      const { media, state } = notification;
      // if( 제일 첫번째. 수신 거부 ){ /*  TODO document why this block is empty */  }
      if( ![FAIL, PREPARATION, REQUEST].includes(state) )
        rst.incorrectState.push(notification)
      else if( media === 'EMAIL' as NotificationMedia )
        rst.email.push(notification);
      else if( (['KAKAO', 'SMS'] as Array<NotificationMedia>).includes(media as any) )
        rst.bizm.push(notification);
      // else if( media === 'SMS' as NotificationMedia ){ /* TODO document why this block is empty */  }

      return rst;
    }, 
      { email: [], bizm: [], reject: [], incorrectState: [] } as 
      Record<'email'|'bizm'|'reject'|'incorrectState', Array<Notification>> 
    );

    // [...email]
    await Promise.all([
      onNotified( email, this.sendMails(email, transaction), repos ),
      onNotified( bizm, this.sendBizm(bizm, transaction), repos ),

      incorrectState.length > 0 
      ? repos.error.save(
          incorrectState.map( notification => {
            const exception = BASIC_EXCEPTION.NOT_POSSIBLE_TO_SEND;
            const {name, message} = exception;
            return {
              notification,
              errorTitle: exception.getTitle(),
              error: `[${name}] ${message}`
            }
          })
        )
      : null
    ]);

    // email.forEach( not => not.)

    return notifications;
  }

  async patchNotification(
    origin: Notification, dto: NotificationDto, auth: Manager,
    {entityManager}: TransactionHelperParam = {connection: this.connection, entityManager: this.connection.manager}
  ): Promise<Notification> {
    if(!origin || !dto) {
      throw BASIC_EXCEPTION.NOT_ALLOW_EMPTY_ON_PROCESS;
    }
    const isOwner = isSameAuth(origin?.manager, auth);
    if(!isOwner) {
      throw BASIC_EXCEPTION.NOT_ALLOW_AUTH;
    }
    const media = dto.media ? dto.media : origin.media;
    const method = dto.method ? dto.method : origin.method;
    if(!((media === 'KAKAO' && kakaoMethod.includes(method)) || (media === 'SMS' && smsMethod.includes(method)) || (media === 'EMAIL' && emailMethod.includes(method))) || !mediaVar.includes(media)) {
      throw BASIC_EXCEPTION.INCORRECT_MEDIA;
    }

    const repos = getRepositories({
      notification: NotificationRepository
    }, entityManager);

    const cloneOrigin = deepClone(origin);

    return repos.notification.save(dto)
      .then(entity =>
        Object.assign(cloneOrigin, entity)
      );
  }

}

const onNotified = async (
  notifications: Array<Notification>,
  requests: Promise<Array<PromiseSettledResult<Notification>>>,
  repos: {notification: NotificationRepository, error: Repository<NotificationError>}
): Promise<Array<Notification>> => {
  const { FAIL, SENDED } = NotificationState;

  return requests.then(
    async results => {
      const errores = results.reduce( (rst, promiseResult, i) => {
        if( promiseResult.status === 'rejected' )
          rst.push({ notification: notifications[i], reason: promiseResult.reason});
        
        return rst;
      }, [] as Array<{notification:Notification, reason: any}>);


      await Promise.all([
        repos.notification.save(
          results.map( (promiseResult, i) => {
            const find = notifications[i];
            const state = promiseResult.status === 'fulfilled' 
              ? SENDED 
              : FAIL;
            find.state = state;
            return {
              id: find.id,
              state
            }
          })
  
        ),
        repos.error.save(
          errores.map( ({notification, reason}) => {
            // console.log(notification, reason)
            const { errorTitle, error } = errorTitleAndError(reason);
            return {
              notification,
              errorTitle, error 
            } as NotificationError
          })
        )
        
      ])
    }

  ).then( () => notifications )
}

const errorTitleAndError = (
  reason: any
): Record<'error'|'errorTitle', string> => {
  if( reason instanceof BasicException ) {
    return {
      errorTitle: reason.getTitle(),
      error: reason.stack
    }
  }
  else if( reason instanceof Error ){
    const error: string = reason.stack || "통신 에러";
    let errorTitle: string;
    if( reason.message === 'No recipients defined' ){
      errorTitle = BASIC_EXCEPTION.INCORRECT_RECEIVER_ADDRESS.getTitle();
    } else if( reason.message.indexOf('Username and Password not accepted') > -1 ){
      errorTitle = BASIC_EXCEPTION.INCORRECT_SENDER_AUTH.getTitle();
    } else if( reason.message.indexOf('connect ECONNREFUSED') > -1 ){
      errorTitle = BASIC_EXCEPTION.REFUSED_DOMAIN.getTitle();
    }else if( reason.message === 'Connection timeout' ){
      errorTitle = BASIC_EXCEPTION.TIMEOUT.getTitle();
    } else
      errorTitle = maxText(`[${reason.name}] ${reason.message}`, 64) 

    return { errorTitle, error }
  } else if ( pick(reason, ['code', 'data', 'message']) ){
    const { message } = reason as BizmRes;
    let errorTitle: string;
    const error: string = JSON.stringify(reason) ;
    if( message === 'K104:TemplateNotFound' )
      errorTitle = BASIC_EXCEPTION.NOT_FOUND_TEMPLATE.getTitle();
    else if( message === 'E104:InvalidPhoneNumber' )
      errorTitle = BASIC_EXCEPTION.INCORRECT_RECEIVER_ADDRESS.getTitle();
    else if( message === 'K105:NoMatchedTemplate' )
      errorTitle = BASIC_EXCEPTION.NO_MATCHED_TEMPLATE.getTitle();
    else if( message === 'K109:NoMatchedTemplateTitleException' )
      errorTitle = BASIC_EXCEPTION.NO_MATCHED_TEMPLATE_TITLE.getTitle();
    else if( message === 'K108:NoMatchedTemplateButtonException' )
      errorTitle = BASIC_EXCEPTION.NO_MATCHED_TEMPLATE_BUTTON.getTitle();
    else if( message === '존재하지 않는 사용자 계정 또는 발신 프로필입니다.' )
      errorTitle = BASIC_EXCEPTION.NOT_FOUND_AUTH_OR_PROFILE.getTitle();
    else
      errorTitle = message;
    return {
      errorTitle,
      error
    }
  } else {
    return {
      errorTitle: BASIC_EXCEPTION.NOTIFICATION_FAIL.message,
      error: typeof reason === 'string' ? reason : JSON.stringify(reason)
    }
  }
  
}

const isBizmSmsAndMessageTooLong = ( notification: Notification ): boolean => {
  const { media, method, content } = notification;
  const parseMethod = splitToObject(method, ['company', 'messageType'])
  const { messageType } = parseMethod;
  const byteLength = Buffer.byteLength(content, 'utf-8');
  if( media !== 'SMS' as NotificationMedia )
    return false;
  else if( !BIZM_SMS_REG.test(method) )
    return false;
  else if( 
    messageType === 'S' && byteLength > 90 
    || messageType === 'L' && byteLength > 2000 
  )
    return true;
  else
    return false;
}

// const repeat = (
//   notification: Array<Notification>, 
//   predict: (notification) => Promise<void>, 
//   rowPerPage: number = 100
// ) => {

// }