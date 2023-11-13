import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { envFilePath } from 'src/config/booting.config'
import { ErrorEntity } from "./entity/error/error.entity";
import { allExceptionFilter } from "./filter/all-exception.filter";
import { basicExceptionFilter } from "./filter/basic-exception.filter";
import { catchMustBeEntityErrorFilter, catchQueryFiledErrorFilter } from "./filter/typeorm-exception.filter";
import { loggingInterceptorProvider } from "./interceptor/logging.interceptor";
import { AttachmentsModule } from "./module/attachment.module";
import { BasicTypeormSubModule } from "./module/basicTypeormSub.module";



@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath,
      isGlobal: true
    }),
    BasicTypeormSubModule,
    // BasicTypeormModule,
    TypeOrmModule.forFeature([ErrorEntity]),

    AttachmentsModule

  ],
  providers: [
    loggingInterceptorProvider,
    /** Error Filter START */
    allExceptionFilter,
    basicExceptionFilter,
    catchMustBeEntityErrorFilter,
    catchQueryFiledErrorFilter,
    /** Error Filter E N D */
  ],
  // controllers: [
  // ]

})

export class SubModule {}