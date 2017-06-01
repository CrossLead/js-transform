/**
 * js-transform
 * https://github.com/CrossLead/js-transform
 *
 * Copyright (c) 2017 CrossLead
 *
 * @ignore
 */

import * as R from 'ramda';

/**
 * This class encapsulates either an object of type L (the 'Left'), or
 * an object of type R (the 'Right'), but not both at the same time,
 * and never neither of the two.
 *
 * Obviously, this type belongs in some type-level util library,
 * but until that lib exists, this code is the only place it's used.
 */
export type Either<L, R> = Left<L> | Right<R>;

export interface Left<T> {
  kind: 'left';
  value: T;
}

export interface Right<T> {
  kind: 'right';
  value: T;
}

function mkEither<T>(kind: string, value: T) {
  return { kind, value };
}

export function mkLeft<T>(val: T): Left<T> {
  return <Left<T>>mkEither('left', val);
}

export function mkRight<T>(val: T): Right<T> {
  return <Right<T>>mkEither('right', val);
}

export function isLeft<L, R>(either: Either<L, R>) {
  return either.kind === 'left';
}

export function isRight<L, R>(either: Either<L, R>) {
  return either.kind === 'right';
}

export function left<L, R>(either: Either<L, R>) {
  if (!isLeft(either)) {
    throw new Error('Attempt to read Left from Right');
  }
  return either.value;
}

export function right<L, R>(either: Either<L, R>) {
  if (!isRight(either)) {
    throw new Error('Attempt to read Left from Right');
  }
  return either.value;
}

export interface FieldConfig {
  name: string;
  selector?: string|string[];
  mandatory?: boolean;
  config?: Config;
  defValue?: any;
  mapper?: (x: any) => any;
  wrapper?: new (x: any) => any;
}

export interface Config {
  wrapper?: new (x: object) => any;
  fields: FieldConfig[];
  keepOrig?: boolean;
}

export type ErrorList = Error[];

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
      if (selector === undefined) {
        return [fc.name];
      }
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
   * or a newly generated object containing the transformed data
   * (the Right side of the Either).
   *
   * This is a pure function; the input is not modified.
   */
  transform(input: any): Either<ErrorList, any> {
    let errors = [];

    const nestedTransform = (config: Config, data: any, input: any): any => {
      if (config === undefined) {
        return data;
      }

      const data0 = data === undefined ? input : data;
      const data1 = Array.isArray(data0) ? data0 : [data0];
      const transformer = new Transformer(config);
      const rets = R.map( (item: any) => {
        const ret = transformer.transform(item);
        if (isLeft(ret)) {
          errors = R.concat(errors, left(ret));
          return null;
        }
        return right(ret);
      })(data1);
      return rets.length === 1 ? rets[0] : rets;
    };

    const wrap = (f: new (x: any) => any, data: any) => { return new f(data); };

    const process = (out: object, arg: any) => {
      const [lens, field] = arg;
      const data0 = R.view(lens, input);
      const data1 = nestedTransform(field.config, data0, input);
      const data2 = field.defValue !== undefined && data1 === undefined ? field.defValue : data1;
      const mapper = field.mapper ? field.mapper : R.identity;
      const wrapper = field.wrapper ? R.curry(wrap)(field.wrapper) : R.identity;

      if (data2 !== undefined) {
        out[field.name] = R.compose(wrapper, mapper)(data2);
      } else {
        if (field.mandatory) {
          errors.push(new Error('Missing mandatory data expected at selector \'' + field.selector + '\'' + (this.config.wrapper ? 'for constructor \'' + this.config.wrapper + '\'' : '')));
        }
      }
      return out;
    };

    let out = R.reduce(process, {}, this.transforms);
    if (this.config.keepOrig) {
      out.$orig = input;
    }
    const ret = this.config.wrapper ? new this.config.wrapper(out) : out;
    return errors.length ? mkLeft(errors) : mkRight(ret);
  }
}

export default {
  Transformer
};
