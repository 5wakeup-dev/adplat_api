import { HierarchicalBranchType } from "../comm/comm.interface";




export type SearchMenuDto = Partial<{
  absoluteKey: string;
  absoluteKeys: Array<string>;
  // likeAbsoluteKey: string;
  branchType: HierarchicalBranchType;
  metaKey: string;
  metaVal: string;
  self: boolean;
  groupId: string;
}>

// export type BbsMethodAuthority = 'POST-NEW'/**새 글 작성 */ 
//   | 'POST-BRANCH-OWNER'/**내 글에 답글 작성 */ 
//   | 'POST-BRANCH_DIRECT-OTHERS'/**내 글의 직속 자식 글에 답글 작성 */ 
//   | 'POST-BRANCH_DEEP-OTHERS'/**내 글의 자식 글에 답글 작성 */
//   | 'POST-BRANCH_GROUP-OTHERS'/**내 글이 해당 그룹에 속해있는 글에 답글 작성 */
//   | 'POST-BRANCH_TARGET-OTHERS'/**나를 지목한 글에 대한 답글. Artwork 미지원*/

//   | 'GET-OWNER'/**본인 글 읽기 */ | 'GET-NEW-OTHERS'/**남의 루트 글 읽기 */ | 'GET-LIST'/**리스트 읽기 */
//   | 'GET-BRANCH-DIRECT'/**내 직속 답변 읽기 */ | 'GET-BRANCH-DEEP'/**내 글에서부터 시작한 답변 읽기 */
//   | 'PATCH-OWNER'/**본인 것 수정 */ | 'DELETE-OWNER' /**본인 것 삭제 */ 
// ;

export type BbsMethodAuthority = 'CREATE:ROOT'/**새 글 작성 */
  | 'CREATE_BRANCH-OWNERS'/**[답글] 내가 작성한 개체 */
  | 'CREATE_BRANCH-ALL'/**[답글] 모든 개체 */
  | 'CREATE_BRANCH-POINT'/**[답글] 타겟이 나를 가르킨 개체 */
  | 'CREATE_BRANCH-GROUP_UP_DIRECT'/**[답글] 타겟의 직속 상위 개체가 내 것 */
  | 'CREATE_BRANCH-GROUP_UP_DEEP'/**[답글] 타겟의 상위 개체가 내것  */
  // | 'POST_BRANCH-OTHERS'
  // | 'POST_BRANCH-OTHERS-GROUP_DOWN_DEEP'/**내 글의 하위 그룹에 속해 있는 경우 답글 작성 */
  // | 'POST_BRANCH-OTHERS-GROUP_DOWN_DIRECT'/**내 글의 하위 직속 그룹에 속해 있는 경우 답글 작성 */
  // | 'POST_BRANCH-OTHERS-GROUP_UP_DEEP'/**내 글의 상위 그룹에 속이 있는 경우 답글 작성 */
  // | 'POST_BRANCH-OTHERS-GROUP_UP_DIRECT'/**내 글의 상위 직속 그룹에 속이 있는 경우 답글 작성 */

// export type FunctionAuthority = 'GROUP-POST-BRANCH' | 'DEEP-POST-BRANCH' | 'DIRECT-POST-BRANCH'
//   | 'GROUP-GET-ONE' | 'GROUP'