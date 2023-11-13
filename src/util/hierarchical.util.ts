import { isNumberForm, isUndeclared } from "./format.util";

export interface IHierarchical<T> {
  id: T;
  groupId: T;
  groupParent?: T;
  groupDepth: number;
  groupOrd: number;
  // getTargetId(): T;
}
// const hierarchicalUtil = {
//   sort: <T>(hierarchical: Array<IHierarchical<T>>) => sort(hierarchical)
// }
// export default hierarchicalUtil;

export const createBranchAndRefresh = <T>(
  allGroup: Array<IHierarchical<T>>, directRoot: IHierarchical<T>
): Partial<IHierarchical<T>> => {
  if( !allGroup || allGroup.length === 0 || !directRoot )
    return null;
  sort(allGroup);
  allGroup.forEach((h, index) => h.groupOrd = index+1);
  
  const directRootDeepBranch: Array<IHierarchical<T>> = findDeepBranch(allGroup, directRoot);
  directRoot = allGroup.find( ({id}) => id === directRoot.id)
  const ord = directRootDeepBranch.length === 0
    ? directRoot.groupOrd + 1
    : directRootDeepBranch[directRootDeepBranch.length-1].groupOrd + 1
  const result: IHierarchical<T> = {
    id: undefined,
    groupId: directRoot.groupId,
    groupParent: directRoot.id,
    groupDepth: directRoot.groupDepth + 1,
    groupOrd: ord
  }
  allGroup.filter( ({groupOrd}) => groupOrd >= ord)
  .forEach(h => {
    h.groupOrd += 1
  })
  allGroup.splice(ord-1, 0, result)
  return result;
}

export const sort = <T> (hierarchical: Array<IHierarchical<T>>): void => {
  if( !hierarchical || hierarchical.length === 0 )
    return;
  hierarchical.sort((a, b) => {
    
    if(isNumberForm(a.groupId) && isNumberForm(b.groupId)){
      const aGroupId = Number(a.groupId),
        bGroupId = Number(b.groupId);
      if( aGroupId === bGroupId )
        return a.groupOrd - b.groupOrd;
      else
        return bGroupId - aGroupId;
    }else{
      const aGroupId = String(a.groupId),
        bGroupId = String(b.groupId);
      if( aGroupId === bGroupId )
        return a.groupOrd - b.groupOrd;
      else
        if(aGroupId > bGroupId)
          return -1;
        else if(aGroupId < bGroupId)
          return 1;
        else
          return 0;
    }

  })
}

export const findDirectBranch = <T>(
  allGroup: Array<IHierarchical<T>>,
  target: IHierarchical<T>
) => {
  if( !target || !allGroup || allGroup.length === 0 )
    return []
  return allGroup.filter( ({groupParent}) => !isUndeclared(groupParent) && target.id === groupParent);
}

export const findDeepBranch = <T>(
  allGroup: Array<IHierarchical<T>>,
  target: IHierarchical<T>,
  result?: Array<IHierarchical<T>>
): Array<IHierarchical<T>> => {

  if( !result )
    result = [];

  findDirectBranch(allGroup, target).forEach( obj =>{
    result.push(obj)
    findDeepBranch(allGroup, obj, result)
  })

  return result;
}

export const findDirectRoot =<T>( 
  allGroup: Array<IHierarchical<T>>, target: IHierarchical<T> 
): IHierarchical<T> => {
  if( !target || !allGroup || allGroup.length === 0 || isUndeclared(target.groupParent) )
    return undefined;
  
  return allGroup.find( ({id}) => target.groupParent === id);
}

