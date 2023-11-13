import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { envFilePath } from "src/config/booting.config";
import { connectionOptionsAsSub } from "src/config/typeorm.config";

@Module({
  imports: [
    ConfigModule.forRoot({ envFilePath }),
    TypeOrmModule.forRoot( connectionOptionsAsSub() )
    // TypeOrmModule.forRootAsync({
    //   useFactory: () => connectionOptionsAsSub(),
    //   connectionFactory: async option => createConnection(option)
    // }),
    // TypeOrmModule.forFeature([Error])
  ],
})
export class BasicTypeormSubModule {
}