/**
 * js-transform
 * https://github.com/CrossLead/js-transform
 *
 * Copyright (c) 2017 CrossLead
 *
 * @ignore
 */

import * as R from 'ramda';

export interface FieldConfig {
  name: string;
  selector: string|string[];
  mandatory?: boolean;
  config?: Config;
  defValue?: any;
  mapper?: (input: any) => any;
}

export interface Config {
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
   * This is a pure function; the input is not modified.
   */
  transform(input: any): any {
    const process = (out: any, arg: any) => {
      const [lens, field] = arg;
      const data = R.view(lens, input);
      const data1 = field.config ?
            new Transformer(field.config).transform(data) :
            data;
      const data2 = field.defValue && data1 === undefined ? field.defValue : data1;
      const mapper = field.mapper ? field.mapper : R.identity;

      if ( data2 ) {
        out[field.name] = mapper(data2);
      } else {
        if (field.mandatory) {
          throw new Error('Missing mandatory data expected at selector: \'' + field.selector + '\'');
        }
      }
      return out;
    };

    let out = R.reduce(process, {}, this.transforms);
    if (this.config.keepOrig) {
      out.$orig = input;
    }
    return new this.config.valueConst( out );
  }
}

export default {
  Transformer
};
