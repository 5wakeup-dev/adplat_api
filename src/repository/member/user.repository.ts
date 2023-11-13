import { TABLE_ALIAS } from "src/config/typeorm.config";
import { CountMemberDto, COUNT_MEMBER_KEYS, SearchEmailRoleTelDto, SearchUserDto } from "src/entity/member/member.interface";
import { User } from "src/entity/member/user.entity";
import { MemberSns } from "src/entity/member/memberSns.entity";
import { Role } from "src/entity/role/role.entity";
import { getProject } from "src/singleton/project.singleton";
import { deepClone } from "src/util/index.util";
import { aesEnc } from "src/util/secret.util";
import { ChainRelation, ChainRepository, PathString, SaveSubscriber, SetPropertyEvent } from "src/util/typeorm.util";
import { EntityRepository, SelectQueryBuilder } from "typeorm";
import { MemberBasic } from "src/entity/member/memberBasic.entity";
import { isContainRoles, isSameAuth } from "src/util/entity.util";
import { DEFAULT_ROLE } from "src/entity/role/role.interface";
import { UserHistory } from "src/entity/member/userHistory.entity";
import { MemberBasicRepository } from "./basic.repository";
import { hideTextExclude } from "src/util/format.util";


const {
  USERS,
  USER_HISTORIES,
  MEMBER_SNS,
  MEMBER_BASICS,
  ROLES,
} = TABLE_ALIAS;


@EntityRepository(User)
export class UserRepository extends ChainRepository<User> {
  public primaryKeys: Array<keyof User> = ['id'];
  public alias: string = USERS;
  public relationChain: ChainRelation<User> = {
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
        .where(`${MEMBER_SNS}.user IN (:ids)`, {ids: selfEntities.map(({id}) => id)})
        .getMany()
    },
    basic: {
      Entity: MemberBasic, Repository: MemberBasicRepository,
      getBridges: ({entityManager: em, selfEntities}) =>
        em.getRepository(MemberBasic)
        .createQueryBuilder(MEMBER_BASICS)
        .select(`${MEMBER_BASICS}.user AS self`)
        .addSelect(`${MEMBER_BASICS}.id AS inverse`)
        .where(`${MEMBER_BASICS}.user IN (:ids)`, {ids: selfEntities.map( ({id}) => id)})
        .getRawMany()
        .then( result => result.map( ({self, inverse}) => ({ self: {id: self}, inverse: {id: inverse}})))
      ,
      // getDatas: ({entityManager: em, selfEntities}) => 
      //   em.getRepository(MemberBasic)
      //   .createQueryBuilder(MEMBER_BASICS)
      //   .where(`${MEMBER_BASICS}.user IN (:ids)`, {ids: selfEntities.map( ({id}) => id)})
      //   .getMany()
    },
    histories: {
      Entity: UserHistory, fieldIsMany: true,
      getBridges: ({ entityManager: em, selfEntities }) => 
        em.getRepository(UserHistory)
        .createQueryBuilder(USER_HISTORIES)
        .select(`${USER_HISTORIES}.user AS self`)
        .addSelect(`${USER_HISTORIES}.id AS inverse`)
        .where(`${USER_HISTORIES}.user IN (:ids)`, {ids: selfEntities.map( ({id}) => id)})
        .getRawMany()
        .then( result => result.map( ({self, inverse}) => ({ self: {id: self}, inverse: {id: inverse}})))
      ,
      getDatas: ({ entityManager: em, selfEntities }) => 
        em.getRepository(UserHistory)
        .createQueryBuilder(USER_HISTORIES)
        .where(`${USER_HISTORIES}.user IN (:ids)`, {ids: selfEntities.map( ({id}) => id)})
        .getMany()
    },
   
  }

  // public readonly setPropertySubscribe: ChainingSetPropertySubscribe<User, PathString<User>> = {
  //   afterSetProperty: ({entities, data = {}}) => {
  //     const auth = data.auth as User|Manager;
  //     if( auth !== undefined ){
  //       const isRoot = isContainRoles(auth, ['root'] as Array<DEFAULT_ROLE>);
        
  //       entities.forEach( usr => {
  //         const isOwner = isSameAuth(usr, auth);
  //         if( !isRoot && !isOwner ){
  //           delete usr.identity;
  //           delete usr.histories;
  //         }

  //       })
  //     }
  //   }
  // };
  public readonly setPropertySubscriber: Array<SetPropertyEvent<User, PathString<User>>> = [
    {
      where: ({ data }) => data.auth !== undefined,
      after: ({ entities, data }) => {

        const {auth} = data||{},
          isRoot = isContainRoles(auth, ['root'] as Array<DEFAULT_ROLE>);
        entities.forEach( entity => {
          const isOwner = isSameAuth(entity, auth);
          if( !isRoot && !isOwner ){
            // entity.identity = undefined;
            entity.identity = hideTextExclude({
              text: entity.identity,
              padChar: "*",
              excludeLength: entity.identity.length - 2
            });
            entity.histories = undefined;
            if(entity.basic) {
              entity.basic.connectingInfo = undefined;
            }
          }
        })

      }
    }
  ];

  public readonly saveSubscribe: SaveSubscriber<User, PathString<User>> 

  public searchQuery( {
    uk, identity, nickname, roles, snsUk, snsType, state, name, tel
  }: SearchUserDto = {}): SelectQueryBuilder<User> {
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

    if( name || tel) {
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

  public dynamicQuery( countDynamic: CountMemberDto ): SelectQueryBuilder<User> {
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
      query = query.orWhere(`${this.alias}.identity = :identity`, {identity: aesEnc(identity)});
    
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
  }: SearchEmailRoleTelDto = {}): SelectQueryBuilder<User> {
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