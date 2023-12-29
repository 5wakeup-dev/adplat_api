import { Injectable } from "@nestjs/common";
import * as dayjs from "dayjs";
import { Message } from "firebase-admin/messaging";
import { TABLE_ALIAS, UK_PREFIX } from "src/config/typeorm.config";
import { BlockMember } from "src/entity/blockMember/blockMember.entity";
import { Consulting, ConsultingDto } from "src/entity/consulting/consulting.entity";
import { SearchAroundConsultingDto, SearchConsultingBranchDto, SearchConsultingDto } from "src/entity/consulting/consulting.interface";
import { ConsultingHierarchical, ConsultingHierarchicalDto } from "src/entity/consulting/consultingHierarchical.entity";
import { Manager } from "src/entity/member/manager.entity";
import { Member } from "src/entity/member/member.interface";
import { User } from "src/entity/member/user.entity";
import { Role } from "src/entity/role/role.entity";
import { DEFAULT_ROLE } from "src/entity/role/role.interface";
import { BASIC_EXCEPTION } from "src/exception/basic.exception";
import { BlockMemberRepository } from "src/repository/blockMember/blockMember.repository";
import { ConsultingRepository } from "src/repository/consulting/consulting.repository";
import { MemberDeviceTokenRepository } from "src/repository/member/deviceToken.repository";
import { ManagerRepository } from "src/repository/member/manager.repository";
import { UserRepository } from "src/repository/member/user.repository";
import { Around } from "src/type/index.type";
import { isContainRoles, isSameAuth } from "src/util/entity.util";
import { ListPageRes } from "src/util/entity/listPage";
import PageInfo from "src/util/entity/PageInfo";
import { createUuid, equals, HttpMethod, HTTP_METHOD, isNumberForm, UNKNOWN, YYYYMMDDHHmmss } from "src/util/format.util";
import { createBranchAndRefresh, findDeepBranch, findDirectBranch } from "src/util/hierarchical.util";
import { deepClone, splitToObject } from "src/util/index.util";
import { getRepositories, TransactionHelper, TransactionHelperParam } from "src/util/typeorm.util";
import { Connection, EntityManager } from "typeorm";
import { MenusService, MENUS_FUNCTION } from "./menus.service";

const {
  MANAGERS, USERS,
  CONSULTINGS, CONSULTING_HIERARCHICAL,
  BLOCK_MEMBERS
} = TABLE_ALIAS;

type CreateHierarchicalParam = {
  entityManager: EntityManager;
  self: Consulting;
}
type CreateHierarchical = (param: CreateHierarchicalParam) => Promise<ConsultingHierarchicalDto>;

@Injectable()
export class ConsultingsService {
  constructor(
    private connection: Connection,
    private menusService: MenusService,
  ) { }

  async allowNickname(nickname: string): Promise<boolean> {
    if (!nickname) {
      return false;
    }

    const repos = getRepositories({
      manager: ManagerRepository,
      user: UserRepository
    }, this.connection.manager)

    const notAllowManager: Promise<boolean> = repos.manager.searchQuery()
      .where(`${MANAGERS}.nickname = :nickname`, { nickname })
      .getCount()
      .then(length => length > 0)
      .catch(() => true);
    const notAllowUser: Promise<boolean> = repos.user.searchQuery()
      .where(`${USERS}.nickname = :nickname`, { nickname })
      .getCount()
      .then(length => length > 0)
      .catch(() => true);

    return !(await notAllowManager || await notAllowUser);
  }

  @TransactionHelper({ paramIndex: 2 })
  private async createConsulting(
    dto: ConsultingDto, createHierarchical: CreateHierarchical,
    { entityManager }: TransactionHelperParam = { connection: this.connection, entityManager: this.connection.manager }
  ): Promise<Consulting> {
    if (!dto) {
      throw BASIC_EXCEPTION.NOT_ALLOW_EMPTY_ON_PROCESS;
    }

    const repos = getRepositories({
      consulting: ConsultingRepository
    }, entityManager);

    const created = await repos.consulting.save(dto);
    dto.hierarchical = await createHierarchical({ self: created, entityManager });

    return created;
  }

