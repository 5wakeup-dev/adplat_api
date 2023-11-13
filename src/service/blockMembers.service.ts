import { Injectable } from "@nestjs/common";
import { TABLE_ALIAS } from "src/config/typeorm.config";
import { BlockMember, BlockMemberDto } from "src/entity/blockMember/blockMember.entity";
import { Manager } from "src/entity/member/manager.entity";
import { User } from "src/entity/member/user.entity";
import { BASIC_EXCEPTION } from "src/exception/basic.exception";
import { BlockMemberRepository } from "src/repository/blockMember/blockMember.repository";
import { SearchPage } from "src/util/entity/listPage";
import { getRepositories, TransactionHelper, TransactionHelperParam } from "src/util/typeorm.util";
import { Connection } from "typeorm";
import { ListPageRes } from "src/util/entity/listPage";
import PageInfo from "src/util/entity/PageInfo";

const {
  BLOCK_MEMBERS, MANAGERS, USERS
} = TABLE_ALIAS;

@Injectable()
export class BlockMembersService {
  constructor(
    private connection: Connection
  ) {}

  @TransactionHelper({ paramIndex: 2 })
  async createBlockMember(
    dto: BlockMemberDto, auth: Manager | User,
    transaction: TransactionHelperParam = {connection: this.connection, entityManager: this.connection.manager}
  ): Promise<BlockMember> {
    if(!dto || (!dto.blockManager && !dto.blockUser)) {
      throw BASIC_EXCEPTION.NOT_ALLOW_EMPTY_ON_PROCESS;
    } else if(!auth) {
      throw BASIC_EXCEPTION.NOT_FOUND_AUTH;
    }

    dto[auth.type.toLowerCase()] = auth;
    if(!dto.blockManager) {
      delete dto.blockManager;
    }
    if(!dto.blockUser) {
      delete dto.blockUser;
    }

    const repos = getRepositories({
      blockMember: BlockMemberRepository
    }, transaction.entityManager);

    let record = undefined;
    if(dto.manager) {
      if(dto.blockManager) {
        record = await repos.blockMember.searchQuery()
          .leftJoin(`${BLOCK_MEMBERS}.manager`, `${MANAGERS}`)
          .leftJoin(`${BLOCK_MEMBERS}.blockManager`, `BLK_${MANAGERS}`)
          .where(`BLK_${MANAGERS}.uk = :blockUk`, {blockUk: dto.blockManager.uk})
          .andWhere(`${MANAGERS}.uk = :uk`, {uk: dto.manager.uk})
          .getOne();
      } else {
        record = await repos.blockMember.searchQuery()
          .leftJoin(`${BLOCK_MEMBERS}.manager`, `${MANAGERS}`)
          .leftJoin(`${BLOCK_MEMBERS}.blockUser`, `BLK_${USERS}`)
          .where(`BLK_${USERS}.uk = :blockUk`, {blockUk: dto.blockUser.uk})
          .andWhere(`${MANAGERS}.uk = :uk`, {uk: dto.manager.uk})
          .getOne();
      }
    } else {
      if(dto.blockManager) {
        record = await repos.blockMember.searchQuery()
          .leftJoin(`${BLOCK_MEMBERS}.user`, `${USERS}`)
          .leftJoin(`${BLOCK_MEMBERS}.blockManager`, `BLK_${MANAGERS}`)
          .where(`BLK_${MANAGERS}.uk = :blockUk`, {blockUk: dto.blockManager.uk})
          .andWhere(`${USERS}.uk = :uk`, {uk: dto.user.uk})
          .getOne();
      } else {
        record = await repos.blockMember.searchQuery()
          .leftJoin(`${BLOCK_MEMBERS}.user`, `${USERS}`)
          .leftJoin(`${BLOCK_MEMBERS}.blockUser`, `BLK_${USERS}`)
          .where(`BLK_${USERS}.uk = :blockUk`, {blockUk: dto.blockUser.uk})
          .andWhere(`${USERS}.uk = :uk`, {uk: dto.user.uk})
          .getOne();
      }
    }

    if(record) {
      throw BASIC_EXCEPTION.ALREADY_BEAN_COMPLETED;
    }

    return repos.blockMember.save(dto);
  }

  @TransactionHelper({ paramIndex: 2 })
  async removeBlockMember(
    target: BlockMember, auth: Manager | User,
    transaction: TransactionHelperParam = {connection: this.connection, entityManager: this.connection.manager}
  ): Promise<string> {
    if(!target) {
      throw BASIC_EXCEPTION.NOT_ALLOW_EMPTY_ON_PROCESS;
    } else if(!auth) {
      throw BASIC_EXCEPTION.NOT_FOUND_AUTH;
    }

    if(auth.type === 'Manager') {
      if(!target.manager || (target.manager.uk !== auth.uk)) {
        throw BASIC_EXCEPTION.NOT_ALLOW_AUTH;
      }
    } else {
      if(!target.user || (target.user.uk !== auth.uk)) {
        throw BASIC_EXCEPTION.NOT_ALLOW_AUTH;
      }
    }

    const repos = getRepositories({
      blockMember: BlockMemberRepository
    }, transaction.entityManager);

    const deletedId = target.id;

    return repos.blockMember.remove(target)
      .then(() => deletedId);
  }

  @TransactionHelper({ paramIndex: 2 })
  async readBlockMembers(
    pageData: SearchPage, auth: Manager | User,
    transaction: TransactionHelperParam = {connection: this.connection, entityManager: this.connection.manager}
  ): Promise<ListPageRes<BlockMember>> {
    if(!auth) {
      throw BASIC_EXCEPTION.NOT_FOUND_AUTH;
    }

    const repos = getRepositories({
      blockMember: BlockMemberRepository
    }, transaction.entityManager);

    let searchQuery = repos.blockMember.searchQuery();
    if(auth.type === 'Manager') {
      searchQuery = searchQuery.leftJoin(`${BLOCK_MEMBERS}.manager`, `${MANAGERS}`)
        .where(`${MANAGERS}.uk = :uk`, {uk: auth.uk});
    } else {
      searchQuery = searchQuery.leftJoin(`${BLOCK_MEMBERS}.user`, `${USERS}`)
        .where(`${USERS}.uk = :uk`, {uk: auth.uk});
    }

    const totalRow = await searchQuery.getCount();
    if(totalRow === 0) {
      throw BASIC_EXCEPTION.EMPTY_CONTENT;
    }

    const page: PageInfo = new PageInfo({...pageData, totalRow});

    const list: Array<BlockMember> = await searchQuery
      .skip(page.startRow)
      .take(page.rowPerPage)
      .getMany();

    return {page, list};
  }
}