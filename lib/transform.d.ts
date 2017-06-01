export declare type Either<L, R> = Left<L> | Right<R>;
export interface Left<T> {
    kind: 'left';
    value: T;
}
export interface Right<T> {
    kind: 'right';
    value: T;
}
export declare function mkLeft<T>(val: T): Left<T>;
export declare function mkRight<T>(val: T): Right<T>;
export declare function isLeft<L, R>(either: Either<L, R>): boolean;
export declare function isRight<L, R>(either: Either<L, R>): boolean;
export declare function left<L, R>(either: Either<L, R>): L | R;
export declare function right<L, R>(either: Either<L, R>): L | R;
export interface FieldConfig {
    name: string;
    selector?: string | string[];
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
export declare type ErrorList = Error[];
export declare class Transformer {
    config: Config;
    transforms: any;
    constructor(config: Config);
    setConfig(config: Config): void;
    transform(input: any): Either<ErrorList, any>;
}
declare var _default: {
    Transformer: typeof Transformer;
};
export default _default;
