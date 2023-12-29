import { TABLE_ALIAS } from "src/config/typeorm.config";
import { Manager } from "src/entity/member/manager.entity";
import { ManagerHistory } from "src/entity/member/managerHistories.entity";
import { CountMemberDto, COUNT_MEMBER_KEYS, SearchEmailRoleTelDto, SearchManagerDto } from "src/entity/member/member.interface";
import { MemberBasic } from "src/entity/member/memberBasic.entity";
import { MemberSns } from "src/entity/member/memberSns.entity";
import { Role } from "src/entity/role/role.entity";
import { DEFAULT_ROLE } from "src/entity/role/role.interface";
import { getProject } from "src/singleton/project.singleton";
import { ENTITY_CONSTANTS, isContainRoles, isSameAuth } from "src/util/entity.util";
import { hideTextExclude } from "src/util/format.util";
import { deepClone } from "src/util/index.util";
import { setReflectProperty } from "src/util/reflect.util";
import { aesEnc } from "src/util/secret.util";
import { ChainRelation, ChainRepository, PathString, SaveSubscriber, SetPropertyEvent } from "src/util/typeorm.util";
import { EntityRepository, SelectQueryBuilder } from "typeorm";
import { MemberBasicRepository } from "./basic.repository";
import { Store } from "src/entity/member/store.entity";
import { StoreRepository } from "./store.repository";



const {
  MANAGERS,
  MANAGER_HISTORIES,
  ROLES,
  MEMBER_SNS,
  MEMBER_BASICS
} = TABLE_ALIAS;


@EntityRepository(Manager)
export class ManagerRepository extends ChainRepository<Manager> {
  public primaryKeys: Array<keyof Manager> = ['id'];
  public alias: string = MANAGERS;
  public relationChain: ChainRelation<Manager> = {
    roles: {
      Entity: Role, fieldIsMany: true,
      getBridges: ({ selfEntities }) =>
        this.searchQuery()
        .select(`${this.alias}.id AS self`)
        .addSelect(`${ROLES}.id AS inverse`)
        .leftJoinAndSelect(`${this.alias}.roles`, ROLES)
        .where(`${this.alias}.id IN (:ids)`, {ids: selfEntities.map(({id}) => id)})
        .getRawMany()
        .then(result => result.map(({self, inverse}) => ({self: {id: self}, inverse: {id: inverse}})))
      ,
      getDatas: async () => deepClone( getProject().ROLES )
    },
    sns: {
      Entity: MemberSns, fieldIsMany: true,
      getBridges: ({ selfEntities }) =>
        this.searchQuery()
        .select(`${this.alias}.id AS self`)
        .addSelect(`${MEMBER_SNS}.id AS inverse`)
        .leftJoinAndSelect(`${this.alias}.sns`, MEMBER_SNS)
        .where(`${this.alias}.id IN (:ids)`, {ids: selfEntities.map(({id}) => id)})
        .getRawMany()
        .then(result => result.map(({self, inverse}) => ({self: {id: self}, inverse: {id: inverse}})))
      ,
      getDatas: ({ entityManager: em, selfEntities }) =>
        em.getRepository(MemberSns)
        .createQueryBuilder(MEMBER_SNS)
        .where(`${MEMBER_SNS}.manager IN (:ids)`, {ids: selfEntities.map(({id}) => id)})
        .getMany()
    },
    basic: {
      Entity: MemberBasic, Repository: MemberBasicRepository,
      getBridges: ({entityManager: em, selfEntities}) =>
        em.getRepository(MemberBasic)
        .createQueryBuilder(MEMBER_BASICS)
        .select(`${MEMBER_BASICS}.manager AS self`)
        .addSelect(`${MEMBER_BASICS}.id AS inverse`)
        .where(`${MEMBER_BASICS}.manager IN (:ids)`, {ids: selfEntities.map( ({id}) => id)})
        .getRawMany()
        .then( result => result.map( ({self, inverse}) => ({ self: {id: self}, inverse: {id: inverse}})))
      ,
    },
    // store: {
    //   Entity: Store, Repository: StoreRepository,
    //   getBridges: async ({selfEntities}) =>
    //     selfEntities.map( ({id}) => ({self:{id}, inverse: {id}}))
    // },
    histories: {
      Entity: ManagerHistory, fieldIsMany: true,
      getBridges: ({ entityManager: em, selfEntities }) => 
        em.getRepository(ManagerHistory)
        .createQueryBuilder(MANAGER_HISTORIES)
        .select(`${MANAGER_HISTORIES}.manager AS self`)
        .addSelect(`${MANAGER_HISTORIES}.id AS inverse`)
        .where(`${MANAGER_HISTORIES}.manager IN (:ids)`, {ids: selfEntities.map( ({id}) => id)})
        .getRawMany()
        .then( result => result.map( ({self, inverse}) => ({ self: {id: self}, inverse: {id: inverse}})))
      ,
      getDatas: ({ entityManager: em, selfEntities }) => 
        em.getRepository(ManagerHistory)
        .createQueryBuilder(MANAGER_HISTORIES)
        .where(`${MANAGER_HISTORIES}.manager IN (:ids)`, {ids: selfEntities.map( ({id}) => id)})
        .getMany()
    },
   
  }