  @TransactionHelper({ paramIndex: 2 })
  async createRootConsulting(
    dto: ConsultingDto, auth: Manager | User,
    transaction: TransactionHelperParam = { connection: this.connection, entityManager: this.connection.manager }
  ): Promise<Consulting> {
    if (!dto?.menu) {
      throw BASIC_EXCEPTION.NOT_ALLOW_EMPTY_ON_PROCESS;
    } else if (!auth && !(await this.allowNickname(dto.writer))) {
      throw BASIC_EXCEPTION.DUPLICATE_NICKNAME;
    }

    const postMethodRoles: Array<Role> = dto.menu.methods?.find(({ key: mtdKey }) => mtdKey === 'POST' as HttpMethod)?.roles;
    if (
      postMethodRoles && postMethodRoles.length > 0
      && !isContainRoles({ roles: postMethodRoles }, auth.roles)
    ) {
      throw BASIC_EXCEPTION.NOT_ALLOW_AUTH;
    }

    dto.uk = createUuid({ prefix: `${UK_PREFIX.CONSULTING}-${dayjs().format(YYYYMMDDHHmmss)}`, length: 24 })
    dto.writer = (auth ? auth.nickname : dto.writer) || '';
    if (auth) {
      if (auth.type === 'Manager') {
        dto.manager = auth;
      } else {
        dto.user = auth;
      }
    }

    return this.createConsulting(
      dto,
      async ({ self, entityManager: em }) => {
        const hierarchicalRepo = em.getRepository(ConsultingHierarchical);
        const hierarchicalDto: ConsultingHierarchicalDto = {
          groupId: self.id,
          id: self.id,
          groupOrd: 1,
          groupDepth: 0,
          groupParent: null
        }

        const rst = await hierarchicalRepo.save(hierarchicalDto);
        rst.id = self.id;
        return rst;
      },
      transaction
    )
  }

  @TransactionHelper({ paramIndex: 4 })
  async createBranchConsulting(
    dto: ConsultingDto, target: Consulting, auth: Manager | User, checkPassword: string,
    transaction: TransactionHelperParam = { connection: this.connection, entityManager: this.connection.manager }
  ): Promise<Consulting> {
    if (!target || !dto) {
      throw BASIC_EXCEPTION.NOT_ALLOW_EMPTY_ON_PROCESS;
    } else if (!auth && !(await this.allowNickname(dto.writer))) {
      throw BASIC_EXCEPTION.DUPLICATE_NICKNAME;
    }

    dto.uk = createUuid({ prefix: `${UK_PREFIX.CONSULTING}-${dayjs().format(YYYYMMDDHHmmss)}`, length: 24 })
    dto.writer = (auth ? auth.nickname : dto.writer) || '';
    if (auth) {
      if (auth.type === 'Manager') {
        dto.manager = auth;
      } else {
        dto.user = auth;
      }
    }
    dto.menu = target.menu;

    return this.createConsulting(
      dto,
      async ({ entityManager: em, self }) => {
        const repos = getRepositories({
          consulting: ConsultingRepository,
          hierarchical: ConsultingHierarchical
        }, em);
        const allGroupMenu = await repos.consulting.findGroup(target);
        const allGroup = allGroupMenu.map(({ hierarchical }) => hierarchical);
        const cloneAllGroup = deepClone(allGroup);
        const hierarchicalDto: ConsultingHierarchicalDto = createBranchAndRefresh(allGroup, target.hierarchical);
        hierarchicalDto.id = self.id;
        const refresh = allGroup.filter(h => {
          const find = cloneAllGroup.find(({ id }) => id === h.id);
          return !find || !equals(find, h)
        })

        return repos.hierarchical.save(refresh)
          .then(() => hierarchicalDto)
      }, transaction
    )
  }

