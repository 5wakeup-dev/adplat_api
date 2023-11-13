import { SearchPage } from "src/util/entity/listPage";

export type SearchConsultingDto = Partial<{
  uk: string;
  parentUk: string;
  menuIds: Array<string>;
  title: string;
  content: string;
  writer: string;
  receiveUk: string;
  orReceiveUk: string;
  productUk: string;
  searchKey: string;
  searchVal: string;
  root: boolean;
  userUk: string;
  managerUk: string;
  blockMember?: boolean;
  blockConsultings?: Array<string>;
} & SearchPage>;

export type SearchConsultingBranchDto = Partial<{
  uk?: string;
  branchType?: string;
  depth?: number;
} & SearchPage>;

export type SearchAroundConsultingDto = {
  type: string;
  menuIds: Array<string>;
  id: string;
}