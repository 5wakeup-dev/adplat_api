import { ArgumentMetadata, PipeTransform } from "@nestjs/common";
import { isUndeclared } from "src/util/format.util";
import { entriesTypeGuard } from "src/util/index.util";

// type Predict<K, V, O> = (key: K, val: V, obj: O) => any
type Predict<T> = { [K in keyof T]: (key: K, val: T[K], obj: T) => any }

class SelectPipe <T extends object> implements PipeTransform {
  constructor(
    private validation: Partial< Predict<T> >
  ){}
  // constructor(private fitObject: ObjectType<T>){}

  transform(value: any, _metadata: ArgumentMetadata): any {
    // const cloneVal = clone(value);
    entriesTypeGuard(value)
    .forEach(([key, val]) => {
      const predict = this.validation[key];
      if(predict){
        const result = predict(key, val, value);
        if( !isUndeclared(result) )
          value[key] = result;
        else if(result === null)
          delete value[key];
      }else if(predict === null)
        delete value[key];
    })

    return value;
  }
}

export const selectPipe = <T>( validation: Partial< Predict<T> > ) => new SelectPipe(validation);