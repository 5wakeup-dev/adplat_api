import { Range } from "src/type/index.type";
import { SearchPage } from "src/util/entity/listPage";

export type SearchNoteDto = Partial<{
  uk: string;
  managerUk: string;
  content: string;
  type: string;
  existPeriod: boolean;
  range: Range<Date>;
  label: string;
  keyword: string;
} & SearchPage>;