  // public readonly setPropertySubscribe: ChainingSetPropertySubscribe<Manager, PathString<Manager>> = {
  //   afterSetProperty: ({entities, data = {}}) => {
  //     const auth = data.auth as User|Manager;
  //     if( auth !== undefined ){
  //       const isRoot = isContainRoles(auth, ['root'] as Array<DEFAULT_ROLE>);
        
  //       entities.forEach( mng => {
  //         const isOwner = isSameAuth(mng, auth);
  //         if( !isRoot && !isOwner ){
  //           delete mng.identity;

  //           if( mng.store ){
  //             const { store } = mng;
  //             const visibleKeys = Object.keys(store).filter( k => k.indexOf(VISIBLE_PREFIX) > -1 )
              
  //             visibleKeys.forEach( k => {
  //               const visible: boolean = store[k];
  //               const targetKey = k.replace(VISIBLE_PREFIX, '')
  //               .replace(/.{1}/, target => target.toLowerCase());

  //               const targetVal = store[targetKey];
  //               if( !visible && targetVal )
  //                 store[targetKey] = UNKNOWN;
                

  //             })
  //           }
  //           delete mng.histories;

  //         }

  //       })
  //     }
  //   }
  // };
  public readonly setPropertySubscriber: Array<SetPropertyEvent<Manager, PathString<Manager>>> = [
    {
      where: ({data}) => data.auth !== undefined,
      before: ({entities}) => {
        entities.forEach( (entity,i) => {
          entities.splice(i, 1, new Proxy(entity, {
            set(obj, prop, val) {
              if( ([ 'store', 'basic' ] as Array<keyof Manager>).includes(prop as any) )
                setReflectProperty(obj, val, ENTITY_CONSTANTS.AUTH)
              obj[prop] = val;
              return true;
            }
          }))
        })
      },
      after: ({entities, data}) => {
        const { auth } = data||{};
        const isRoot = isContainRoles(auth, ['root'] as Array<DEFAULT_ROLE>);
        entities.forEach( entity => {
          const isOwner = isSameAuth(entity, auth);
          if( !isRoot && !isOwner ){
            // entity.identity = undefined;
            entity.identity = hideTextExclude({
              text: entity.identity,
              padChar: "*",
              excludeLength: entity.identity.length - 2
            });
            // if( entity.store ){
            //   const { store } = entity;
            //   const visibleKeys = Object.keys(store).filter( k => k.indexOf(VISIBLE_PREFIX) > -1 )
            //   visibleKeys.forEach( k => {
            //     const visible: boolean = store[k];
            //     const targetKey = k.replace(VISIBLE_PREFIX, '')
            //     .replace(/.{1}/, target => target.toLowerCase());

            //     const targetVal = store[targetKey];
            //     if( !visible && targetVal )
            //       store[targetKey] = UNKNOWN;
                

            //   })
            // }
            // if(entity.basic) {
            //   entity.basic.connectingInfo = undefined;
            // }
          }


        })

      }
    }
  ];

