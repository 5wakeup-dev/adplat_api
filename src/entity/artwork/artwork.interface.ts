import { Range } from "src/type/index.type";
import { SearchPage } from "src/util/entity/listPage";
import { AroundType, HierarchicalBranchType } from "../comm/comm.interface";


export type SearchArtworkDto =  Partial<{
  uk: string;
  uks: Array<string>;
  menuIds: Array<string>;
  root: boolean;
  parentUk: string;
  title: string;
  content: string;
  writer: string;
  managerUk: string;
  range: Range<Date>;
  state: Array<number>;
  propsKey:string;
  propsVal:string;
  keyword: string;
  ingEvent: Date;
  endEvent: Date;
  targetEnd:Date;
  rangeLongitude?: Range<number>; // 경도
  rangeLatitude?: Range<number>; // 위도
} & SearchPage>


export type SearchAroundArtworkDto = {
  type: AroundType;
  menuIds: Array<string>;
  id: string;
}

export type SearchArtworkBranchDto = Partial< {
  uk?: string;
  branchType?: HierarchicalBranchType;
  depth?: number;
} & SearchPage>