  @TransactionHelper({ paramIndex: 4 })
  async patchConsulting(
    origin: Consulting, dto: ConsultingDto, auth: Manager | User, checkPassword: string,
    { entityManager }: TransactionHelperParam = { connection: this.connection, entityManager: this.connection.manager }
  ): Promise<Consulting> {
    if (!origin || !dto) {
      throw BASIC_EXCEPTION.NOT_ALLOW_EMPTY_ON_PROCESS;
    }

    const isRoot = isContainRoles(auth, ['root'] as Array<DEFAULT_ROLE>);

    if (!isRoot) {
      if (!origin.manager && !origin.user) { //비회원이 쓴 게시물의 경우
        if (origin.password) { //게시물에 비밀번호가 설정되어 있을 경우 
          if (!checkPassword || (checkPassword !== origin.password)) { //확인 비밀번호가 없거나 게시물의 비밀번화 확인 비밀번호가 불일치 할 때
            throw BASIC_EXCEPTION.NOT_ALLOW_AUTH;
          }
        }
      } else { //회원이 쓴 게시물의 경우
        if (origin.manager) { //manager가 쓴 게시물
          if (!isSameAuth(origin.manager, auth)) { //게시물 작성자와 auth가 동일하지 않을 경우
            throw BASIC_EXCEPTION.NOT_ALLOW_AUTH;
          }
        } else { //user가 쓴 게시물
          if (!isSameAuth(origin.user, auth)) { //게시물 작성자와 auth가 동일하지 않을 경우
            throw BASIC_EXCEPTION.NOT_ALLOW_AUTH;
          }
        }
      }
    }

    const repos = getRepositories({
      consulting: ConsultingRepository
    }, entityManager);

    const cloneOrigin = deepClone(origin);
    return repos.consulting.save(dto)
      .then(entity =>
        Object.assign(
          cloneOrigin,
          entity
        )
      )
  }

  async getConsulting(
    consultingUk: string, auth: Manager | User, checkPassword?: string
  ): Promise<Consulting> {
    if (!consultingUk) {
      throw BASIC_EXCEPTION.EMPTY_CONTENT;
    }

    const repos = getRepositories({
      consulting: ConsultingRepository
    }, this.connection.manager);

    const consulting = await repos.consulting.getOne(
      ['menu.methods', 'menu.functions', 'manager', 'user', 'hierarchical'],
      ctx => ctx.searchQuery({ uk: consultingUk })
    )



    const root = (await repos.consulting.findGroup(consulting)
      .then(cst =>
        repos.consulting.setProperty([
          'menu.methods', 'manager', 'user'
        ], cst)
          .then(_ => cst)
      )).find(c => c.hierarchical.groupId === c.id)

    if (!consulting || !root) {
      throw BASIC_EXCEPTION.EMPTY_CONTENT;
    }

    const { groupParent } = consulting.hierarchical;

    if (
      (groupParent
        ? !this.getBranchAllow(root, consulting, auth, checkPassword)
        : !this.getConsultingAllow(consulting, auth, checkPassword)
      )
    ) {
      throw BASIC_EXCEPTION.NOT_ALLOW_AUTH;
    }


    const { manager, user, menu, ...other } = consulting;

    return { ...other };
  }



  async getCheckConsulting(
    consultingUk: string, checkPassword?: string, auth?: User | Manager
  ): Promise<boolean> {
    if (!consultingUk) {
      throw BASIC_EXCEPTION.EMPTY_CONTENT;
    }

    const repos = getRepositories({
      consulting: ConsultingRepository
    }, this.connection.manager);

    const consulting = await repos.consulting.getOne(["user"], ctx => ctx.searchQuery({ uk: consultingUk }));



    if (consulting.user && auth) {
      return consulting.user.uk === auth.uk
    }
    return consulting.password === checkPassword
  }

  getConsultingAllow(
    consulting: Consulting, member: Member, checkPassword?: string
  ): boolean {
    const menu = consulting.menu
    const isRoot = isContainRoles(member, ['root'] as Array<DEFAULT_ROLE>);
    if (!consulting.isHidden) return true
    return isRoot || this.isOwner(consulting, member) ||
      this.menusService.allowMenu(member, menu, HTTP_METHOD.GET)
      && (
        (consulting.password === checkPassword)
        || this.menusService.allowFunction(member, menu, MENUS_FUNCTION.GROUP_GET, { require: true })

      )

  }
  getBranchAllow(
    root: Consulting, branch: Consulting,
    member: Member, checkPassword?: string
  ): boolean {
    // if(this.getConsulting(root, member, checkPassword))
    //   return true;
    return this.getConsultingAllow(root, member, checkPassword)
      || this.getConsultingAllow(branch, member, checkPassword)
  }

