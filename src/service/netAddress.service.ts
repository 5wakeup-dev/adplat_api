import { Injectable } from "@nestjs/common";
import { TABLE_ALIAS } from "src/config/typeorm.config";
import { ArtworkMove, ArtworkView } from "src/entity/artwork/artwork.bridge";
import { Artwork } from "src/entity/artwork/artwork.entity";
import { NetAddress } from "src/entity/comm/netAddress.entity";
import { ConsultingView } from "src/entity/consulting/consulting.bridge";
import { Consulting } from "src/entity/consulting/consulting.entity";
import { ConsultingSave } from "src/entity/consulting/consultingSave.entity";
import { Product, ProductMove, ProductView } from "src/entity/product/product.entity";
import { ArtworkRepository } from "src/repository/artwork/artwork.repository";
import { ConsultingRepository } from "src/repository/consulting/consulting.repository";
import { ProductRepository } from "src/repository/product/product.repository";
import { getRepositories } from "src/util/typeorm.util";
import { Connection } from "typeorm";

const {
  
} = TABLE_ALIAS;

@Injectable()
export class NetAddressesService {

  constructor(
    private connection: Connection
  ){}

  async getOrCreateNetAddress(ip: string): Promise<NetAddress> {
    if( !ip )
      return undefined;

    const repos = getRepositories({
      netAddress: NetAddress
    }, this.connection.manager);
    
    const netAddress = await repos.netAddress
      .findOne({where: {ip}});

    return netAddress ? netAddress : repos.netAddress.save({ip})
  }

  async addViewAndCount(artwork: Artwork, ip: string): Promise<ArtworkView> {
    if( !artwork || !ip )
      return;
    const repos = getRepositories({
      view: ArtworkView,
      artwork: ArtworkRepository
    }, this.connection.manager)
    const netAddress = await this.getOrCreateNetAddress(ip);
    if( !netAddress )
      return;
    const orgView = artwork.view;
    const artworkView = await repos.view.save({ artwork, netAddress })
    artwork.view ++;

    repos.view.createQueryBuilder('VEW')
    .select('VEW.netAddress')
    // .addSelect('COUNT(*) AS viewCount')
    .where('VEW.artwork = :artworkid', {artworkid: artwork.id})
    .groupBy('VEW.netAddress')
    .getRawMany()
    .then( async arr => {
      const count = arr.length;
      if( orgView !== count )
        await repos.artwork.update( artwork.id, {
          view: count,
          upt_date: () => 'upt_date'
        })
    });
    
    
    
    return artworkView;
  }

  async addMoveAndCount(artwork: Artwork, ip: string): Promise<number> {
    if( !artwork || !ip )
      return;
    const repos = getRepositories({
      move: ArtworkMove,
      artwork: ArtworkRepository
    }, this.connection.manager)
    // const netAddress = await this.getOrCreateNetAddress(ip);
    // if( !netAddress )
    //   return;
    const orgMove = artwork.move;
    // const artworkMove = await repos.move.save({ artwork, netAddress })
    artwork.move ++;
    await repos.artwork.update( artwork.id, {
      move: orgMove+1,
      upt_date: () => 'upt_date'
    })
    // repos.move.createQueryBuilder('VEW')
    // .select('VEW.netAddress')
    // .where('VEW.artwork = :artworkid', {artworkid: artwork.id})
    // .groupBy('VEW.netAddress')
    // .getRawMany()
    // .then( async arr => {
    //   const count = arr.length;
    //   if( orgMove !== count )
    //     await repos.artwork.update( artwork.id, {
    //       move: count,
    //       upt_date: () => 'upt_date'
    //     })
    // });
    
    
    
    return orgMove+1;
  }


  async addConsultingViewAndCount(consulting: Consulting, ip: string): Promise<ConsultingView> {
    if(!consulting || !ip) {
      return;
    }

    const repos = getRepositories({
      view: ConsultingView,
      consulting: ConsultingRepository
    }, this.connection.manager)

    const netAddress = await this.getOrCreateNetAddress(ip);
    if(!netAddress) {
      return;
    }
    const orgView = consulting.view;
    const consultingView = await repos.view.save({consulting, netAddress});
    // consulting.view++;
    repos.view.createQueryBuilder('CST_VEW')
      .select('CST_VEW.netAddress')
      .where('CST_VEW.consulting = :consultingId', {consultingId: consulting.id})
      .groupBy('CST_VEW.netAddress')
      .getRawMany()
      .then( async arr => {
        const count = arr.length;
        if( orgView !== count ){
          consulting.view=count;
          await repos.consulting.update( consulting.id, {
            view: count,
            upt_date: () => 'upt_date'
          })
        }
      });
    
    return consultingView;
  }

  async saveConsultingWriterAdd(consulting: Consulting, ip: string): Promise<ConsultingSave> {
    if(!consulting || !ip) {
      return;
    }

    const repos = getRepositories({
      save: ConsultingSave,
    }, this.connection.manager)

    const netAddress = await this.getOrCreateNetAddress(ip);
    if(!netAddress) {
      return;
    }
    
    

    return await repos.save.save({consulting,netAddress})
  }





  
  async productAddViewAndCount(product: Product, ip: string): Promise<ArtworkView> {
    if( !product || !ip )
      return;
    const repos = getRepositories({
      view: ProductView,
      product: ProductRepository
    }, this.connection.manager)
    const netAddress = await this.getOrCreateNetAddress(ip);
    if( !netAddress )
      return;
    const orgView = product.view;
    const productView = await repos.view.save({ product, netAddress })
    repos.view.createQueryBuilder('VEW')
    .select('VEW.netAddress')
    // .addSelect('COUNT(*) AS viewCount')
    .where('VEW.product = :productId', {productId: product.id})
    .groupBy('VEW.netAddress')
    .getRawMany()
    .then( async arr => {
      const count = arr.length;
      if( orgView !== count ){
        product.view ++;
        await repos.product.update( product.id, {
          view: count,
          uptDate: () => 'upt_date'
        })
      }
    });
    
    
    
    return productView;
  }

  async productAddMoveAndCount(product: Product, ip: string): Promise<number> {
    if( !product || !ip )
      return;
    const repos = getRepositories({
      move: ProductMove,
      product: ProductRepository
    }, this.connection.manager)
    // const netAddress = await this.getOrCreateNetAddress(ip);
    // if( !netAddress )
    //   return;
    const orgMove =typeof(product.move)==="string"?parseInt(product.move): product.move;
    // const artworkMove = await repos.move.save({ artwork, netAddress })
    // product.move ++;
    await repos.product.update( product.id, {
      move: orgMove+1,
      uptDate: () => 'upt_date'
    })

    
    
    return orgMove+1;
  }
}