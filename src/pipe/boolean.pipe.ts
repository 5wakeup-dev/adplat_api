import { ArgumentMetadata, PipeTransform } from "@nestjs/common";
import { isUndeclared } from "src/util/format.util";
import { initBoolean, propertiesForEach } from "src/util/index.util";

class BooleanPipeFromObject implements PipeTransform {
  constructor(private required?: Array<string> ){}
  transform(value: any, _metadata: ArgumentMetadata) {

    const modify = (key: string|number, val:any, _wrapper:Object): any => {
      if( !isUndeclared(val) 
        && this.required && this.required.length > 0 
        && this.required.some(k => k === key)
      ){
        // if(isNumberForm(val)){
        //   return parseInt(val.toString(), 10) > 0;
        // }else if(isString(val)) {
        //   switch(val.toLowerCase()){
        //     case "true":
        //     case "on":
        //     case "yes":
        //       return true;
        //     default: 
        //       return false;
        // }
        // }else
        //   return !!val;
        return initBoolean(val);
      } 
    }

    propertiesForEach(value, modify);
    return value;
  }
  
}

export const booleanPipeFromObject = <T>(required: Array<keyof T>) => new BooleanPipeFromObject(required as Array<string>)