  @TransactionHelper({ paramIndex: 2 })
  async getListPage(
    search: SearchConsultingDto, auth: Manager | User,
    transaction: TransactionHelperParam = { connection: this.connection, entityManager: this.connection.manager }
  ): Promise<ListPageRes<Consulting>> {
    const repos = getRepositories({
      consulting: ConsultingRepository,
      blockMember: BlockMemberRepository
    }, transaction.entityManager);

    if (auth && search.blockMember) {
      let blockMembers: Array<BlockMember> = undefined;

      if (auth.type === 'Manager') {
        blockMembers = await repos.blockMember.getMany(
          ['blockManager', 'blockUser', 'manager'],
          ctx => ctx.searchQuery()
            .leftJoin(`${BLOCK_MEMBERS}.manager`, `${MANAGERS}`)
            .where(`${MANAGERS}.uk = :managerUk`, { managerUk: auth.uk })
        );
      } else {
        blockMembers = await repos.blockMember.getMany(
          ['blockManager', 'blockUser', 'user'],
          ctx => ctx.searchQuery()
            .leftJoin(`${BLOCK_MEMBERS}.user`, `${USERS}`)
            .where(`${USERS}.uk = :userUk`, { userUk: auth.uk })
        );
      }

      if (blockMembers && blockMembers.length > 0) {
        const blockManagers = blockMembers.filter(blk => !!blk.blockManager)
          .map(rst => rst.blockManager.uk);
        const blockUsers = blockMembers.filter(blk => !!blk.blockUser)
          .map(rst => rst.blockUser.uk);

        let blockQuery = repos.consulting.searchQuery();
        if (blockManagers && blockManagers.length > 0) {
          blockQuery = blockQuery
            .leftJoin(`${CONSULTINGS}.manager`, `${MANAGERS}`)
            .orWhere(`${MANAGERS}.uk IN (:blockManagers)`, { blockManagers });
        }
        if (blockUsers && blockUsers.length > 0) {
          blockQuery = blockQuery
            .leftJoin(`${CONSULTINGS}.user`, `${USERS}`)
            .orWhere(`${USERS}.uk IN (:blockUsers)`, { blockUsers });
        }

        search.blockConsultings = await blockQuery
          .getMany()
          .then(cst => cst.map(cs => cs.uk));

        if (search.blockConsultings.length === 0) {
          delete search.blockConsultings;
        }
      }
    }

    const { curPage, rowPerPage, pagePerBlock } = search;

    const { column, order } = splitToObject(
      search.orderBy,
      ['column', 'order'],
      {
        limit: [['group', 'view', 'reactionPositive'], ['DESC', 'ASC']],
        def: { column: 'group', order: 'DESC' }
      }
    )

    const totalRow = await repos.consulting
      .searchQuery(search)
      .getCount();
    if (totalRow === 0) {
      throw BASIC_EXCEPTION.EMPTY_CONTENT;
    }

    const page: PageInfo = new PageInfo({ curPage, rowPerPage, totalRow, pagePerBlock });

    let queryBuilder = repos.consulting.searchQuery(search)
      .leftJoinAndSelect(`${CONSULTINGS}.hierarchical`, `${CONSULTING_HIERARCHICAL}`)

    if (column === 'view') {
      queryBuilder = queryBuilder.orderBy(`${CONSULTINGS}.view`, order as 'DESC' | 'ASC')
        .addOrderBy(`${CONSULTING_HIERARCHICAL}.groupId`, 'DESC')
        .addOrderBy(`${CONSULTING_HIERARCHICAL}.groupOrd`, 'ASC')
    } else if (column === 'reactionPositive') {
      queryBuilder = queryBuilder.orderBy(`${CONSULTINGS}.reactionPositive`, order as 'DESC' | 'ASC')
        .addOrderBy(`${CONSULTING_HIERARCHICAL}.groupId`, 'DESC')
        .addOrderBy(`${CONSULTING_HIERARCHICAL}.groupOrd`, 'ASC')
    } else {
      queryBuilder = queryBuilder.orderBy(`${CONSULTING_HIERARCHICAL}.groupId`, order as 'DESC' | 'ASC')
        .addOrderBy(`${CONSULTING_HIERARCHICAL}.groupOrd`, 'ASC')
    }

    const list = await queryBuilder
      .skip(page.startRow)
      .take(page.rowPerPage)
      .getMany()
      .then(cst =>
        repos.consulting.setProperty([
          'manager', 'user'
        ], cst)
          .then(_ => cst)
      )
    const isRoot = isContainRoles(auth, ['root'] as Array<DEFAULT_ROLE>);

    list.forEach(consulting => {
      if (!consulting.manager && !consulting.user) { //비회원이 쓴 게시물의 경우
        if (!isRoot && consulting.isHidden) { //게시물에 비밀번호가 설정되어 있을 경우 
          consulting.content = '비밀글입니다.';
          consulting.title = "비밀글입니다."
        }
      }
      else { //회원이 쓴 게시물의 경우
        if (consulting.manager) { //manager가 쓴 게시물
          if (!isSameAuth(consulting.manager, auth)) { //게시물 작성자와 auth가 동일하지 않을 경우
            consulting.title = '비밀글입니다.';
            consulting.content = '비밀글입니다.';
          }
        } else if(consulting.user){ //user가 쓴 게시물
          if (!isSameAuth(consulting.user, auth)) { //게시물 작성자와 auth가 동일하지 않을 경우
            consulting.title = '비밀글입니다.';
            consulting.content = '비밀글입니다.';
          }
        }
      }
    })

    return { page, list };
  }

