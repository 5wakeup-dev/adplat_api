import { SearchPage } from "src/util/entity/listPage";


export type SearchReplyDto = Partial<{
  uk: string;
  uks: Array<string>;
  consultingUk: string;
  artworkUk: string;
  depth: Array<number>;
  parent: string;
  managerUk: string;
  userUk: string;
  blockMember?: boolean;
  blockReplies?: Array<string>;
} & SearchPage>