  public readonly saveSubscribe: SaveSubscriber<Manager, PathString<Manager>>

  public searchQuery( {
    uk, identity, nickname, roles, snsUk, snsType, state, name, tel
  }: SearchManagerDto = {}): SelectQueryBuilder<Manager> {

    let query = this.createQueryBuilder(this.alias);

    if( uk )
      query = query.andWhere(`${this.alias}.uk = :uk`, {uk});
    if( identity )
      query = query.andWhere(`${this.alias}.identity = :identity`, {identity: aesEnc(identity)});
    if( nickname )
      query = query.andWhere(`${this.alias}.nickname LIKE :nickname`, {nickname: `${nickname}%`});

    if( roles && roles.length > 0 )
      query = query.leftJoin(`${this.alias}.roles`, `SRC_${ROLES}`)
        .andWhere(`SRC_${ROLES}.key IN (:roles)`, {roles});

    if( snsUk || snsType ){
      query = query.leftJoin(`${this.alias}.sns`, `SRC_${MEMBER_SNS}`)
      if( snsType )
        query = query.andWhere(`SRC_${MEMBER_SNS}.type = :snsType`, {snsType})
      if( snsUk ) 
        query = query.andWhere(`SRC_${MEMBER_SNS}.uk = :snsUk`, {snsUk})
    }

    if( state?.length > 0 ) {
      query = query.andWhere(`${this.alias}.state IN (:state)`, {state});
    }
    
    if(name || tel) {
      query = query.leftJoin(`${this.alias}.basic`, `SRC_${MEMBER_BASICS}`);

    
      if(name) {
        query = query.andWhere(`SRC_${MEMBER_BASICS}.name LIKE :name`, {name: `%${name}%`});
      }
      if(tel) {
        query = query.andWhere(`SRC_${MEMBER_BASICS}.tel LIKE :tel`, {tel: `%${tel}%`})
      }
    }
    
  

    return query;
  }

  public dynamicQuery( countDynamic: CountMemberDto ): SelectQueryBuilder<Manager> {
    let query = this.createQueryBuilder(this.alias);
    
    const reqKeys = countDynamic ? Object.keys(countDynamic) : [];
    if( reqKeys.length === 0 
      || reqKeys.some( rKey => !COUNT_MEMBER_KEYS.some( k => rKey === k ) )
    ){
      query = query.andWhere('1 = 0')
      return query;
    }

    const {
      identity, nickname, role, email, tel
    } = countDynamic;

    if( identity )
      query = query.orWhere(`${this.alias}.identity = :identity`, {identity: aesEnc(identity) });
    
    if( nickname )
      query = query.orWhere(`${this.alias}.nickname = :nickname`, {nickname});
    
    if( role )
      query = query.leftJoinAndSelect(`${this.alias}.roles`, ROLES)
        .orWhere(`${ROLES}.key = :role`, {role})

    if( email || tel ) {
      query = query.leftJoinAndSelect(`${this.alias}.basic`, `${MEMBER_BASICS}`);
      if(email) {
        query = query.orWhere(`${MEMBER_BASICS}.email = :email`, {email});
      }
      if(tel) {
        query = query.orWhere(`${MEMBER_BASICS}.tel = :tel`, {tel});
      }
    }

    return query;


  }

  public emailRoleTelCheckQuery({
    email, role, tel
  }: SearchEmailRoleTelDto = {}): SelectQueryBuilder<Manager> {
    let query = this.createQueryBuilder(this.alias);

    if(role) {
      query = query.leftJoin(`${this.alias}.roles`, `SRC_${ROLES}`)
        .andWhere(`SRC_${ROLES}.key = :role`, {role});
    }

    if(email || tel) {
      query = query.leftJoin(`${this.alias}.basic`, `SRC_${MEMBER_BASICS}`);
      
      if(email) {
        query = query.andWhere(`SRC_${MEMBER_BASICS}.email = :email`, {email});
      }
      if(tel) {
        query = query.andWhere(`SRC_${MEMBER_BASICS}.tel = :tel`, {tel});
      }
    }

    return query;
  }
}