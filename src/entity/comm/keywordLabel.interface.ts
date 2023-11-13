import { SearchPage } from "src/util/entity/listPage";

export type SearchKeywordLabelDto = Partial<{
  uk: string;
  managerUk: string;
  keyword: string;
  type: string;
  color: string;
} & SearchPage>;