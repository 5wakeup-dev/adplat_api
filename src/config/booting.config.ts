import * as chalk from "chalk";
import * as figlet from 'figlet';
import * as fs from 'fs';


export const envFilePath = process.env.NODE_ENV 
  ? [`.env.${process.env.NODE_ENV}`, '.env']
  : ['.env']
// export const envFilePath = 
//   process.env.NODE_ENV === 'prod'
//     ? ['.env.prod', '.env']
//     : process.env.NODE_ENV === 'debug'
//       ? ['.env.debug', '.env']
//       : ['.env']

export const initDirectories = async () => {
  const ext_storage = process.env.PATH_EXT_STORAGE;
  // const promises: Array<Promise<unknown>> = []
  if(ext_storage && !fs.existsSync(ext_storage))
    fs.mkdirSync(ext_storage)
    
    
} 

export const initPannal = (app: string, subTitle: string) => {
  // console.clear();
  // console.log("\\033[2J");
  // process.stdout.write("\u001b[2J\u001b[0;0H");
  const title = chalk.magenta.bold(
    // figlet.textSync(` initialized server as ${process.env.NODE_ENV}, port as ${parseInt(process.env.PORT, 10)||3000}`)
    // figlet.textSync(`SVC-${process.env.NODE_ENV}`)
    figlet.textSync(app)
  );
  const sub = chalk.green(
    // figlet.textSync(` initialized server as ${process.env.NODE_ENV}, port as ${parseInt(process.env.PORT, 10)||3000}`)
    // figlet.textSync(`Port as ${parseInt(process.env.PORT, 10)||3000}`)
    // `Port as ${parseInt(process.env.PORT, 10)||3000}`
    subTitle
  )
  console.log(title);
  console.log(sub);
}