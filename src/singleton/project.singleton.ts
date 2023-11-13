import { Role } from "src/entity/role/role.entity";
import { DEFAULT_ROLE } from "src/entity/role/role.interface";
import { ManagerRepository } from "src/repository/member/manager.repository";
import { getSingleton } from "src/util/reflect.util";
import { getRepositories, TransactionHelper, TransactionHelperParam } from "src/util/typeorm.util";
import { Connection } from "typeorm";


// const { } = TABLE_ALIAS;

export class Project {

  public EXIST_ROOT: boolean = false;
  public ROLES: Array<Role> = []

  constructor(
    private connection: Connection
  ){
  }

  @TransactionHelper({ paramIndex: 0 })
  async init(
    transaction: TransactionHelperParam = { connection: this.connection, entityManager: this.connection.manager}
  ) {
    await Promise.all([
      this.initExistRoot(transaction),
      this.initRoles(transaction)
    ])
  }

  @TransactionHelper({ paramIndex: 0 })
  async initExistRoot(
    {entityManager}: TransactionHelperParam = { connection: this.connection, entityManager: this.connection.manager}
  ) {
    const repos = getRepositories({
      manager: ManagerRepository
    }, entityManager);
  
    const countRoot = await repos.manager.dynamicQuery({
      role: 'root' as DEFAULT_ROLE
    }).getCount()

    this.EXIST_ROOT = countRoot > 0;
  }

  @TransactionHelper({ paramIndex: 0 })
  async initRoles(
    {entityManager}: TransactionHelperParam = { connection: this.connection, entityManager: this.connection.manager}
  ) {
    const repos = getRepositories({
      role: Role
    }, entityManager)
    const roles = await repos.role.find();
    this.ROLES = roles;
  }
  
}


export const getProject = (): Project => getSingleton(Project)
