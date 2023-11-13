import { SearchPage } from "src/util/entity/listPage";


export type HierarchicalBranchType = 'deep'|'direct';
export type AroundType = 'all'|'root';
export type RequestAttachmentType = 'attachments'|'form-data';

export type SearchEnvironmentDto = Partial<{
  type: string;
  code: string;
  typeName: string;
  codeName: string;
} & SearchPage >

