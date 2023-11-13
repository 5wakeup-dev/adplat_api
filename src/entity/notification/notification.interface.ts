import { SearchPage } from "src/util/entity/listPage";

export type SearchNotificationDto = Partial<{
  uk: string;
  uks: Array<string>;
  state: Array<number>;
  managerUk: string;
  receiverManagerUk: string;
  receiverUserUk: string;
  receiverContractorUk: string;
  creator: string;
  type: string;
  media: string;
  reserve_date: Date;
} & SearchPage>;