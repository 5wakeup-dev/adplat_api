import { Injectable } from "@nestjs/common";
import { TABLE_ALIAS } from "src/config/typeorm.config";
import { Menu } from "src/entity/menu/menu.entity";
import { MenuRepository } from "src/repository/menu/menu.repository";
import { isUndeclared } from "src/util/format.util";
import { deepClone } from "src/util/index.util";
import { getRepositories } from "src/util/typeorm.util";
import { Connection, EntitySubscriberInterface, EventSubscriber, UpdateEvent } from "typeorm";

const {
  MENUS, 
  MENU_HIERARCHICAL
} = TABLE_ALIAS;

@Injectable()
@EventSubscriber()
export class MenuSubscriber implements EntitySubscriberInterface<Menu> {
  constructor(
    connection: Connection
  ){
    connection.subscribers.push(this);
  }
  listenTo(): any {
    return Menu;
  }

  async afterUpdate(event: UpdateEvent<Menu>): Promise<any> {
    const { manager, entity, databaseEntity } = event;

    const repos = getRepositories({
      menu: MenuRepository
    }, manager)

    const {
      key
    } = entity;
    // databaseEntity.key
    const isVarianceKey = !isUndeclared(key) && databaseEntity.key !== key;
    const promises: Array<Promise<unknown>> = []
    // console.log('[!!!]', isVarianceKey, key, databaseEntity)
    if( isVarianceKey ){
      const { absoluteKey: beforeAbsoluteKey } = databaseEntity;
      const deepGroups: Array<Menu> = await repos
        .menu.getMany(
          undefined,
          ctx => ctx.searchQuery({
            absoluteKey: databaseEntity.absoluteKey,
            branchType: 'deep', self: true
          }).leftJoin(`${MENUS}.hierarchical`, MENU_HIERARCHICAL)
          .orderBy(`${MENU_HIERARCHICAL}.groupId`, 'DESC')
          .addOrderBy(`${MENU_HIERARCHICAL}.groupOrd`, 'ASC')
        );
      const updateAbsoluteKey = beforeAbsoluteKey.replace(new RegExp(`${databaseEntity.key}$`), key);
      // console.log('[!!!!]', beforeAbsoluteKey, updateAbsoluteKey);
      promises.push(
        updateAbsoluteKeys(repos, deepGroups, beforeAbsoluteKey, updateAbsoluteKey)
        .then( () => entity.absoluteKey = updateAbsoluteKey )
      )
    }

    await Promise.all(promises);
  }
}

const updateAbsoluteKeys = async (
  { menu }: { menu: MenuRepository },
  deepGroups: Array<Menu>,
  beforePrefix: string, updatePrefix: string
): Promise<Array<Menu>> => {
  const cloneDeepGroups = deepClone(deepGroups);
  const keyRegexp = new RegExp(`^(${beforePrefix}|${beforePrefix}\..+)`)
  cloneDeepGroups.forEach( m => 
    m.absoluteKey = m.absoluteKey.replace(keyRegexp, updatePrefix)
  )

  return menu.save(
    cloneDeepGroups.map( ({id, absoluteKey}) => ({id, absoluteKey}))
  ).then( () => cloneDeepGroups)
}