  async getListPageAsBranch(
    search: SearchConsultingBranchDto, auth: Manager | User
  ): Promise<ListPageRes<Consulting>> {
    if (!search || !search.uk || !search.branchType) {
      throw BASIC_EXCEPTION.NOT_ALLOW_EMPTY_ON_PROCESS;
    }

    const repos = getRepositories({
      consulting: ConsultingRepository
    }, this.connection.manager);

    const { uk, branchType, depth, curPage, rowPerPage } = search;

    const target: Consulting = await repos.consulting.getOne(
      ['hierarchical', 'user', 'manager', 'menu.methods'],
      ctx => ctx.searchQuery({ uk })
    );
    if (!target) {
      throw BASIC_EXCEPTION.EMPTY_CONTENT;
    }

    const allGroupConsultings = await repos.consulting.findGroup(target);
    if (!(allGroupConsultings.length > 1)) {
      throw BASIC_EXCEPTION.EMPTY_CONTENT;
    }

    const allGroup = allGroupConsultings.map(({ hierarchical }) => hierarchical);
    let branch: Array<ConsultingHierarchical> = branchType === 'deep'
      ? findDeepBranch(allGroup, target.hierarchical)
      : findDirectBranch(allGroup, target.hierarchical);

    if (!branch || branch.length === 0) {
      throw BASIC_EXCEPTION.EMPTY_CONTENT;
    }

    if (isNumberForm(depth)) {
      branch = branch.filter(({ groupDepth }) => groupDepth === search.depth);
    }

    if (branch.length === 0) {
      throw BASIC_EXCEPTION.EMPTY_CONTENT;
    }
    const allow = this.getConsultingAllow(target, auth, null)

    if (curPage) {

      const page: PageInfo = new PageInfo({ curPage, rowPerPage, totalRow: branch.length });
      const list = branch.slice(page.startRow, page.endRow)
        .map(({ id: hrcId }) => allGroupConsultings.find(({ id: cstId }) => cstId === hrcId))
      await repos.consulting.setProperty(['manager', 'user'], list);
      list.forEach(consulting => {
        consulting.content = allow ? consulting.content : "비밀글입니다."
      })
      return { page, list };
    } else {
      const list = branch.map(
        ({ id: hrcId }) =>
          allGroupConsultings.find(({ id: cstId }) => cstId === hrcId)
      )
      await repos.consulting.setProperty(['manager', 'user'], list);
      list.forEach(consulting => {
        consulting.content = allow ? consulting.content : "비밀글입니다."
      })
      return {
        page: null,
        list
      }
    }
  }

  async getAroundConsulting(
    search: SearchAroundConsultingDto,
    consulting: Consulting
  ): Promise<Around<Consulting>> {
    if (!search || !search.id || !search.type) {
      throw BASIC_EXCEPTION.NOT_ALLOW_BODY;
    } else if (!consulting) {
      throw BASIC_EXCEPTION.NOT_ALLOW_EMPTY_ON_PROCESS;
    }

    const repos = getRepositories({
      consulting: ConsultingRepository
    }, this.connection.manager);

    const { groupId, groupOrd } = consulting.hierarchical;
    const { length: nextLength } = await repos.consulting.searchQuery()
      .leftJoin(`${CONSULTINGS}.hierarchical`, `${CONSULTING_HIERARCHICAL}`)
      .where(`${CONSULTING_HIERARCHICAL}.groupId = :groupId AND ${CONSULTING_HIERARCHICAL}.groupOrd > :groupOrd`, { groupId, groupOrd })
      .getRawMany();

    const [prev, next] = await Promise.all([
      repos.consulting.aroundPrevQuery(consulting, search)
        .take(1)
        .getOne(),
      repos.consulting.aroundNextQuery(consulting, search, nextLength)
        .take(1)
        .getOne()
    ])

    if (!prev && !next) {
      throw BASIC_EXCEPTION.EMPTY_CONTENT;
    }

    return { prev: prev, next: next };
  }

