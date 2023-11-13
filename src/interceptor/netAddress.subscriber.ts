import { Injectable } from "@nestjs/common";
import { NetAddress } from "src/entity/comm/netAddress.entity";
import { Connection, EntitySubscriberInterface, EventSubscriber,  LoadEvent } from "typeorm";


@Injectable()
@EventSubscriber()
export class NetAddressSubscriber implements EntitySubscriberInterface<NetAddress> {
  constructor(
    connection: Connection
  ){
    connection.subscribers.push(this);
  }

  listenTo(): any {
    return NetAddress;
  }

  afterLoad(entity: NetAddress, _event?: LoadEvent<NetAddress>): void | Promise<any> {
    const {ip}=entity
   if(ip){
     const replaceIp=ip.replace(/[^0-9.]/g,"")
     const ipParts = replaceIp.split('.');
     if(ipParts.length>=2) entity.ip=ipParts.slice(0,2).join(".")

    }
  }
}