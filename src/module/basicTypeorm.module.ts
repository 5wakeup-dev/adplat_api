import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { envFilePath } from "src/config/booting.config";
import { connectionOptions } from "src/config/typeorm.config";

@Module({
  imports: [
    ConfigModule.forRoot({ envFilePath }),
    TypeOrmModule.forRoot( connectionOptions() ),
    // TypeOrmModule.forFeature([Error])
  ],
})
export class BasicTypeormModule {
}