  @TransactionHelper({ paramIndex: 3 })
  async deleteConsulting(
    consulting: Consulting, auth: Manager | User, checkPassword?: string,
    { entityManager }: TransactionHelperParam = { connection: this.connection, entityManager: this.connection.manager }
  ): Promise<Array<Consulting>> {
    if (!consulting?.hierarchical) {
      throw BASIC_EXCEPTION.NOT_ALLOW_EMPTY_ON_PROCESS;
    }

    const repos = getRepositories({
      consulting: ConsultingRepository,
      hierarchical: ConsultingHierarchical
    }, entityManager);

    const isRoot = isContainRoles(auth, ['root'] as Array<DEFAULT_ROLE>);

    if (!isRoot) {
      if (!consulting.manager && !consulting.user) { //비회원이 쓴 게시물의 경우
        if (consulting.password) { //게시물에 비밀번호가 설정되어 있을 경우 
          if (!checkPassword || (checkPassword !== consulting.password)) { //확인 비밀번호가 없거나 게시물의 비밀번화 확인 비밀번호가 불일치 할 때
            throw BASIC_EXCEPTION.NOT_ALLOW_AUTH;
          }
        }
      } else { //회원이 쓴 게시물의 경우
        if (consulting.manager) { //manager가 쓴 게시물
          if (!isSameAuth(consulting.manager, auth)) { //게시물 작성자와 auth가 동일하지 않을 경우
            throw BASIC_EXCEPTION.NOT_ALLOW_AUTH;
          }
        } else { //user가 쓴 게시물
          if (!isSameAuth(consulting.user, auth)) { //게시물 작성자와 auth가 동일하지 않을 경우
            throw BASIC_EXCEPTION.NOT_ALLOW_AUTH;
          }
        }
      }
    }

    const allGroups: Array<Consulting> = await repos.consulting
      .findGroup(consulting)

    const {
      deepBranch, elseConsultings
    } = allGroups.reduce(
      (result, c) => {
        if (c.id === consulting.id || c.hierarchical.groupParent === consulting.id) {
          result.deepBranch.push(c)
        } else {
          result.elseConsultings.push(c)
        }
        return result;
      }, { deepBranch: [] as Array<Consulting>, elseConsultings: [] as Array<Consulting> });

    const cloneDeepBranch = deepClone(deepBranch);

    return repos.consulting.remove(deepBranch)
      .then(async () => {
        elseConsultings.forEach(({ hierarchical: h }, i) => h.groupOrd = i + 1);
        await repos.hierarchical.save(
          elseConsultings.map(({ hierarchical }) => hierarchical)
        );
        return cloneDeepBranch;
      })
  }



  @TransactionHelper({ paramIndex: 3 })
  async deleteUniqueConsulting(
    managerUk: string, menuUk: string,
    { entityManager }: TransactionHelperParam = { connection: this.connection, entityManager: this.connection.manager }
  ): Promise<number> {

    const repos = getRepositories({
      consulting: ConsultingRepository,
      hierarchical: ConsultingHierarchical
    }, entityManager);

    const menu = await this.menusService.getMenu(menuUk)
    const target = await repos.consulting.searchQuery({ managerUk, menuIds: [menu.id] }).getOne()

    if (target) repos.consulting.remove(target)
    return 0
  }

  isOwner(
    consulting: Consulting, member: Member
  ): boolean {

    if (!consulting || (!consulting.manager && !consulting.user) || !member)
      return false;
    const { manager, user } = consulting;
    if (
      (manager && member.type !== 'Manager')
      || (user && member.type !== 'User')
    )
      return false;
    else
      return (!!manager && manager.id === member.id) || (!!user && user.id === member.id);

  }

  isMember(
    consulting: Consulting
  ): boolean {
    const { manager, user } = consulting || {}
    if (!!manager || !!user)
      return true;

    return false;
  }

}