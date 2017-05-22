/**
 * js-transform
 * https://github.com/CrossLead/js-transform
 *
 * Copyright (c) 2017 CrossLead
 *
 * @ignore
 */

import * as R from 'ramda';
import { Left, Right, Either } from 'monads.either';

export interface FieldConfig {
  name: string;
  selector: string|string[];
  mandatory?: boolean;
  config?: Config;
  defValue?: any;
  mapper?: (input: any) => any;
}

export interface Config {
  // This is any constructor function that can take a plain javaascript object.
  valueConst: any;
  fields: FieldConfig[];
  keepOrig?: boolean;
}

export class Transformer {

  config: Config;
  transforms: any;

  constructor(config: Config) {
    this.setConfig(config);
  }

  setConfig(config: Config) {
    this.config = config;
    const selectorOf = (fc: FieldConfig) => {
      const selector = fc.selector;
      return Array.isArray(selector) ? selector : [selector];
    };
    const dataFields = this.config.fields;
    const lenses = R.map(R.compose(R.lensPath, selectorOf), dataFields);
    this.transforms = R.zip(lenses, dataFields);
  }

  /**
   * Transform the given data by applying it to the configuration
   * that is currently stored on this object.
   * Return value is expressed via an Either:
   * This will either be a list of errors (the Left side of the Either),
   * or an class instance obtained by invoking the constructor given
   * in the configuration on the computed output object.
   * (See the monads.either package for info on how to work with Either objects)
   *
   * This is a pure function; the input is not modified.
   */
  transform(input: any): any {
    let errors = [];
    const nestedTransform = (config: Config, data: any): any => {
      if (config) {
        const ret = new Transformer(config).transform(data);
        if (ret.isLeft) {
          errors.push(ret.merge());
        } else {
          return ret.get();
        }
      } else {
        return data;
      }
    };

    const process = (out: any, arg: any) => {
      const [lens, field] = arg;
      const data = R.view(lens, input);
      const data1 = nestedTransform(field.config, data);
      const data2 = field.defValue && data1 === undefined ? field.defValue : data1;
      const mapper = field.mapper ? field.mapper : R.identity;

      if ( data2 ) {
        out[field.name] = mapper(data2);
      } else {
        if (field.mandatory) {
          errors.push(new Error('Missing mandatory data expected at selector \'' + field.selector + '\' for constructor \'' + this.config.valueConst + '\'' ));
        }
      }
      return out;
    };

    let out = R.reduce(process, {}, this.transforms);
    if (this.config.keepOrig) {
      out.$orig = input;
    }

    return errors.length ? new Left(errors) : new Right(new this.config.valueConst( out ));
  }
}

export default {
  Transformer
};
