import { RequestHandler } from 'express'
import * as ExpressSession from 'express-session';
import * as FileSession from 'session-file-store';
import * as MysqlSession from 'express-mysql-session';

export const sessionOptions: ExpressSession.SessionOptions = {
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: true,
  // cookie: process.env.NODE_ENV === 'dev'
  //   ? undefined
  //   : { domain: '.sharpmusic.co.kr' }
  cookie: process.env.NODE_ENV === 'dev'
    ? undefined
    : {
      maxAge: 365 * 24 * 60 * 60 * 1000, // 7 days ( w day * x hour * y minute * z second * 1000<millisecond>)
      domain: '.t-moa.com'
    }
}
// export const mysqlSession = (session?: typeof session_ ):RequestHandler => {
export const mysqlSession = ():RequestHandler => {
  const options: MysqlSession.Options = {
    host: process.env.MYSQL_HOST,
    port: parseInt(process.env.MYSQL_PORT, 10) || 3306,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
  };
  // const sess = session || session_;
  const mysqlStore = MysqlSession( ExpressSession );
  return ExpressSession({
    ...sessionOptions,
    store: new mysqlStore(options)
  })
}

export const fileSession = ():RequestHandler => {
  const options: FileSession.Options = {
    retries: 2,
    // path
  }
  const fileStore = FileSession(ExpressSession);
  return ExpressSession({
    ...sessionOptions,
    store: new fileStore(options)
  })
}