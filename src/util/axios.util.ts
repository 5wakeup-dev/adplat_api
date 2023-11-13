import Axios, { AxiosRequestConfig } from 'axios';
import type {AxiosResponse, AxiosError } from 'axios';

export enum ContentType {
  // MULTIPART= 'multipart/form-data; boundary=----WebKitFormBoundary7MA4YWxkTrZu0gW',
  MULTIPART= 'multipart/form-data',
  JSON= 'application/json'
}

Axios.defaults.headers.post['Content-Type'] = ContentType.JSON;
Axios.defaults.headers.put['Content-Type'] = ContentType.JSON;
Axios.defaults.headers.patch['Content-Type'] = ContentType.JSON;
Axios.defaults.headers.delete['Content-Type'] = ContentType.JSON;
Axios.defaults.timeout = 5000;
// Axios.defaults.baseURL = process.env.NEXT_PUBLIC_API_URL;

Axios.defaults.withCredentials = true
const GET_TIMEOUT:number = 3500;
export const AxiosResult = {
  SUCCESS: 'success',
  NO_CONTENT: 'no_content',
  FAILED: 'failed'
} as const;

// const SUCCESS = 'success' as const;
// const NO_CONTENT = 'no_content' as const;
// const FAILED = 'failed' as const;
export type DefSuccess<T> = {
  result: typeof AxiosResult.SUCCESS;
  success: true,
  status: number;
  data: T;
}
// export type DefSuccess204 = {
//   result: typeof AxiosResult.NO_CONTENT
//   success: true;
//   status: 204;
// }
export type DefSuccess204<T> = {
  result: typeof AxiosResult.NO_CONTENT
  success: true;
  status: 204;
  data?: T;
}
export type ErrorEntity = {
  code: number;
  message: string;
  timestamp: string;
  method: string;
}
export type DefError<T> = {
  result: typeof AxiosResult.FAILED;
  success: false;
  status: number;
  data: T;
  err?: any
}

export const defSuccess = <T=any>(res:AxiosResponse<T>): DefSuccess<T>|DefSuccess204<T> => {
  const { status, data } = res;
  if( status === 204 )
    return {
      result: AxiosResult.NO_CONTENT,
      success: true,
      status, data
    }
  else
    return {
      result: AxiosResult.SUCCESS,
      success: true,
      status, data
    }
}

export const defError = <T = ErrorEntity>(err:AxiosError<T>): DefError<T> =>{
  if( err.response ){
    const { status, data } = err.response;
    return {
      result: AxiosResult.FAILED,
      success: false,
      status,
      data
    }
  }else
    return { 
      result: AxiosResult.FAILED,
      success: false,
      status: 500,
      data: null,
      
    }
  

}
export const MyAxios = Axios;


// export const MyAxios = () => {
  
//   return {
//     ...Axios,
//     get: (url: string, config?: AxiosRequestConfig) => 
//       Axios.get(url, {
//         timeout: GET_TIMEOUT,
//         ...config
//       })
//     ,
//     multipart: (url: string, data?: any, config?: AxiosRequestConfig) =>{
//       const headers = config?.headers || {}; 
      
//       return Axios.post(url, data, {
//         ...config,
//         headers: {
//           ...headers,
//           'content-type': ContentType.MULTIPART
//         }
//       })
//     }
//   }
// }
// export interface DefSuccess<T> extends ResultType<undefined>{
//   status: number;
//   data: T;
//   success: true;
//   // err: undefined;
// }

// type BasicError = {code:number, message: string}
// export interface DefError<T> extends ResultType<AxiosError>{
//   status: number;
//   data: T ;
//   success: false;
//   // err: AxiosError  ;
// }