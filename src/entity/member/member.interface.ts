import { SearchPage } from "src/util/entity/listPage";
import { Role } from "../role/role.entity";

export type MemberType = 'User'|'Manager';

export type Member = {
  id: string;
  uk: string;
  nickname: string;
  roles: Array<Role>
  type: 'User' | 'Manager';
}

export type MemberSignInDto = {
  identity: string;
  password: string;
}

export type CountMemberDto = Partial<{
  identity: string;
  uk: string;
  nickname: string;
  role: string;
  email: string;
  tel: string;
  businessNumber: string;
  isManager: boolean;
  connectingInfo: string;
  isPatch: boolean;
}>
export const COUNT_MEMBER_KEYS: Array<keyof CountMemberDto> = [
  'identity', 'nickname', 'role', 
  'tel', 'email', 'businessNumber', 'isManager', 'connectingInfo', 'isPatch'
]

export type SearchManagerDto = Partial<
  {
    uk: string;
    identity: string;
    nickname: string;
    roles: Array<string>;
    snsType: string;
    snsUk: string;
    state: Array<number>;
    name: string;
    isVulnerable: number;
    tel: string;
    addressUk: string;
    searchAddresses?:Array<string>;
    parentAddressUk: string;  
  }
  & SearchPage
>
export type SearchUserDto = Partial<
  {
    uk: string;
    identity: string;
    nickname: string;
    roles: Array<string>;
    snsType: string;
    snsUk: string;
    state: Array<number>;
    name: string;
    isVulnerable: number;
    tel: string;
  } 
  & SearchPage
>

export type SearchEmailRoleTelDto = Partial<{
  role: string;
  email: string;
  tel: string;
}>;

export type WithdrawalMemberDto = Partial<{
  withdrawalReason: string;
}>;
