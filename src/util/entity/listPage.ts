import PageInfo from "src/util/entity/PageInfo";

export interface ListPageRes <T>{
  page: PageInfo,
  list: Array<T>
} 

export type SearchPage = Partial<{
  curPage: number;
  rowPerPage: number;
  orderBy: string;
  pagePerBlock: number;
  secondOrderBy: string;
}>

export type OrderBy = {
  column: string,
  order: string
}