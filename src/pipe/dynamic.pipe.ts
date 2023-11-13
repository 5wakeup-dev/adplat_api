import { ArgumentMetadata, PipeTransform } from "@nestjs/common";

type DynamicPipePredict<T, R = T> = (param: {
  value: T;
  metadata: ArgumentMetadata;
}) => R

class DynamicPipe<T, R = T> implements PipeTransform {
  predict: DynamicPipePredict<T, R>
  constructor(predict: DynamicPipePredict<T, R>){
    this.predict = predict
  }

  transform(value: T, metadata: ArgumentMetadata): R {
    return this.predict({value, metadata})
  }

}

export const dynamicPipe = <T, R = T>(predict?: DynamicPipePredict<T, R>) => new DynamicPipe(predict);
