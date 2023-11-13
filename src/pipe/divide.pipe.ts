import { ArgumentMetadata, PipeTransform } from "@nestjs/common";
import { isBlank } from "src/util/format.util";

export type DividePipProps = {
  separator?: string, 
  ifBlank?: Array<string>
}
class DividePipe implements PipeTransform {
  separator: string;
  ifBlank: Array<string>;
  constructor({separator = ',', ifBlank}: DividePipProps = {}){
    this.separator = separator;
    this.ifBlank = ifBlank;
  }

  transform(value: string, _metadata: ArgumentMetadata):Array<string> {
    if(!value) return  (this.ifBlank !== undefined && isBlank(value)) ? this.ifBlank : [];
    value = value.replace(/\s/, '');
    return value.split(this.separator);
  }

}

export const dividePipe = (divideProps?: DividePipProps) => new DividePipe(divideProps);
