import { Range } from "src/type/index.type";
import { SearchPage } from "src/util/entity/listPage";


export type SearchProductDto =  Partial<{
  uk: string;
  uks: Array<string>;
  menuIds: Array<string>;
  address:string;
  title: string;
  content: string;
  managerUk: string;
  userUk: string;
  range: Range<Date>;
  state: Array<number>;
  company:string;
  theme: string;
  targetEnd:Date;
} & SearchPage>


