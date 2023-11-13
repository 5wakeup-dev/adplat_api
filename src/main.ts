import { INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { Connection } from 'typeorm';
import { AppModule } from './app.module';
import { initPannal } from './config/booting.config';
import { mysqlSession } from './config/session.config';
import { Project } from './singleton/project.singleton';
import { SubModule } from './sub.module';
import { setSingleton } from './util/reflect.util';
import * as express from 'express';

async function bootstrap() {
  const mainPort = parseInt(process.env.PORT, 10)||3000;

  // console.log('[!!!!]', 'INIT')
  if( process.env.APP === undefined ){
    const app = await NestFactory.create(AppModule);
    // console.log('[!!!!]', 'INIT?')
    setCors(app);
    setAppFilter(app);
    const connection = app.get(Connection);
    
    await app.listen(mainPort, async () => {
      const prj = new Project(connection);
      setSingleton( prj );
      await prj.init();
      initPannal(`Main-${process.env.NODE_ENV}`, `Port As ${mainPort}`);
    });
  } else if( process.env.APP === 'sub' ) {
    const subPort = mainPort+1;
    const subApp = await NestFactory.create(SubModule);
    setCors(subApp);
    setAppFilter(subApp);
    await subApp.listen(subPort, async () => {
      initPannal(`Sub-${process.env.NODE_ENV}`, `Port As ${subPort}`);
    });
  }
}
bootstrap()
// AppClusterService.clusterize(bootstrap)

const setAppFilter = (app: INestApplication) => {
  app.use( mysqlSession() )
  app.use(express.json({limit: '5.0mb'}));
}

const setCors = ( app: INestApplication ) => {
  app.enableCors({
    credentials: true,
    origin: 
      process.env.NODE_ENV === 'prod'
      ?[/https?:\/\/(.*\.)?wemov\.co\.kr/]
        // ? [/https?:\/\/(.*\.)?sharpmusic\.co\.kr/,'https://lessonhaja.com','https://www.lessonhaja.com']
        // ? [/https?:\/\/(.*\.)?sharpmusic\.co\.kr/,/https?:\/\/(.*\.)?lessonhaja\.com/]
        : [/https?:\/\/(localhost.*|(127|192).*|.*\.domain\.com)/]
      ,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'check-password']
  })
}