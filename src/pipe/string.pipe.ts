import { ArgumentMetadata, PipeTransform } from "@nestjs/common";
import { initStringTypeGuard, stringTypeGuardOption } from "src/util/index.util";

// type StringPipeOption = Partial<{
//   default: string
// }>
class StringPipe <T extends string> implements PipeTransform {
  limit: Array<T|RegExp>;
  option: stringTypeGuardOption<T>;
  constructor(limit: Array<T|RegExp>, option?: stringTypeGuardOption<T>){
    this.limit = limit;
    this.option = option || {};
  }

  transform(value: string, _metadata: ArgumentMetadata): string {
    return initStringTypeGuard(value, this.limit, this.option);
  }

}

export const stringPipe = <T extends string>(limit: Array<T|RegExp>, option?: stringTypeGuardOption<T>) => new StringPipe(limit, option);
