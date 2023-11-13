import { Controller } from "@nestjs/common";
import { Connection } from "typeorm";

@Controller('/test')
export class TestController {
  constructor(
    private connection: Connection,
  ) { }


  // @Post('')
  // async testAny (
  // ): Promise<any> {
  //   new Promise((resolve, reject) => {
  //     exec('explorer', (error, stdout, stderr) => {
  //       if (error) {
  //         console.error(`exec error: ${error}`);
  //         return reject(error);
  //       }
  //       resolve(stdout? stdout : stderr);
  //     });
  //   });
  // }
}
