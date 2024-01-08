import { SearchPage } from "src/util/entity/listPage";
import { Artwork } from "../artwork/artwork.entity";
import { Consulting } from "../consulting/consulting.entity";
import { Manager } from "../member/manager.entity";
import { User } from "../member/user.entity";
import { Reply } from "../reply/reply.entity";



// export interface SearchPositivePoint extends SearchNegativePoint{
//   // memberUk?: string;
//   isRemaining?: boolean;
//   // title?: string;
// }

export type SearchPositivePoint = Partial<{
  isRemaining?: boolean;
}> & SearchNegativePoint


export type SearchNegativePoint = Partial<
  {
    ids: Array<number>;
    memberUk: string;
    title: string;
  }
  & SearchPage
>
// export interface SearchNegativePoint extends Page{
//   memberUk?: string;
//   title?: string;
// }
export type PositivePointType = 'CREATE-USER'
  | 'CREATE-MANAGER'
  | 'CANCEL-ORDER'
  | 'CREATE-ORDER_DELIVERY'
  | 'ACCESS-USER'
  | 'ACCESS-MANAGER'
  | 'CREATE-ARTWORK'
  | 'CREATE-CONSULTING'
  | 'CREATE-REPLY'
  | 'CREATE-REVIEW';
export type PositivePointRelationForm = CreateUser
  | CreateManager
  | AccessUser
  | AccessManager
  | CreateArtwork
  | CreateConsulting
  | CreateReply

export type NegativePointType = 'CREATE-ORDER'
  | 'CANCEL-ORDER_DELIVERY'
  | 'DELETE-REVIEW';
export type NegativePointRelationForm = {}

export type CreateUser = {
  type: 'CREATE-USER';
  user: User
}
export type CreateManager = {
  type: 'CREATE-MANAGER';
  manager: Manager;
}


export type AccessUser = {
  type: 'ACCESS-USER';
  user: User;
}
export type AccessManager = {
  type: 'ACCESS-MANAGER';
  manager: Manager;
}

export type CreateArtwork = {
  type: 'CREATE-ARTWORK';
  artwork: Artwork;
}
export type CreateConsulting = {
  type: 'CREATE-CONSULTING';
  consulting: Consulting;
}
export type CreateReply = {
  type: 'CREATE-REPLY';
  reply: Reply;
}