export const findDeepRoots = <T>(
  allGroup: Array<IHierarchical<T>>, target: IHierarchical<T> 
): Array<IHierarchical<T>> => {
  let before = target;
  const roots: Array<IHierarchical<T>> =[];

  while( !isUndeclared(before?.groupParent) ){
    before = findDirectRoot(allGroup, before);
    if( !before )
      return roots;
    else
      roots.push( before );
  }

  roots.sort( (a, b) => a.groupOrd - b.groupOrd);

  return roots;
}
// export type ContainsHierarchical<T> = {
//   hierarchical: IHierarchical<T>
// }
// export const createBranchAsBottomAndSort = <T>(
//   allGroups: Array<ContainsHierarchical<T>>, root: ContainsHierarchical<T>,
//   createContainsHierarchical: ContainsHierarchical<T>
// ): Partial<IHierarchical<T>> => {
//   if(allGroups == null || allGroups.length === 0 || root == null || !createContainsHierarchical) return null;
//   sort(allGroups);
//   allGroups.forEach(({hierarchical: h}, index) => h.groupOrd = index+1);
//   let hierarchical = createContainsHierarchical.hierarchical;
//   if(!hierarchical){ 
//     hierarchical = {} as IHierarchical<T>
//     createContainsHierarchical.hierarchical = hierarchical;
//   }

//   const rootH = root.hierarchical;
//   const rootDeepBranch: Array<ContainsHierarchical<T>> = findDeepBranch(allGroups, root);
//   const ord = rootDeepBranch.length === 0 
//                 ? rootH.groupOrd + 1 
//                 : rootDeepBranch[rootDeepBranch.length-1].hierarchical.groupOrd + 1

//   hierarchical.groupId = rootH.groupId;
//   hierarchical.groupParent = rootH.id;
//   hierarchical.groupDepth = rootH.groupDepth + 1;
//   hierarchical.groupOrd = ord;
//   allGroups
//     .filter(({hierarchical: h}) => h.groupOrd >= ord)
//     .forEach(({hierarchical: h}, index) => {
//       h.groupOrd = ord+1+index
//     })
//   allGroups.push(createContainsHierarchical);
//   sort(allGroups);

//   return hierarchical;
// }

// export const findGroup = <T, K extends ContainsHierarchical<T> = ContainsHierarchical<T>>(
//   allList: Array<K>,
//   groupId: T
// ): Array<K> => {
//   if(!allList || allList.length === 0) return [];

//   const allGroup: Array<K> = 
//     allList
//       .filter((containsHierarchical) => containsHierarchical && containsHierarchical.hierarchical)
//       .filter(({hierarchical}) => hierarchical.groupId === groupId)

//   return allGroup;
// }

// export const sort = <T, K extends ContainsHierarchical<T> = ContainsHierarchical<T>>(
//   hierarchicalList: Array<K>
// ): void => {
//   if(!hierarchicalList || hierarchicalList.length === 0) return;
//   hierarchicalList.sort(({hierarchical: a},{hierarchical: b}) => {
//     if(a.groupId === b.groupId){
//       return a.groupOrd - b.groupOrd;
//     }else{
//       if(a.groupId < b.groupId)
//         return 1;
//       else if(a.groupId > b.groupId)
//         return -1;
//       return 0;
//     } 
//   })
// }

// export const findDeepBranch = <T, K extends ContainsHierarchical<T> = ContainsHierarchical<T>>(
//   allGroups: Array<K>, root: K, result?: Array<K>
// ): Array<K> => {
//   if(!root || !allGroups || allGroups.length === 0) return [];

//   if(!result)
//     result = [];
//   // const result:Array<K> = []
//   findDirectBranch(allGroups, root).forEach((obj) => {
//     result.push(obj);
//     findDeepBranch(allGroups, obj, result)
//     // const deepBranch = findDirectBranch(allGroups, obj);
//     // deepBranch.forEach(branch => result.push(branch));
//   });

//   return result;
// }

// export const findDirectBranch = <T, K extends ContainsHierarchical<T> = ContainsHierarchical<T>>(
//   allGroups: Array<K>,
//   root: K
// ): Array<K> => {
//   if(!root || !allGroups || allGroups.length === 0) return [];
//   const directBranch:Array<K> = 
//     allGroups
//       .filter((containsHierarchical) => containsHierarchical)
//       .filter(({hierarchical}) => {
//         // console.log('반복', hierarchical)
//         return hierarchical.groupParent === root.hierarchical.id
//       });
//   return directBranch;
// }