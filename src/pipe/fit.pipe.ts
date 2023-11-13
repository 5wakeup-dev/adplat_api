import { ArgumentMetadata, PipeTransform } from "@nestjs/common";
import { otherDelete } from "src/util/index.util";
// import {Static, mat} from 'runtypes'
// import { ObjectType } from "src/util/utils";

class FitPipe <T> implements PipeTransform {
  constructor(private keys: Array<keyof T>){}
  // constructor(private fitObject: ObjectType<T>){}

  transform(value: any, _metadata: ArgumentMetadata): any {
    if( !value ) return;
    
    return otherDelete(value, this.keys);
  }
}

export const fitPipe = <T>(keys: Array<keyof T>) => new FitPipe(keys)